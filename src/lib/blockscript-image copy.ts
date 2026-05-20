import { bech32 } from "@scure/base";
import sharp from "sharp";

export const CELL_SIZE = 8;
export const SOURCE_SCALE = 1;
export const GLYPH_SCALE = 1;
export const GLYPH_GAP = 1;

const BACKGROUND = "#000";
const TRANSPARENT_GLYPH = "#fff";
const ALPHA_THRESHOLD = 12;

export type BlockscriptImageOptions = {
  text?: string;
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

export function encodeHbsText(json: string) {
  const bytes = new TextEncoder().encode(json);

  return `${bytes.byteLength}.${bech32.encode("hbs", bech32.toWords(bytes), false)}`;
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

function glyphFor(text: string, index: number) {
  const char = text ? text[index % text.length] : " ";

  return GLYPHS[char] ?? GLYPHS[char.toLowerCase()] ?? GLYPHS[" "];
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

  const glyphSize = Math.max(1, Math.ceil((CELL_SIZE - 1) * GLYPH_SCALE));
  const cellSize = glyphSize + GLYPH_GAP;
  const gridWidth = Math.max(1, Math.round(sourceWidth * SOURCE_SCALE));
  const gridHeight = Math.max(1, Math.round(sourceHeight * SOURCE_SCALE));
  const outputWidth = gridWidth * cellSize;
  const outputHeight = gridHeight * cellSize;
  const background = parseHexColor(BACKGROUND);
  const transparentGlyph = parseHexColor(TRANSPARENT_GLYPH);

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
    output[index + 3] = 255;
  }

  for (let page = 0; page < pages; page += 1) {
    const sourcePage = page * gridWidth * gridHeight * 4;
    const outputPage = page * outputWidth * outputHeight * 4;

    for (let y = 0; y < gridHeight; y += 1) {
      for (let x = 0; x < gridWidth; x += 1) {
        const sourceIndex = sourcePage + (y * gridWidth + x) * 4;
        const alpha = sourceData[sourceIndex + 3] ?? 255;

        if (alpha < ALPHA_THRESHOLD) {
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
          glyphFor(options.text ?? "", y * gridWidth + x),
          x * cellSize,
          y * cellSize,
          color,
          glyphSize,
        );
      }
    }
  }

  const trimmed = trimRightBottom(
    output,
    outputWidth,
    outputHeight,
    pages,
    GLYPH_GAP,
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

  const image = await sharp(trimmed.data, {
    raw: { width: trimmed.width, height: trimmed.height, channels: 4 },
  })
    .png({ palette: true, effort: 10, compressionLevel: 9 })
    .toBuffer();

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

export const GLYPHS: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
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
