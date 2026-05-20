import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { DEFAULT_OPTIONS } from "@/lib/blockscript-image";
import { HIGHSCRIPT } from "@/lib/glyphs-highscript";
import { decodeHbs } from "@/lib/hbs";
import { PNG_SIGNATURE } from "@/lib/utils";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: bun scripts/decode-hbs-image.ts <image.png>");
  process.exit(1);
}

const input = await readFile(inputPath);

if (!input.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
  console.error("Only PNG input is supported");
  process.exit(1);
}

const glyphs = new Map<string, string>();

for (const [char, rows] of Object.entries(HIGHSCRIPT)) {
  const key = rows.join("");

  if (!glyphs.has(key)) {
    glyphs.set(key, char);
  }
}

function isInk(r: number, g: number, b: number, a: number) {
  return a >= 16 && r + g + b > 20;
}

type DecodeConfig = {
  cell: number;
  size: number;
  gap: number;
  glyphSize: number;
  cellSize: number;
  gridWidth: number;
  gridHeight: number;
};

function makeConfig(
  width: number,
  height: number,
  cell: number,
  size: number,
  gap: number,
): DecodeConfig | null {
  const glyphSize = Math.max(1, Math.ceil((cell - 1) * size));
  const cellSize = glyphSize + gap;
  const gridWidth = Math.floor((width + gap) / cellSize);
  const gridHeight = Math.floor((height + gap) / cellSize);

  if (gridWidth <= 0 || gridHeight <= 0) {
    return null;
  }

  if ((width + gap) % cellSize !== 0) {
    return null;
  }

  if ((height + gap) % cellSize !== 0) {
    return null;
  }

  return { cell, size, gap, glyphSize, cellSize, gridWidth, gridHeight };
}

function getConfigs(width: number, height: number) {
  const configs: DecodeConfig[] = [];
  const cells = [DEFAULT_OPTIONS.cell, 6, 7, 8, 9, 10, 11, 12, 14, 16];
  const sizes = [DEFAULT_OPTIONS.size, 0.5, 1, 1.25, 1.5, 2, 3, 4];
  const gaps = [DEFAULT_OPTIONS.gap, 0, 1, 2, 3, 4, 5, 6];

  for (const cell of cells) {
    for (const size of sizes) {
      for (const gap of gaps) {
        const config = makeConfig(width, height, cell, size, gap);

        if (config) {
          configs.push(config);
        }
      }
    }
  }

  return configs;
}

function decodeTextFromPixels(
  data: Buffer,
  width: number,
  config: DecodeConfig,
) {
  let text = "";

  for (let y = 0; y < config.gridHeight; y += 1) {
    for (let x = 0; x < config.gridWidth; x += 1) {
      let key = "";

      for (let glyphY = 0; glyphY < 7; glyphY += 1) {
        const startY = Math.floor((glyphY * config.glyphSize) / 7);
        const endY = Math.max(
          startY + 1,
          Math.floor(((glyphY + 1) * config.glyphSize) / 7),
        );

        for (let glyphX = 0; glyphX < 7; glyphX += 1) {
          const startX = Math.floor((glyphX * config.glyphSize) / 7);
          const endX = Math.max(
            startX + 1,
            Math.floor(((glyphX + 1) * config.glyphSize) / 7),
          );
          let ink = false;

          for (let sampleY = startY; sampleY < endY; sampleY += 1) {
            for (let sampleX = startX; sampleX < endX; sampleX += 1) {
              const index =
                ((y * config.cellSize + sampleY) * width +
                  x * config.cellSize +
                  sampleX) *
                4;

              if (
                isInk(
                  data[index],
                  data[index + 1],
                  data[index + 2],
                  data[index + 3],
                )
              ) {
                ink = true;
              }
            }
          }

          key += ink ? "1" : "0";
        }
      }

      text += glyphs.get(key) ?? " ";
    }
  }

  return text;
}

const image = sharp(input).ensureAlpha();
const metadata = await image.metadata();
const width = metadata.width ?? 0;
const height = metadata.height ?? 0;
const { data } = await image.raw().toBuffer({ resolveWithObject: true });

for (const config of getConfigs(width, height)) {
  const text = decodeTextFromPixels(data, width, config);
  const decoded = decodeHbs(text);

  if (decoded) {
    console.log(JSON.stringify(decoded, null, 2));
    process.exit(0);
  }
}

console.error("No HBS frame found");
process.exit(1);
