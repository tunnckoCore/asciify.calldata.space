/*
  Pixel-perfect High Blockscript ASCII renderer.

  What it does:
  - Reads an image from a path, data URI, base64 string, @text-file, or stdin.
  - Turns the exact image bytes into a data URI text stream when the input is a file.
  - Renders one source pixel as one repeated data-URI character glyph.
  - Colors each glyph from that source pixel.
  - Uses embedded trimmed High Blockscript glyph masks, so this file does not need
    the InscriBurner repo assets.

  Install:
    npm install sharp

  Run:
    node blockscript-ascii-standalone.mjs --input ./mfpurr#5094.png --output ./mfpurr-blockscript.png

  Useful extras:
    node blockscript-ascii-standalone.mjs \
      --input ./mfpurr#5094.png \
      --output ./mfpurr-blockscript.png \
      --source-data-uri-output ./mfpurr.datauri.txt \
      --output-data-uri ./mfpurr-blockscript.datauri.txt
*/

import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readFile as readOutputFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

const GLYPH_ROWS = Object.freeze({
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

const DEFAULT_OUTPUT = "blockscript-ascii.png";
const DEFAULT_BACKGROUND = "#05000B";
const DEFAULT_TRANSPARENT_GLYPH = "#26235D";

function usage() {
  console.log(`Usage:
  node blockscript-ascii-standalone.mjs --input <image-path|data-uri|base64|@text-file> [options]

Options:
  --output, -o <path>              Output PNG. Default: ${DEFAULT_OUTPUT}
  --source-data-uri-output <path>  Write the exact source data URI text used for glyphs.
  --output-data-uri <path>         Write the rendered PNG as a data URI.
  --size <n>                       Target output size. Default: 336.
  --cell-width <n>                 Cell pitch width. Default: 8 (7px glyph + 1px spacer).
  --cell-height <n>                Cell pitch height. Default: 8 (7px glyph + 1px spacer).
  --source-scale <n>               Nearest-neighbor source pixel multiplier. Overrides --size.
  --grid-width <n>                 Override sampled grid width.
  --grid-height <n>                Override sampled grid height.
  --background <hex>               Opaque background. Default: ${DEFAULT_BACKGROUND}
  --transparent-glyph <hex>        Glyph color for transparent source pixels. Default: ${DEFAULT_TRANSPARENT_GLYPH}
  --transparent-mode <dim|skip>    Draw or skip transparent source pixels. Default: dim.
  --alpha-threshold <0-255>        Alpha below this is transparent. Default: 12.
  --circle                         Clip output to a transparent circle.
  --heart                          Clip output to a transparent heart.
  --palette                        Encode PNG output as palette/PaletteAlpha.
  --no-palette                     Encode PNG output as truecolor RGBA.
  --help, -h

Input notes:
  - For an image path, the script builds data:<mime>;base64,... from that exact file.
  - For a data URI text file, pass @file.txt to preserve that exact text stream.
  - One source pixel becomes one glyph. The data URI text repeats until the grid is filled.
`);
}

function parseHexColor(value) {
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

function parsePositiveInteger(name, value) {
  const parsed = Number.parseInt(value, 10);
  if (
    !Number.isFinite(parsed) ||
    parsed <= 0 ||
    String(parsed) !== String(value).trim()
  ) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseIntegerInRange(name, value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (
    !Number.isFinite(parsed) ||
    parsed < min ||
    parsed > max ||
    String(parsed) !== String(value).trim()
  ) {
    throw new Error(`${name} must be an integer from ${min} to ${max}`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    input: null,
    output: path.resolve(DEFAULT_OUTPUT),
    sourceDataUriOutput: null,
    outputDataUri: null,
    size: 336,
    cellWidth: 8,
    cellHeight: 8,
    sourceScale: null,
    gridWidth: null,
    gridHeight: null,
    background: parseHexColor(DEFAULT_BACKGROUND),
    transparentGlyph: parseHexColor(DEFAULT_TRANSPARENT_GLYPH),
    transparentMode: "dim",
    alphaThreshold: 12,
    circle: false,
    heart: false,
    palette: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      index += 1;
      return value;
    };

    switch (arg) {
      case "--help":
      case "-h":
        usage();
        process.exit(0);
        break;
      case "--input":
      case "-i":
        options.input = next();
        break;
      case "--output":
      case "-o":
        options.output = path.resolve(next());
        break;
      case "--source-data-uri-output":
        options.sourceDataUriOutput = path.resolve(next());
        break;
      case "--output-data-uri":
        options.outputDataUri = path.resolve(next());
        break;
      case "--size":
        options.size = parsePositiveInteger(arg, next());
        break;
      case "--cell-width":
        options.cellWidth = parsePositiveInteger(arg, next());
        break;
      case "--cell-height":
        options.cellHeight = parsePositiveInteger(arg, next());
        break;
      case "--source-scale":
        options.sourceScale = parsePositiveInteger(arg, next());
        break;
      case "--grid-width":
        options.gridWidth = parsePositiveInteger(arg, next());
        break;
      case "--grid-height":
        options.gridHeight = parsePositiveInteger(arg, next());
        break;
      case "--background":
        options.background = parseHexColor(next());
        break;
      case "--transparent-glyph":
        options.transparentGlyph = parseHexColor(next());
        break;
      case "--transparent-mode": {
        const value = next();
        if (value !== "dim" && value !== "skip")
          throw new Error("--transparent-mode must be dim or skip");
        options.transparentMode = value;
        break;
      }
      case "--alpha-threshold":
        options.alphaThreshold = parseIntegerInRange(arg, next(), 0, 255);
        break;
      case "--circle":
        options.circle = true;
        break;
      case "--heart":
        options.heart = true;
        break;
      case "--palette":
        options.palette = true;
        break;
      case "--no-palette":
        options.palette = false;
        break;
      default:
        if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
        if (options.input)
          throw new Error(`Unexpected positional argument: ${arg}`);
        options.input = arg;
        break;
    }
  }

  return options;
}

async function readStdinText() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

function decodeDataUri(value) {
  const match = String(value)
    .trim()
    .match(/^data:([^,]*?),(.*)$/s);
  if (!match) return null;
  const metadata = match[1] ?? "";
  const payload = match[2] ?? "";
  if (metadata.split(";").some((part) => part.toLowerCase() === "base64")) {
    return Buffer.from(payload.replace(/\s+/g, ""), "base64");
  }
  return Buffer.from(decodeURIComponent(payload), "utf8");
}

function mimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

async function resolveInputSource(input) {
  if (
    Buffer.isBuffer(input) ||
    input instanceof Uint8Array ||
    input instanceof ArrayBuffer
  ) {
    const buffer = Buffer.from(input);
    return {
      buffer,
      text: `data:application/octet-stream;base64,${buffer.toString("base64")}`,
    };
  }

  const rawInput = input ?? (await readStdinText());
  const trimmed = String(rawInput).trim();
  if (!trimmed) {
    throw new Error(
      "Provide --input as an image path, data URI, base64 string, @text-file, or stdin text",
    );
  }

  if (trimmed.startsWith("@")) {
    const text = await readFile(path.resolve(trimmed.slice(1)), "utf8");
    const dataUriBuffer = decodeDataUri(text);
    if (dataUriBuffer) {
      return { buffer: dataUriBuffer, text: text.trim() };
    }
    const sourceText = text.replace(/\s+/g, "");
    return { buffer: Buffer.from(sourceText, "base64"), text: sourceText };
  }

  const dataUriBuffer = decodeDataUri(trimmed);
  if (dataUriBuffer) {
    return { buffer: dataUriBuffer, text: trimmed };
  }

  try {
    const resolved = path.resolve(trimmed);
    const buffer = await readFile(resolved);
    return {
      buffer,
      text: `data:${mimeFromPath(resolved)};base64,${buffer.toString("base64")}`,
    };
  } catch {
    const sourceText = trimmed.replace(/\s+/g, "");
    return { buffer: Buffer.from(sourceText, "base64"), text: sourceText };
  }
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blendOver(background, foreground, alpha) {
  if (alpha >= 255) return foreground;
  if (alpha <= 0) return background;
  return {
    r: clampByte((foreground.r * alpha + background.r * (255 - alpha)) / 255),
    g: clampByte((foreground.g * alpha + background.g * (255 - alpha)) / 255),
    b: clampByte((foreground.b * alpha + background.b * (255 - alpha)) / 255),
  };
}

function buildGlyphMap(options) {
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

function pickGlyph(glyphs, sourceText, cellIndex) {
  for (let offset = 0; offset < sourceText.length; offset += 1) {
    const char = sourceText[(cellIndex + offset) % sourceText.length] ?? "?";
    const glyph = glyphs.get(char);
    if (glyph) return glyph;
  }
  return glyphs.get("?") ?? [...glyphs.values()][0];
}

function stampGlyph(output, outputWidth, glyph, left, top, color) {
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

async function writeTextFile(filePath, text) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, text);
}

export async function render(options) {
  options = {
    input: null,
    output: path.resolve(DEFAULT_OUTPUT),
    sourceDataUriOutput: null,
    outputDataUri: null,
    size: 336,
    cellWidth: 8,
    cellHeight: 8,
    sourceScale: null,
    gridWidth: null,
    gridHeight: null,
    background: parseHexColor(DEFAULT_BACKGROUND),
    transparentGlyph: parseHexColor(DEFAULT_TRANSPARENT_GLYPH),
    transparentMode: "dim",
    alphaThreshold: 12,
    circle: false,
    heart: false,
    palette: true,
    ...options,
  };
  if (typeof options.background === "string")
    options.background = parseHexColor(options.background);
  if (typeof options.transparentGlyph === "string")
    options.transparentGlyph = parseHexColor(options.transparentGlyph);

  const inputSource = await resolveInputSource(options.input);
  const metadata = await sharp(inputSource.buffer).metadata();
  const isAnimatedGif = metadata.format === "gif" && (metadata.pages ?? 1) > 1;
  const pages = isAnimatedGif ? (metadata.pages ?? 1) : 1;
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = isAnimatedGif
    ? (metadata.pageHeight ?? metadata.height ?? 0)
    : (metadata.height ?? 0);
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Input image dimensions could not be read");
  }

  if (options.sourceDataUriOutput) {
    await writeTextFile(options.sourceDataUriOutput, inputSource.text);
  }

  const defaultGridWidth = options.sourceScale
    ? sourceWidth * options.sourceScale
    : Math.max(1, Math.round(options.size / options.cellWidth));
  const defaultGridHeight = options.sourceScale
    ? sourceHeight * options.sourceScale
    : Math.max(1, Math.round(options.size / options.cellHeight));
  const gridWidth = options.gridWidth ?? defaultGridWidth;
  const gridHeight = options.gridHeight ?? defaultGridHeight;
  const outputWidth = gridWidth * options.cellWidth;
  const outputHeight = gridHeight * options.cellHeight;
  const glyphs = buildGlyphMap(options);

  const { data: sourceData } = await sharp(
    inputSource.buffer,
    isAnimatedGif ? { pages: -1 } : {},
  )
    .ensureAlpha()
    .resize({
      width: gridWidth,
      height: gridHeight,
      fit: "fill",
      kernel: sharp.kernel.nearest,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const output = Buffer.alloc(outputWidth * outputHeight * pages * 4);
  for (let index = 0; index < output.length; index += 4) {
    output[index] = options.background.r;
    output[index + 1] = options.background.g;
    output[index + 2] = options.background.b;
    output[index + 3] = 255;
  }

  for (let page = 0; page < pages; page += 1) {
    const sourcePageOffset = page * gridWidth * gridHeight * 4;
    const outputPageOffset = page * outputWidth * outputHeight * 4;
    for (let y = 0; y < gridHeight; y += 1) {
      for (let x = 0; x < gridWidth; x += 1) {
        const sourceIndex = sourcePageOffset + (y * gridWidth + x) * 4;
        const alpha = sourceData[sourceIndex + 3] ?? 0;
        if (
          alpha < options.alphaThreshold &&
          options.transparentMode === "skip"
        )
          continue;
        const color =
          alpha < options.alphaThreshold
            ? options.transparentGlyph
            : blendOver(
                options.background,
                {
                  r: sourceData[sourceIndex] ?? 0,
                  g: sourceData[sourceIndex + 1] ?? 0,
                  b: sourceData[sourceIndex + 2] ?? 0,
                },
                alpha,
              );
        const glyph = pickGlyph(glyphs, inputSource.text, y * gridWidth + x);
        stampGlyph(
          output.subarray(outputPageOffset),
          outputWidth,
          glyph,
          x * options.cellWidth,
          y * options.cellHeight,
          color,
        );
      }
    }
  }

  if (options.circle || options.heart) {
    const cx = (outputWidth - 1) / 2;
    const cy = (outputHeight - 1) / 2;
    const radius = Math.min(outputWidth, outputHeight) / 2;
    const radiusSq = radius * radius;
    for (let page = 0; page < pages; page += 1) {
      const outputPageOffset = page * outputWidth * outputHeight * 4;
      for (let y = 0; y < outputHeight; y += 1) {
        for (let x = 0; x < outputWidth; x += 1) {
          let inside;
          if (options.heart) {
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

  let rendered;
  let mimeType;

  if (isAnimatedGif) {
    const tempDir = await mkdtemp(path.join(tmpdir(), "blockscript-gif-"));
    try {
      const args = [];
      // sharp reports GIF delays in milliseconds; ImageMagick -delay expects centiseconds.
      const delays = metadata.delay?.length
        ? metadata.delay
        : Array.from({ length: pages }, () => 100);
      for (let page = 0; page < pages; page += 1) {
        const framePath = path.join(
          tempDir,
          `frame-${String(page).padStart(4, "0")}.png`,
        );
        const frame = output.subarray(
          page * outputWidth * outputHeight * 4,
          (page + 1) * outputWidth * outputHeight * 4,
        );
        const framePng = await sharp(frame, {
          raw: { width: outputWidth, height: outputHeight, channels: 4 },
        })
          .png({ palette: true, effort: 10, compressionLevel: 9 })
          .toBuffer();
        await writeFile(framePath, framePng);
        args.push(
          "-delay",
          String(
            Math.max(1, Math.round((delays[page] ?? delays[0] ?? 100) / 10)),
          ),
          framePath,
        );
      }
      const gifOutput = options.output || path.join(tempDir, "output.gif");
      args.push("-loop", String(metadata.loop ?? 0), gifOutput);
      await execFileAsync("magick", args);
      rendered = await readOutputFile(gifOutput);
      mimeType = "image/gif";
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  } else {
    rendered = await sharp(output, {
      raw: {
        width: outputWidth,
        height: outputHeight,
        channels: 4,
      },
    })
      .png({ palette: options.palette, effort: 10, compressionLevel: 9 })
      .toBuffer();
    mimeType = "image/png";
    if (options.output) await writeFile(options.output, rendered);
  }
  if (options.outputDataUri) {
    await writeTextFile(
      options.outputDataUri,
      `data:${mimeType};base64,${rendered.toString("base64")}`,
    );
  }

  console.log(`Source: ${sourceWidth}x${sourceHeight}`);
  console.log(`Grid: ${gridWidth}x${gridHeight} glyphs`);
  console.log(
    `Wrote ${options.output} (${outputWidth}x${outputHeight}, ${rendered.length} bytes)`,
  );

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

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await render(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
