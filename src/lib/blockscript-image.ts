import {
  encodeHbs as encodeHbsEnvelope,
  HBS_METADATA_TRAITS_KEY,
  type HbsPayload,
} from "@tunnckocore/hbs";
import sharp from "sharp";
import { HIGHSCRIPT } from "@/lib/glyphs-highscript";
import { LOWSCRIPT } from "@/lib/glyphs-lowscript";
import { camelCaseObjectKeys, imageCrc32, PNG_SIGNATURE } from "@/lib/utils";

export const DEFAULT_OPTIONS = {
  cell: 8,
  scale: 1,
  size: 1,
  gap: 1,
  background: "#000",
  transparentGlyph: "#fff",
  alphaThreshold: 12,
  textMode: "highscript",
} as const;

type HbsAttribute =
  | {
      trait_type: string;
      value: string | number;
    }
  | {
      trait_type: string;
      trait_value: string | number;
    }
  | {
      traitType: string;
      traitValue: string | number;
    };

function getAttributeKey(attribute: HbsAttribute) {
  if ("trait_type" in attribute) {
    return attribute.trait_type;
  }

  return attribute.traitType;
}

function getAttributeValue(attribute: HbsAttribute) {
  if ("value" in attribute) {
    return attribute.value;
  }

  if ("trait_value" in attribute) {
    return attribute.trait_value;
  }

  return attribute.traitValue;
}

function attributesToHbsPayload(attributes: readonly HbsAttribute[]) {
  const payload: HbsPayload = {};

  for (const attribute of attributes) {
    payload[getAttributeKey(attribute)] = getAttributeValue(attribute);
  }

  return payload;
}

function encodeHbs(payload: HbsPayload) {
  return encodeHbsEnvelope(
    Object.fromEntries(
      camelCaseObjectKeys(payload as Record<string, string | number>),
    ),
  );
}

type WidenDefaultOptions<T> = {
  -readonly [Key in keyof T]: T[Key] extends number
    ? number
    : T[Key] extends string
      ? string
      : T[Key];
};

export type BlockscriptImageOptions = Partial<
  WidenDefaultOptions<typeof DEFAULT_OPTIONS>
> & {
  text?: string;
  textMode?: "highscript" | "lowscript" | "monospace";
  traits?: HbsPayload;
  attributes?: HbsAttribute[];
  outputFormat?: "png" | "gif";
};

export type BlockscriptImageResult = {
  image: Buffer;
  mimeType: "image/png" | "image/gif";
  sourceWidth: number;
  sourceHeight: number;
  gridWidth: number;
  gridHeight: number;
  outputWidth: number;
  outputHeight: number;
};

type Rgb = { r: number; g: number; b: number };
type InputFormat = "png" | "apng" | "jpeg" | "gif" | "svg";

function parseHexColor(value: string): Rgb {
  const clean = value.replace(/^#/, "");
  const parsed = Number.parseInt(clean, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blendOver(background: Rgb, foreground: Rgb, alpha: number): Rgb {
  if (alpha >= 255) {
    return foreground;
  }
  if (alpha <= 0) {
    return background;
  }

  return {
    r: clampByte((foreground.r * alpha + background.r * (255 - alpha)) / 255),
    g: clampByte((foreground.g * alpha + background.g * (255 - alpha)) / 255),
    b: clampByte((foreground.b * alpha + background.b * (255 - alpha)) / 255),
  };
}

function pngHasChunk(bytes: Uint8Array, chunkName: string) {
  const needle = new TextEncoder().encode(chunkName);

  for (let index = 8; index <= bytes.length - 8; index += 1) {
    if (
      bytes[index] === needle[0] &&
      bytes[index + 1] === needle[1] &&
      bytes[index + 2] === needle[2] &&
      bytes[index + 3] === needle[3]
    ) {
      return true;
    }
  }

  return false;
}

function looksLikeSvg(bytes: Uint8Array) {
  const text = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, Math.min(bytes.length, 1024)))
    .trimStart()
    .toLowerCase();

  return (
    text.startsWith("<svg") ||
    (text.startsWith("<?xml") && text.includes("<svg"))
  );
}

function looksLikePng(bytes: Uint8Array) {
  return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function looksLikeGif(bytes: Uint8Array) {
  return (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  );
}

function looksLikeJpeg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8;
}

export function detectInputFormat(
  input: Uint8Array | ArrayBuffer,
): InputFormat | null {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  if (looksLikeSvg(bytes)) {
    return "svg";
  }
  if (looksLikePng(bytes)) {
    return pngHasChunk(bytes, "acTL") ? "apng" : "png";
  }
  if (looksLikeGif(bytes)) {
    return "gif";
  }
  if (looksLikeJpeg(bytes)) {
    return "jpeg";
  }

  return null;
}

function glyphMapForMode(textMode: BlockscriptImageOptions["textMode"]) {
  return textMode === "lowscript" ? LOWSCRIPT : HIGHSCRIPT;
}

function glyphFor(
  glyphs: Readonly<Record<string, readonly string[]>>,
  text: string,
  index: number,
) {
  const char = text[index % text.length] ?? " ";

  return glyphs[char] ?? glyphs[char.toLowerCase()] ?? glyphs[" "];
}

function mimeTypeForFormat(format: InputFormat) {
  if (format === "jpeg") {
    return "image/jpeg";
  }
  if (format === "svg") {
    return "image/svg+xml";
  }
  if (format === "gif") {
    return "image/gif";
  }

  return "image/png";
}

function textFromInputBytes(bytes: Uint8Array, format: InputFormat) {
  return encodeHbs({
    data_uri: `data:${mimeTypeForFormat(format)};base64,${Buffer.from(bytes).toString("base64")}`,
  });
}

function textCharFor(text: string, index: number) {
  return text[index % text.length] ?? " ";
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rgbToHex(color: Rgb) {
  return `#${[color.r, color.g, color.b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function stampGlyph(
  output: Buffer,
  width: number,
  glyph: readonly string[],
  left: number,
  top: number,
  color: Rgb,
  glyphSize: number,
) {
  const sourceHeight = glyph.length;
  const sourceWidth = Math.max(...glyph.map((row) => row.length));

  for (let y = 0; y < glyphSize; y += 1) {
    const sourceY = Math.min(
      sourceHeight - 1,
      Math.floor((y * sourceHeight) / glyphSize),
    );

    const row = glyph[sourceY] ?? "";

    for (let x = 0; x < glyphSize; x += 1) {
      const sourceX = Math.min(
        sourceWidth - 1,
        Math.floor((x * sourceWidth) / glyphSize),
      );

      if (row[sourceX] !== "1") {
        continue;
      }

      const dest = ((top + y) * width + left + x) * 4;
      output[dest] = color.r;
      output[dest + 1] = color.g;
      output[dest + 2] = color.b;
      output[dest + 3] = 255;
    }
  }
}

async function renderMonospacePage(
  sourceData: Buffer,
  sourcePage: number,
  width: number,
  height: number,
  gridWidth: number,
  gridHeight: number,
  cellSize: number,
  glyphSize: number,
  text: string,
  background: Rgb,
  transparentGlyph: Rgb,
  alphaThreshold: number,
  transparentBackground: boolean,
) {
  const rows: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  ];

  if (!transparentBackground) {
    rows.push(
      `<rect width="100%" height="100%" fill="${rgbToHex(background)}"/>`,
    );
  }

  rows.push(
    `<g font-family="'Courier New', Courier, monospace" font-size="${glyphSize}" font-weight="400" text-rendering="geometricPrecision">`,
  );

  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const sourceIndex = sourcePage + (y * gridWidth + x) * 4;
      const alpha = sourceData[sourceIndex + 3] ?? 255;

      if (alpha < alphaThreshold) {
        continue;
      }

      const color =
        alpha < 255
          ? transparentGlyph
          : blendOver(
              background,
              {
                r: sourceData[sourceIndex] ?? 0,
                g: sourceData[sourceIndex + 1] ?? 0,
                b: sourceData[sourceIndex + 2] ?? 0,
              },
              alpha,
            );

      rows.push(
        `<text x="${x * cellSize}" y="${y * cellSize + glyphSize}" fill="${rgbToHex(color)}">${escapeXml(textCharFor(text, y * gridWidth + x))}</text>`,
      );
    }
  }

  rows.push("</g>", "</svg>");

  return await sharp(Buffer.from(rows.join("")))
    .ensureAlpha()
    .raw()
    .toBuffer();
}

function makePngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(imageCrc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

export function addPngTextChunk(png: Buffer, keyword: string, text: string) {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return png;
  }

  const chunk = makePngChunk(
    "iTXt",
    Buffer.concat([
      Buffer.from(keyword, "latin1"),
      Buffer.from([0]),
      Buffer.from([0]),
      Buffer.from([0]),
      Buffer.from([0]),
      Buffer.from([0]),
      Buffer.from(text, "utf8"),
    ]),
  );
  let offset = 8;

  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");

    if (type === "IEND") {
      return Buffer.concat([
        png.subarray(0, offset),
        chunk,
        png.subarray(offset),
      ]);
    }

    offset += 12 + length;
  }

  return png;
}

function trimRightBottom(
  output: Buffer,
  width: number,
  height: number,
  pages: number,
  trim: number,
) {
  if (trim <= 0) {
    return { data: output, width, height };
  }

  const nextWidth = width - trim;
  const nextHeight = height - trim;
  const data = Buffer.alloc(nextWidth * nextHeight * pages * 4);

  for (let page = 0; page < pages; page += 1) {
    const sourcePage = page * width * height * 4;
    const targetPage = page * nextWidth * nextHeight * 4;

    for (let y = 0; y < nextHeight; y += 1) {
      output.copy(
        data,
        targetPage + y * nextWidth * 4,
        sourcePage + y * width * 4,
        sourcePage + (y * width + nextWidth) * 4,
      );
    }
  }
  return { data, width: nextWidth, height: nextHeight };
}

export async function renderBlockscriptImage(
  input: Uint8Array | ArrayBuffer,
  options: BlockscriptImageOptions = {},
): Promise<BlockscriptImageResult> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const format = detectInputFormat(bytes);

  if (!format) {
    throw new Error("Unsupported image format");
  }

  const sharpOptions = format === "gif" ? { pages: -1 } : undefined;
  const metadata = await sharp(bytes, sharpOptions).metadata();
  const isAnimatedGif = format === "gif" && (metadata.pages ?? 1) > 1;
  const pages = isAnimatedGif ? (metadata.pages ?? 1) : 1;
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = isAnimatedGif
    ? (metadata.pageHeight ?? metadata.height ?? 0)
    : (metadata.height ?? 0);

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Input image dimensions could not be read");
  }

  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };
  const glyphSize = Math.max(
    1,
    Math.ceil((resolvedOptions.cell - 1) * resolvedOptions.size),
  );
  const cellSize = glyphSize + resolvedOptions.gap;
  const gridWidth = Math.max(
    1,
    Math.round(sourceWidth * resolvedOptions.scale),
  );
  const gridHeight = Math.max(
    1,
    Math.round(sourceHeight * resolvedOptions.scale),
  );
  const outputWidth = gridWidth * cellSize;
  const outputHeight = gridHeight * cellSize;
  const glyphs = glyphMapForMode(resolvedOptions.textMode);
  const backgroundValue =
    options.background === undefined && resolvedOptions.textMode === "monospace"
      ? "transparent"
      : resolvedOptions.background;

  const isTransparent = String(backgroundValue).toLowerCase() === "transparent";
  const background = isTransparent
    ? parseHexColor(DEFAULT_OPTIONS.background)
    : parseHexColor(backgroundValue);
  const transparentGlyph = parseHexColor(resolvedOptions.transparentGlyph);
  const text = options.text ?? textFromInputBytes(bytes, format);

  const sourceData = (
    await sharp(bytes, sharpOptions)
      .ensureAlpha()
      .resize({
        width: gridWidth,
        height: gridHeight,
        fit: "fill",
        kernel: sharp.kernel.nearest,
      })
      .raw()
      .toBuffer({ resolveWithObject: true })
  ).data;

  const output = Buffer.alloc(outputWidth * outputHeight * pages * 4);

  for (let index = 0; index < output.length; index += 4) {
    output[index] = background.r;
    output[index + 1] = background.g;
    output[index + 2] = background.b;
    output[index + 3] = isTransparent ? 0 : 255;
  }

  if (resolvedOptions.textMode === "monospace") {
    for (let page = 0; page < pages; page += 1) {
      const sourcePage = page * gridWidth * gridHeight * 4;
      const outputPage = page * outputWidth * outputHeight * 4;
      const pageData = await renderMonospacePage(
        sourceData,
        sourcePage,
        outputWidth,
        outputHeight,
        gridWidth,
        gridHeight,
        cellSize,
        glyphSize,
        text,
        background,
        transparentGlyph,
        resolvedOptions.alphaThreshold,
        isTransparent,
      );

      pageData.copy(output, outputPage);
    }
  } else {
    for (let page = 0; page < pages; page += 1) {
      const sourcePage = page * gridWidth * gridHeight * 4;
      const outputPage = page * outputWidth * outputHeight * 4;

      for (let y = 0; y < gridHeight; y += 1) {
        for (let x = 0; x < gridWidth; x += 1) {
          const sourceIndex = sourcePage + (y * gridWidth + x) * 4;
          const alpha = sourceData[sourceIndex + 3] ?? 255;

          if (alpha < resolvedOptions.alphaThreshold) {
            continue;
          }

          const color =
            alpha < 255
              ? transparentGlyph
              : blendOver(
                  background,
                  {
                    r: sourceData[sourceIndex] ?? 0,
                    g: sourceData[sourceIndex + 1] ?? 0,
                    b: sourceData[sourceIndex + 2] ?? 0,
                  },
                  alpha,
                );

          stampGlyph(
            output.subarray(outputPage),
            outputWidth,
            glyphFor(glyphs, text, y * gridWidth + x),
            x * cellSize,
            y * cellSize,
            color,
            glyphSize,
          );
        }
      }
    }
  }

  const trimmed = trimRightBottom(
    output,
    outputWidth,
    outputHeight,
    pages,
    resolvedOptions.gap,
  );

  const wantsGif =
    options.outputFormat === "gif" || format === "gif" || format === "apng";

  if (wantsGif) {
    const frames: Buffer[] = [];

    for (let page = 0; page < pages; page += 1) {
      const frame = trimmed.data.subarray(
        page * trimmed.width * trimmed.height * 4,
        (page + 1) * trimmed.width * trimmed.height * 4,
      );

      frames.push(
        await sharp(frame, {
          raw: { width: trimmed.width, height: trimmed.height, channels: 4 },
        })
          .png({ palette: true, effort: 10, compressionLevel: 9 })
          .toBuffer(),
      );
    }

    const image = await sharp(frames, { join: { animated: true } })
      .gif({ effort: 10, loop: metadata.loop ?? 0, delay: metadata.delay })
      .toBuffer();

    return {
      image,
      mimeType: "image/gif",
      sourceWidth,
      sourceHeight,
      gridWidth,
      gridHeight,
      outputWidth: trimmed.width,
      outputHeight: trimmed.height,
    };
  }

  let image = await sharp(trimmed.data, {
    raw: { width: trimmed.width, height: trimmed.height, channels: 4 },
  })
    .png({ palette: true, effort: 10, compressionLevel: 9 })
    .toBuffer();

  const traits =
    options.traits ??
    (options.attributes ? attributesToHbsPayload(options.attributes) : null);

  if (traits) {
    image = addPngTextChunk(image, HBS_METADATA_TRAITS_KEY, encodeHbs(traits));
  }

  return {
    image,
    mimeType: "image/png",
    sourceWidth,
    sourceHeight,
    gridWidth,
    gridHeight,
    outputWidth: trimmed.width,
    outputHeight: trimmed.height,
  };
}

const GLYPHS_OLD: Readonly<Record<string, readonly string[]>> = Object.freeze({
  " ": [
    "0000000",
    "0000000",
    "0000000",
    "0000000",
    "0000000",
    "0000000",
    "0000000",
  ],
  ".": [
    "1111111",
    "1000001",
    "1011101",
    "1010101",
    "1011101",
    "1000001",
    "1111111",
  ],
  "0": [
    "1111111",
    "1000001",
    "1010101",
    "0000000",
    "1010101",
    "1000001",
    "1111111",
  ],
  "1": [
    "1111111",
    "1000001",
    "1011101",
    "0000100",
    "1010101",
    "1000001",
    "1111111",
  ],
  "2": [
    "1111111",
    "1000001",
    "1010101",
    "0010100",
    "1010101",
    "1000001",
    "1111111",
  ],
  "3": [
    "1111111",
    "1000001",
    "1011101",
    "0000100",
    "1011101",
    "1000001",
    "1111111",
  ],
  "4": [
    "1111111",
    "1000001",
    "1010101",
    "0010100",
    "1011101",
    "1000001",
    "1111111",
  ],
  "5": [
    "1111111",
    "1000001",
    "1011101",
    "0010000",
    "1011101",
    "1000001",
    "1111111",
  ],
  "6": [
    "1111111",
    "1000001",
    "1011101",
    "0010000",
    "1010101",
    "1000001",
    "1111111",
  ],
  "7": [
    "1111111",
    "1000001",
    "1011101",
    "0010100",
    "1010101",
    "1000001",
    "1111111",
  ],
  "8": [
    "1111111",
    "1000001",
    "1011101",
    "0000000",
    "1011101",
    "1000001",
    "1111111",
  ],
  "9": [
    "1111111",
    "1000001",
    "1010101",
    "0000100",
    "1011101",
    "1000001",
    "1111111",
  ],
  a: [
    "1110111",
    "1010101",
    "1110111",
    "0000000",
    "1111111",
    "1000001",
    "1010101",
  ],
  b: [
    "1110111",
    "1010101",
    "1110111",
    "0000000",
    "1111111",
    "1000001",
    "1111111",
  ],
  c: [
    "1110111",
    "1010101",
    "1010101",
    "1010101",
    "1110111",
    "0000000",
    "1111111",
  ],
  d: [
    "1110111",
    "1010101",
    "1010111",
    "1010000",
    "1010111",
    "1010101",
    "1110111",
  ],
  e: [
    "1111111",
    "1000001",
    "1111111",
    "0000000",
    "1111111",
    "1000001",
    "1111111",
  ],
  f: [
    "1111111",
    "1000001",
    "1111111",
    "0000000",
    "1111111",
    "1000001",
    "1010101",
  ],
  g: [
    "1110111",
    "1010101",
    "1110101",
    "0000101",
    "1110101",
    "1010101",
    "1110111",
  ],
  h: [
    "1110111",
    "1010101",
    "1011101",
    "0000000",
    "1011101",
    "1010101",
    "1110111",
  ],
  i: [
    "1110111",
    "1010101",
    "1010101",
    "1010101",
    "1010101",
    "1010101",
    "1110111",
  ],
  j: [
    "1111111",
    "1000001",
    "1111111",
    "0000000",
    "1011101",
    "1010101",
    "1110111",
  ],
  k: [
    "1011101",
    "1000001",
    "1111111",
    "0000000",
    "1111111",
    "1000001",
    "1010101",
  ],
  l: [
    "1111111",
    "0000000",
    "1111111",
    "1000001",
    "1010101",
    "1000001",
    "1010101",
  ],
  m: [
    "1110111",
    "1010101",
    "1010101",
    "1010101",
    "1010101",
    "1010101",
    "1011101",
  ],
  n: [
    "1111111",
    "1000001",
    "1111111",
    "0000000",
    "1111111",
    "1000001",
    "1011101",
  ],
  o: [
    "1110111",
    "1010101",
    "1110111",
    "0000000",
    "1110111",
    "1010101",
    "1110111",
  ],
  p: [
    "1111111",
    "1000001",
    "1111111",
    "0000000",
    "1110111",
    "1010101",
    "1110111",
  ],
  q: [
    "1110111",
    "1010101",
    "1111111",
    "0010100",
    "1111111",
    "1010101",
    "1110111",
  ],
  r: [
    "1111111",
    "1000001",
    "1111111",
    "0000000",
    "1110111",
    "1010101",
    "1011101",
  ],
  s: [
    "1111111",
    "1000000",
    "1111111",
    "0000001",
    "1111111",
    "1000000",
    "1111111",
  ],
  t: [
    "1111111",
    "0000000",
    "1110111",
    "1010101",
    "1010101",
    "1010101",
    "1110111",
  ],
  u: [
    "1011101",
    "1000001",
    "1111111",
    "0000000",
    "1111111",
    "1000001",
    "1111111",
  ],
  v: [
    "1011101",
    "1010101",
    "1011101",
    "1000001",
    "1111111",
    "0000000",
    "1111111",
  ],
  w: [
    "1011101",
    "1010101",
    "1010101",
    "1010101",
    "1010101",
    "1010101",
    "1110111",
  ],
  x: [
    "1011101",
    "1010101",
    "1110111",
    "0000000",
    "1110111",
    "1010101",
    "1011101",
  ],
  y: [
    "1010101",
    "1000001",
    "1010101",
    "1000001",
    "1111111",
    "0000000",
    "1111111",
  ],
  z: [
    "1111111",
    "0000001",
    "1111111",
    "1000000",
    "1111111",
    "0000001",
    "1111111",
  ],
});
