import {
  DEFAULT_BLOCKSCRIPT_OPTIONS,
  GLYPH_ROWS,
  type RenderBlockscriptOptions,
} from "./blockscript";

// 0x5296ef8b8fb4168b57a09813622f7bc8198a9456b57886e47e1129475ef88d4a
type Rgb = { r: number; g: number; b: number };

export type RenderBlockscriptSvgOptions = Omit<
  RenderBlockscriptOptions,
  "palette" | "outputFormat"
> & {
  fontUrl?: string | null;
  imageUrl?: string;
  text?: string;
};

export type RenderBlockscriptSvgResult = {
  svg: string;
  mimeType: "image/svg+xml";
  sourceWidth: number;
  sourceHeight: number;
  gridWidth: number;
  gridHeight: number;
  outputWidth: number;
  outputHeight: number;
};

function parseHexColor(value: string): Rgb {
  const clean = String(value).trim().replace(/^#/, "");
  const expanded = /^[0-9a-fA-F]{3}$/.test(clean)
    ? clean
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
    : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`Invalid hex color: ${value}`);
  }
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function hex({ r, g, b }: Rgb) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function resolveInput(input: Uint8Array | ArrayBuffer) {
  return input instanceof ArrayBuffer
    ? Buffer.from(input)
    : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
}

function glyphText(input: Buffer, length: number, text?: string) {
  const source = text || `data:image/gif;base64,${input.toString("base64")}`;
  const chars = Object.keys(GLYPH_ROWS);
  let result = "";
  for (let index = 0; index < length; index += 1) {
    const char = source[index % source.length] ?? "?";
    result += GLYPH_ROWS[char] ? char : (chars[index % chars.length] ?? "?");
  }
  return result;
}

export async function renderBlockscriptSvg(
  input: Uint8Array | ArrayBuffer,
  options: RenderBlockscriptSvgOptions = {},
): Promise<RenderBlockscriptSvgResult> {
  const merged = { ...DEFAULT_BLOCKSCRIPT_OPTIONS, ...options };
  const background =
    typeof merged.background === "string"
      ? parseHexColor(merged.background)
      : merged.background;
  const inputBuffer = resolveInput(input);

  const gridWidth =
    merged.gridWidth ?? Math.max(1, Math.round(merged.size / merged.cellWidth));
  const gridHeight =
    merged.gridHeight ??
    Math.max(1, Math.round(merged.size / merged.cellHeight));
  const outputWidth = gridWidth * merged.cellWidth;
  const outputHeight = gridHeight * merged.cellHeight;
  const text = glyphText(inputBuffer, gridWidth * gridHeight, merged.text);

  const rows: string[] = [];
  for (let y = 0; y < gridHeight; y += 1) {
    rows.push(
      `<text x="0" y="${y * merged.cellHeight}" textLength="${outputWidth}" lengthAdjust="spacingAndGlyphs">${xmlEscape(
        text.slice(y * gridWidth, (y + 1) * gridWidth),
      )}</text>`,
    );
  }

  const fontUrl = merged.fontUrl ? xmlEscape(merged.fontUrl) : null;
  const imageUrl = xmlEscape(merged.imageUrl ?? "");
  const backgroundRect = `<rect width="100%" height="100%" fill="${hex(background)}"/>`;
  const shapeMask = merged.heart
    ? `<path fill="white" d="M ${outputWidth / 2} ${outputHeight * 0.96} C ${outputWidth * 0.04} ${outputHeight * 0.62}, ${-outputWidth * 0.08} ${outputHeight * 0.22}, ${outputWidth * 0.2} ${outputHeight * 0.06} C ${outputWidth * 0.36} ${-outputHeight * 0.04}, ${outputWidth / 2} ${outputHeight * 0.12}, ${outputWidth / 2} ${outputHeight * 0.3} C ${outputWidth / 2} ${outputHeight * 0.12}, ${outputWidth * 0.64} ${-outputHeight * 0.04}, ${outputWidth * 0.8} ${outputHeight * 0.06} C ${outputWidth * 1.08} ${outputHeight * 0.22}, ${outputWidth * 0.96} ${outputHeight * 0.62}, ${outputWidth / 2} ${outputHeight * 0.96} Z"/>`
    : merged.circle
      ? `<circle cx="${outputWidth / 2}" cy="${outputHeight / 2}" r="${Math.min(outputWidth, outputHeight) / 2}" fill="white"/>`
      : `<rect width="100%" height="100%" fill="white"/>`;
  const image = imageUrl
    ? `<image href="${imageUrl}" width="${outputWidth}" height="${outputHeight}" preserveAspectRatio="xMidYMid slice" mask="url(#shape-mask)"/>`
    : "";
  const fontFace = fontUrl
    ? `@font-face{font-family:HighBlockscript;src:url('${fontUrl}') format('woff2')}`
    : "";
  const fontFamily = fontUrl ? "HighBlockscript,monospace" : "monospace";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${outputWidth} ${outputHeight}"><style>${fontFace}text{font-family:${fontFamily};font-size:${merged.cellHeight}px;dominant-baseline:hanging;text-anchor:start;white-space:pre}</style><defs><mask id="glyph-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${outputWidth}" height="${outputHeight}"><rect width="100%" height="100%" fill="black"/><g fill="white">${rows.join("")}</g></mask><mask id="shape-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${outputWidth}" height="${outputHeight}"><rect width="100%" height="100%" fill="black"/>${shapeMask}</mask></defs>${backgroundRect}<g mask="url(#glyph-mask)">${image}</g></svg>`;

  return {
    svg,
    mimeType: "image/svg+xml",
    sourceWidth: gridWidth,
    sourceHeight: gridHeight,
    gridWidth,
    gridHeight,
    outputWidth,
    outputHeight,
  };
}
