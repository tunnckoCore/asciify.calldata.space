import sharp from "sharp";

type Rgb = { r: number; g: number; b: number };

export type RenderBlockscriptOptions = {
  size?: number;
  cellWidth?: number;
  cellHeight?: number;
  sourceScale?: number | null;
  gridWidth?: number | null;
  gridHeight?: number | null;
  background?: string | Rgb;
  transparentGlyph?: string | Rgb;
  transparentMode?: "dim" | "skip";
  alphaThreshold?: number;
  circle?: boolean;
  heart?: boolean;
  palette?: boolean;
  outputFormat?: "png" | "gif";
  text?: string;
};

export type RenderBlockscriptResult = {
  image: Buffer;
  png: Buffer;
  mimeType: "image/png" | "image/gif";
  sourceWidth: number;
  sourceHeight: number;
  gridWidth: number;
  gridHeight: number;
  outputWidth: number;
  outputHeight: number;
  pages: number;
};

export const GLYPH_ROWS: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    "!": [
      "1111111",
      "1000001",
      "1011101",
      "1010101",
      "1010101",
      "1000001",
      "1111111",
    ],
    '"': [
      "1111111",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1000001",
      "1111111",
    ],
    "#": [
      "1111111",
      "1010101",
      "1010101",
      "0000000",
      "1010101",
      "1010101",
      "1111111",
    ],
    $: [
      "0010100",
      "1111111",
      "1000000",
      "1111111",
      "0000001",
      "1111111",
      "1000000",
      "1111111",
      "0010100",
    ],
    "%": [
      "1110111",
      "1010101",
      "1110111",
      "0000000",
      "1110111",
      "0000000",
      "1110111",
    ],
    "&": [
      "1011101",
      "1010101",
      "1010101",
      "1110111",
      "1010101",
      "1010101",
      "1011101",
    ],
    "'": [
      "1111111",
      "1010101",
      "1010101",
      "1010101",
      "1011101",
      "1000001",
      "1111111",
    ],
    "(": [
      "1111111",
      "1010001",
      "1010101",
      "1010001",
      "1010101",
      "1010001",
      "1111111",
    ],
    ")": [
      "1111111",
      "1000101",
      "1010101",
      "1000101",
      "1010101",
      "1000101",
      "1111111",
    ],
    "*": [
      "1111111",
      "1001001",
      "1010101",
      "1100011",
      "1010101",
      "1001001",
      "1111111",
    ],
    "+": [
      "1111111",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1111111",
    ],
    ",": [
      "1111111",
      "1000001",
      "1011101",
      "1000101",
      "1010101",
      "1000001",
      "1111111",
    ],
    "-": [
      "1111111",
      "1000001",
      "1011101",
      "1000001",
      "1011101",
      "1000001",
      "1111111",
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
    "/": [
      "1111111",
      "1000001",
      "1011101",
      "1001001",
      "1011101",
      "1000001",
      "1111111",
    ],
    0: [
      "1111111",
      "1000001",
      "1010101",
      "0000000",
      "1010101",
      "1000001",
      "1111111",
    ],
    1: [
      "1111111",
      "1000001",
      "1011101",
      "0000100",
      "1010101",
      "1000001",
      "1111111",
    ],
    2: [
      "1111111",
      "1000001",
      "1010101",
      "0010100",
      "1010101",
      "1000001",
      "1111111",
    ],
    3: [
      "1111111",
      "1000001",
      "1011101",
      "0000100",
      "1011101",
      "1000001",
      "1111111",
    ],
    4: [
      "1111111",
      "1000001",
      "1010101",
      "0010100",
      "1011101",
      "1000001",
      "1111111",
    ],
    5: [
      "1111111",
      "1000001",
      "1011101",
      "0010000",
      "1011101",
      "1000001",
      "1111111",
    ],
    6: [
      "1111111",
      "1000001",
      "1011101",
      "0010000",
      "1010101",
      "1000001",
      "1111111",
    ],
    7: [
      "1111111",
      "1000001",
      "1011101",
      "0010100",
      "1010101",
      "1000001",
      "1111111",
    ],
    8: [
      "1111111",
      "1000001",
      "1011101",
      "0000000",
      "1011101",
      "1000001",
      "1111111",
    ],
    9: [
      "1111111",
      "1000001",
      "1010101",
      "0000100",
      "1011101",
      "1000001",
      "1111111",
    ],
    ":": [
      "1111111",
      "1000001",
      "1010101",
      "1000001",
      "1010101",
      "1000001",
      "1111111",
    ],
    ";": [
      "1111111",
      "1000001",
      "1010101",
      "1000101",
      "1010101",
      "1000001",
      "1111111",
    ],
    "<": [
      "1111111",
      "1010001",
      "1010101",
      "1010001",
      "1011111",
      "1000001",
      "1111111",
    ],
    "=": [
      "1111111",
      "1000001",
      "1110111",
      "1000001",
      "1110111",
      "1000001",
      "1111111",
    ],
    ">": [
      "1111111",
      "1000101",
      "1010101",
      "1000101",
      "1111101",
      "1000001",
      "1111111",
    ],
    "?": [
      "1111111",
      "1000001",
      "1011101",
      "1000101",
      "1011101",
      "1000001",
      "1111111",
    ],
    "@": [
      "1111111",
      "1000001",
      "1011101",
      "1010101",
      "1010101",
      "1010001",
      "1011111",
    ],
    A: [
      "1110111",
      "1010101",
      "1110111",
      "0000000",
      "1111111",
      "1000001",
      "1010101",
    ],
    B: [
      "1110111",
      "1010101",
      "1110111",
      "0000000",
      "1111111",
      "1000001",
      "1111111",
    ],
    C: [
      "1110111",
      "1010101",
      "1010101",
      "1010101",
      "1110111",
      "0000000",
      "1111111",
    ],
    D: [
      "1110111",
      "1010101",
      "1010111",
      "1010000",
      "1010111",
      "1010101",
      "1110111",
    ],
    E: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1111111",
    ],
    F: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1010101",
    ],
    G: [
      "1110111",
      "1010101",
      "1110101",
      "0000101",
      "1110101",
      "1010101",
      "1110111",
    ],
    H: [
      "1110111",
      "1010101",
      "1011101",
      "0000000",
      "1011101",
      "1010101",
      "1110111",
    ],
    I: [
      "1110111",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1110111",
    ],
    J: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1011101",
      "1010101",
      "1110111",
    ],
    K: [
      "1011101",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1010101",
    ],
    L: [
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1010101",
      "1000001",
      "1010101",
    ],
    M: [
      "1110111",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1011101",
    ],
    N: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1011101",
    ],
    O: [
      "1110111",
      "1010101",
      "1110111",
      "0000000",
      "1110111",
      "1010101",
      "1110111",
    ],
    P: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1110111",
      "1010101",
      "1110111",
    ],
    Q: [
      "1110111",
      "1010101",
      "1111111",
      "0010100",
      "1111111",
      "1010101",
      "1110111",
    ],
    R: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1110111",
      "1010101",
      "1011101",
    ],
    S: [
      "1111111",
      "1000000",
      "1111111",
      "0000001",
      "1111111",
      "1000000",
      "1111111",
    ],
    T: [
      "1111111",
      "0000000",
      "1110111",
      "1010101",
      "1010101",
      "1010101",
      "1110111",
    ],
    U: [
      "1011101",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1111111",
    ],
    V: [
      "1011101",
      "1010101",
      "1011101",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
    ],
    W: [
      "1011101",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1110111",
    ],
    X: [
      "1011101",
      "1010101",
      "1110111",
      "0000000",
      "1110111",
      "1010101",
      "1011101",
    ],
    Y: [
      "1010101",
      "1000001",
      "1010101",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
    ],
    Z: [
      "1111111",
      "0000001",
      "1111111",
      "1000000",
      "1111111",
      "0000001",
      "1111111",
    ],
    "[": [
      "1111111",
      "1010001",
      "1010101",
      "1010001",
      "1010101",
      "1010001",
      "1111111",
    ],
    "\\": [
      "1111111",
      "1000001",
      "1010101",
      "1011101",
      "1010101",
      "1000001",
      "1111111",
    ],
    "]": [
      "1111111",
      "1000101",
      "1010101",
      "1000101",
      "1010101",
      "1000101",
      "1111111",
    ],
    _: [
      "1111111",
      "1000001",
      "1010101",
      "1000001",
      "1011101",
      "1000001",
      "1111111",
    ],
    "`": ["11011", "10001"],
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
    "{": [
      "1111111",
      "1010001",
      "1010101",
      "1000001",
      "1010101",
      "1010001",
      "1111111",
    ],
    "|": [
      "1111111",
      "1000001",
      "1010101",
      "1010101",
      "1010101",
      "1000001",
      "1111111",
    ],
    "}": [
      "1111111",
      "1000101",
      "1010101",
      "1000001",
      "1010101",
      "1000101",
      "1111111",
    ],
  });

const DEFAULT_BACKGROUND = "#05000B";
const DEFAULT_TRANSPARENT_GLYPH = "#26235D";

export const DEFAULT_BLOCKSCRIPT_OPTIONS = {
  size: 336,
  cellWidth: 8,
  cellHeight: 8,
  sourceScale: null,
  gridWidth: null,
  gridHeight: null,
  background: DEFAULT_BACKGROUND,
  transparentGlyph: DEFAULT_TRANSPARENT_GLYPH,
  transparentMode: "dim",
  alphaThreshold: 12,
  circle: false,
  heart: false,
  palette: true,
  outputFormat: "png",
  text: "",
} satisfies Required<RenderBlockscriptOptions>;

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

function resolveInputSource(input: Uint8Array | ArrayBuffer) {
  if (!(input instanceof Uint8Array || input instanceof ArrayBuffer)) {
    throw new Error(
      "renderBlockscriptImage expects image bytes as Uint8Array or ArrayBuffer",
    );
  }

  const buffer =
    input instanceof ArrayBuffer
      ? Buffer.from(input)
      : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  return {
    buffer,
    text: `data:application/octet-stream;base64,${buffer.toString("base64")}`,
  };
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

type PngChunk = { type: string; data: Buffer; raw: Buffer };
type ApngFrame = {
  png: Buffer;
  width: number;
  height: number;
  x: number;
  y: number;
  delay: number;
  dispose: number;
  blend: number;
};

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function parsePngChunks(buffer: Buffer): PngChunk[] {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return [];
  const chunks: PngChunk[] = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    const raw = buffer.subarray(offset, offset + 12 + length);
    chunks.push({ type, data, raw });
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return chunks;
}

function makeFramePng(
  ihdr: Buffer,
  prefixChunks: PngChunk[],
  frame: { width: number; height: number; dataParts: Buffer[] },
) {
  const frameIhdr = Buffer.from(ihdr);
  frameIhdr.writeUInt32BE(frame.width, 0);
  frameIhdr.writeUInt32BE(frame.height, 4);
  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk("IHDR", frameIhdr),
    ...prefixChunks.map((chunk) => chunk.raw),
    ...frame.dataParts.map((part) => makeChunk("IDAT", part)),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function extractApngFrames(buffer: Buffer): ApngFrame[] | null {
  const chunks = parsePngChunks(buffer);
  if (!chunks.some((chunk) => chunk.type === "acTL")) return null;
  const ihdr = chunks.find((chunk) => chunk.type === "IHDR")?.data;
  if (!ihdr) return null;
  const prefixChunks = chunks.filter(
    (chunk) =>
      !["IHDR", "IEND", "acTL", "fcTL", "fdAT", "IDAT"].includes(chunk.type),
  );
  const frames: Array<{
    width: number;
    height: number;
    x: number;
    y: number;
    delay: number;
    dispose: number;
    blend: number;
    dataParts: Buffer[];
  }> = [];
  let current: (typeof frames)[number] | null = null;

  for (const chunk of chunks) {
    if (chunk.type === "fcTL") {
      current = {
        width: chunk.data.readUInt32BE(4),
        height: chunk.data.readUInt32BE(8),
        x: chunk.data.readUInt32BE(12),
        y: chunk.data.readUInt32BE(16),
        delay: Math.max(
          10,
          Math.round(
            (chunk.data.readUInt16BE(20) /
              (chunk.data.readUInt16BE(22) || 100)) *
              1000,
          ),
        ),
        dispose: chunk.data[24] ?? 0,
        blend: chunk.data[25] ?? 0,
        dataParts: [],
      };
      frames.push(current);
    } else if (chunk.type === "IDAT") {
      if (!current) {
        current = {
          width: ihdr.readUInt32BE(0),
          height: ihdr.readUInt32BE(4),
          x: 0,
          y: 0,
          delay: 100,
          dispose: 0,
          blend: 0,
          dataParts: [],
        };
        frames.push(current);
      }
      current.dataParts.push(chunk.data);
    } else if (chunk.type === "fdAT" && current) {
      current.dataParts.push(chunk.data.subarray(4));
    }
  }

  return frames
    .filter((frame) => frame.dataParts.length > 0)
    .map((frame) => ({
      ...frame,
      png: makeFramePng(ihdr, prefixChunks, frame),
    }));
}

async function decodeApngFrames(buffer: Buffer) {
  const frames = extractApngFrames(buffer);
  if (!frames?.length) return null;
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  let canvas = Buffer.alloc(width * height * 4);
  const renderedFrames: Buffer[] = [];

  for (const frame of frames) {
    const previous = Buffer.from(canvas);
    const decoded = await sharp(frame.png).ensureAlpha().raw().toBuffer();
    if (frame.blend === 0) {
      for (let y = 0; y < frame.height; y += 1) {
        const target = ((frame.y + y) * width + frame.x) * 4;
        decoded.copy(
          canvas,
          target,
          y * frame.width * 4,
          (y + 1) * frame.width * 4,
        );
      }
    } else {
      for (let y = 0; y < frame.height; y += 1) {
        for (let x = 0; x < frame.width; x += 1) {
          const src = (y * frame.width + x) * 4;
          const dst = ((frame.y + y) * width + frame.x + x) * 4;
          const alpha = decoded[src + 3] / 255;
          canvas[dst] = clampByte(
            decoded[src] * alpha + canvas[dst] * (1 - alpha),
          );
          canvas[dst + 1] = clampByte(
            decoded[src + 1] * alpha + canvas[dst + 1] * (1 - alpha),
          );
          canvas[dst + 2] = clampByte(
            decoded[src + 2] * alpha + canvas[dst + 2] * (1 - alpha),
          );
          canvas[dst + 3] = clampByte(
            decoded[src + 3] + canvas[dst + 3] * (1 - alpha),
          );
        }
      }
    }
    renderedFrames.push(Buffer.from(canvas));
    if (frame.dispose === 1) {
      for (let y = 0; y < frame.height; y += 1) {
        canvas.fill(
          0,
          ((frame.y + y) * width + frame.x) * 4,
          ((frame.y + y) * width + frame.x + frame.width) * 4,
        );
      }
    } else if (frame.dispose === 2) {
      canvas = previous;
    }
  }

  return {
    width,
    height,
    frames: renderedFrames,
    delays: frames.map((frame) => frame.delay),
  };
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blendOver(background: Rgb, foreground: Rgb, alpha: number): Rgb {
  if (alpha >= 255) return foreground;
  if (alpha <= 0) return background;
  return {
    r: clampByte((foreground.r * alpha + background.r * (255 - alpha)) / 255),
    g: clampByte((foreground.g * alpha + background.g * (255 - alpha)) / 255),
    b: clampByte((foreground.b * alpha + background.b * (255 - alpha)) / 255),
  };
}

function buildGlyphMap(options: { cellWidth: number; cellHeight: number }) {
  const byChar = new Map();
  for (const [char, rows] of Object.entries(GLYPH_ROWS)) {
    const width = Math.max(...rows.map((row) => row.length));
    const height = rows.length;
    if (width > options.cellWidth || height > options.cellHeight) continue;
    byChar.set(char, {
      char,
      width,
      height,
      rows,
    });
  }
  if (byChar.size === 0) {
    throw new Error(
      "No embedded High Blockscript glyphs fit inside the requested cell size",
    );
  }
  return byChar;
}

function pickGlyph(
  glyphs: Map<
    string,
    { char: string; width: number; height: number; rows: readonly string[] }
  >,
  sourceText: string,
  cellIndex: number,
) {
  for (let offset = 0; offset < sourceText.length; offset += 1) {
    const char = sourceText[(cellIndex + offset) % sourceText.length] ?? "?";
    const glyph = glyphs.get(char);
    if (glyph) return glyph;
  }
  return glyphs.get("?") ?? [...glyphs.values()][0];
}

function stampGlyph(
  output: Buffer,
  outputWidth: number,
  glyph: { rows: readonly string[]; height: number; width: number },
  left: number,
  top: number,
  color: Rgb,
) {
  for (let y = 0; y < glyph.height; y += 1) {
    const row = glyph.rows[y] ?? "";
    for (let x = 0; x < glyph.width; x += 1) {
      if (row[x] !== "1") continue;
      const destIndex = ((top + y) * outputWidth + left + x) * 4;
      output[destIndex] = color.r;
      output[destIndex + 1] = color.g;
      output[destIndex + 2] = color.b;
      output[destIndex + 3] = 255;
    }
  }
}

function clearCell(
  output: Buffer,
  outputWidth: number,
  left: number,
  top: number,
  width: number,
  height: number,
) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const destIndex = ((top + y) * outputWidth + left + x) * 4;
      output[destIndex] = 0;
      output[destIndex + 1] = 0;
      output[destIndex + 2] = 0;
      output[destIndex + 3] = 0;
    }
  }
}

export async function renderBlockscriptImage(
  input: Uint8Array | ArrayBuffer,
  options: RenderBlockscriptOptions = {},
): Promise<RenderBlockscriptResult> {
  const mergedOptions = { ...DEFAULT_BLOCKSCRIPT_OPTIONS, ...options };
  const resolvedOptions = {
    ...mergedOptions,
    background:
      typeof mergedOptions.background === "string"
        ? parseHexColor(mergedOptions.background)
        : mergedOptions.background,
    transparentGlyph:
      typeof mergedOptions.transparentGlyph === "string"
        ? parseHexColor(mergedOptions.transparentGlyph)
        : mergedOptions.transparentGlyph,
  };

  const inputSource = resolveInputSource(input);
  const apng = await decodeApngFrames(inputSource.buffer);
  const metadata = await sharp(inputSource.buffer).metadata();
  const isAnimatedGif = metadata.format === "gif" && (metadata.pages ?? 1) > 1;
  const pages = apng
    ? apng.frames.length
    : isAnimatedGif
      ? (metadata.pages ?? 1)
      : 1;
  const sourceWidth = apng ? apng.width : (metadata.width ?? 0);
  const sourceHeight = apng
    ? apng.height
    : isAnimatedGif
      ? (metadata.pageHeight ?? metadata.height ?? 0)
      : (metadata.height ?? 0);
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Input image dimensions could not be read");
  }

  const defaultGridWidth = resolvedOptions.sourceScale
    ? sourceWidth * resolvedOptions.sourceScale
    : Math.max(1, Math.round(resolvedOptions.size / resolvedOptions.cellWidth));
  const defaultGridHeight = resolvedOptions.sourceScale
    ? sourceHeight * resolvedOptions.sourceScale
    : Math.max(
        1,
        Math.round(resolvedOptions.size / resolvedOptions.cellHeight),
      );
  const gridWidth = resolvedOptions.gridWidth ?? defaultGridWidth;
  const gridHeight = resolvedOptions.gridHeight ?? defaultGridHeight;
  const outputWidth = gridWidth * resolvedOptions.cellWidth;
  const outputHeight = gridHeight * resolvedOptions.cellHeight;
  const keepTransparentPixels =
    !apng && !isAnimatedGif && resolvedOptions.outputFormat === "png";
  const glyphs = buildGlyphMap(resolvedOptions);

  const sourceData = apng
    ? Buffer.concat(
        await Promise.all(
          apng.frames.map((frame) =>
            sharp(frame, {
              raw: { width: sourceWidth, height: sourceHeight, channels: 4 },
            })
              .resize({
                width: gridWidth,
                height: gridHeight,
                fit: "fill",
                kernel: sharp.kernel.nearest,
              })
              .raw()
              .toBuffer(),
          ),
        ),
      )
    : (
        await sharp(inputSource.buffer, isAnimatedGif ? { pages: -1 } : {})
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
    const bg = resolvedOptions.background as Rgb;
    output[index] = bg.r;
    output[index + 1] = bg.g;
    output[index + 2] = bg.b;
    output[index + 3] = 255;
  }

  for (let page = 0; page < pages; page += 1) {
    const sourcePageOffset = page * gridWidth * gridHeight * 4;
    const outputPageOffset = page * outputWidth * outputHeight * 4;
    for (let y = 0; y < gridHeight; y += 1) {
      for (let x = 0; x < gridWidth; x += 1) {
        const sourceIndex = sourcePageOffset + (y * gridWidth + x) * 4;
        const alpha = sourceData[sourceIndex + 3] ?? 0;
        if (alpha < resolvedOptions.alphaThreshold && keepTransparentPixels) {
          clearCell(
            output.subarray(outputPageOffset),
            outputWidth,
            x * resolvedOptions.cellWidth,
            y * resolvedOptions.cellHeight,
            resolvedOptions.cellWidth,
            resolvedOptions.cellHeight,
          );
          continue;
        }
        if (
          alpha < resolvedOptions.alphaThreshold &&
          resolvedOptions.transparentMode === "skip"
        )
          continue;
        const color =
          alpha < resolvedOptions.alphaThreshold
            ? resolvedOptions.transparentGlyph
            : blendOver(
                resolvedOptions.background as Rgb,
                {
                  r: sourceData[sourceIndex] ?? 0,
                  g: sourceData[sourceIndex + 1] ?? 0,
                  b: sourceData[sourceIndex + 2] ?? 0,
                },
                alpha,
              );
        const glyph = pickGlyph(
          glyphs,
          resolvedOptions.text || inputSource.text,
          y * gridWidth + x,
        );
        stampGlyph(
          output.subarray(outputPageOffset),
          outputWidth,
          glyph,
          x * resolvedOptions.cellWidth,
          y * resolvedOptions.cellHeight,
          color as Rgb,
        );
      }
    }
  }

  if (resolvedOptions.circle || resolvedOptions.heart) {
    const cx = (outputWidth - 1) / 2;
    const cy = (outputHeight - 1) / 2;
    const radius = Math.min(outputWidth, outputHeight) / 2;
    const radiusSq = radius * radius;
    for (let page = 0; page < pages; page += 1) {
      const outputPageOffset = page * outputWidth * outputHeight * 4;
      for (let y = 0; y < outputHeight; y += 1) {
        for (let x = 0; x < outputWidth; x += 1) {
          let inside: boolean;
          if (resolvedOptions.heart) {
            const nx = ((x - cx) / radius) * 1.25;
            const ny = -((y - cy) / radius) * 1.25 + 0.18;
            const v = nx * nx + ny * ny - 1;
            inside = v * v * v - nx * nx * ny * ny * ny <= 0;
          } else {
            const dx = x - cx;
            const dy = y - cy;
            inside = dx * dx + dy * dy <= radiusSq;
          }
          if (inside) continue;
          const index = outputPageOffset + (y * outputWidth + x) * 4;
          output[index + 3] = 0;
        }
      }
    }
  }

  let rendered: Buffer;
  let mimeType: "image/png" | "image/gif";

  if (isAnimatedGif || resolvedOptions.outputFormat === "gif") {
    const framePngs = [];
    for (let page = 0; page < pages; page += 1) {
      const frame = output.subarray(
        page * outputWidth * outputHeight * 4,
        (page + 1) * outputWidth * outputHeight * 4,
      );
      framePngs.push(
        await sharp(frame, {
          raw: { width: outputWidth, height: outputHeight, channels: 4 },
        })
          .png({ palette: true, effort: 10, compressionLevel: 9 })
          .toBuffer(),
      );
    }

    rendered = await sharp(framePngs, { join: { animated: true } })
      .gif({
        effort: 10,
        loop: metadata.loop ?? 0,
        delay: apng?.delays ?? metadata.delay,
      })
      .toBuffer();
    mimeType = "image/gif";
  } else {
    rendered = await sharp(output, {
      raw: {
        width: outputWidth,
        height: outputHeight,
        channels: 4,
      },
    })
      .png({
        palette: resolvedOptions.palette,
        effort: 10,
        compressionLevel: 9,
      })
      .toBuffer();
    mimeType = "image/png";
  }
  return {
    image: rendered,
    png: rendered,
    mimeType,
    sourceWidth,
    sourceHeight,
    gridWidth,
    gridHeight,
    outputWidth,
    outputHeight,
    pages,
  };
}
