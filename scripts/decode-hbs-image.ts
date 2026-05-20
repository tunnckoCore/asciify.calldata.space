import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { DEFAULT_OPTIONS } from "../src/lib/blockscript-image";
import { HIGHSCRIPT as GLYPHS } from "../src/lib/glyphs-highscript";
import { decodeHbs, encodeHbsPayload, HBS_PREFIX } from "../src/lib/hbs";

const path = process.argv[2];
if (!path) {
  console.error(
    "Usage: bun scripts/decode-hbs-image.ts <image.png|image.gif> [page]",
  );
  process.exit(1);
}

const page = process.argv[3] ? Number.parseInt(process.argv[3], 10) : 0;
const candidates = new Map<string, string[]>();
const candidateList: Array<{ key: string; char: string }> = [];

for (const [char, rows] of Object.entries(GLYPHS)) {
  const key = rows.join("");
  const values = candidates.get(key) ?? [];
  values.push(char);
  candidates.set(key, values);
  candidateList.push({ key, char });
}

function hammingDistance(a: string, b: string) {
  let distance = 0;

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      distance += 1;
    }
  }

  return distance;
}

function chooseCandidate(key: string) {
  const values = candidates.get(key);

  if (values) {
    return values[0];
  }

  let best = { char: "�", distance: Number.POSITIVE_INFINITY };

  for (const candidate of candidateList) {
    const distance = hammingDistance(key, candidate.key);

    if (distance < best.distance) {
      best = { char: candidate.char, distance };
    }
  }

  return best.distance <= 4 ? best.char : "�";
}

function isInk(r: number, g: number, b: number, a: number, alphaOnly: boolean) {
  if (alphaOnly) {
    return a >= 16;
  }

  return a >= 16 && r + g + b > 20;
}

async function decodeSvg(path: string) {
  const svg = await readFile(path, "utf8");
  const text = Array.from(
    svg.matchAll(/<(?:text|tspan|div)[^>]*>(.*?)<\/(?:text|tspan|div)>/gs),
  )
    .map((match) =>
      match[1]
        .replace(/<[^>]+>/g, "")
        .replaceAll("\n", "")
        .replaceAll("&quot;", '"')
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&apos;", "'"),
    )
    .join("");
  return decodeText(text);
}

const caseRepairKeys: Readonly<Record<string, string>> = {
  blockhash: "blockHash",
  blocknumber: "blockNumber",
  blocktimestamp: "blockTimestamp",
  contentsha: "contentSha",
  contenttype: "contentType",
  currentowner: "currentOwner",
  ethscriptionnumber: "ethscriptionNumber",
  gasprice: "gasPrice",
  gasused: "gasUsed",
  previousowner: "previousOwner",
  transactionfee: "transactionFee",
  transactionhash: "transactionHash",
  transactionindex: "transactionIndex",
  transactionvalue: "transactionValue",
};

function repairHbsKeyCase(text: string) {
  const start = text.indexOf(`${HBS_PREFIX}.`);

  if (start === -1) {
    return text;
  }

  const frame = text.slice(start);
  const parts = frame.split(".");
  const sha12 = parts[1];
  const lengthText = parts[2];

  if (!sha12 || !lengthText) {
    return text;
  }

  const expectedLength = Number.parseInt(lengthText, 10);
  if (!Number.isFinite(expectedLength) || expectedLength < 0) {
    return text;
  }

  const payloadStart = `${HBS_PREFIX}.${sha12}.${lengthText}.`.length;
  const payload = frame.slice(payloadStart, payloadStart + expectedLength);
  const decoded = decodeHbs(frame);

  if (!decoded) {
    return text;
  }

  const repairedPayload = encodeHbsPayload(
    Object.fromEntries(
      Object.entries(decoded.payload).map(([key, value]) => [
        caseRepairKeys[key] ?? key,
        value,
      ]),
    ),
  );

  if (repairedPayload.length !== payload.length) {
    return text;
  }

  return `${frame.slice(0, payloadStart)}${repairedPayload}${frame.slice(
    payloadStart + expectedLength,
  )}`;
}

async function decodeText(text: string) {
  const decoded = decodeHbs(text);
  const repaired = decoded?.valid ? decoded : decodeHbs(repairHbsKeyCase(text));

  if (!repaired) {
    console.log("No HBS frame found");
    process.exit(1);
  }

  console.log(JSON.stringify(repaired, null, 2));
}

if (path.endsWith(".svg")) {
  await decodeSvg(path);
  process.exit(0);
}

const metadata = await sharp(path, { page }).metadata();
const width = metadata.width ?? 0;
const height = metadata.pageHeight ?? metadata.height ?? 0;
const explicitCell = process.argv[4]
  ? Number.parseFloat(process.argv[4])
  : null;
const explicitSize = process.argv[5]
  ? Number.parseFloat(process.argv[5])
  : null;
const explicitGap = process.argv[6] ? Number.parseFloat(process.argv[6]) : null;

const { data } = await sharp(path, { page })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const alphaOnly = data.some((value, index) => index % 4 === 3 && value < 16);

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

  return { cell, size, gap, glyphSize, cellSize, gridWidth, gridHeight };
}

function configCandidates() {
  if (explicitCell && explicitSize && explicitGap !== null) {
    const config = makeConfig(explicitCell, explicitSize, explicitGap);
    return config ? [config] : [];
  }

  const configs: DecodeConfig[] = [];
  const cells = [DEFAULT_OPTIONS.cell, 6, 7, 8, 9, 10, 11, 12, 14, 16];
  const sizes = [DEFAULT_OPTIONS.size, 0.5, 1, 1.25, 1.5, 2, 3, 4];
  const gaps = [DEFAULT_OPTIONS.gap, 0, 1, 2, 3, 4, 5, 6];

  for (const cell of cells) {
    for (const size of sizes) {
      for (const gap of gaps) {
        const config = makeConfig(cell, size, gap);

        if (!config) {
          continue;
        }

        if ((width + gap) % config.cellSize !== 0) {
          continue;
        }

        configs.push(config);
      }
    }
  }

  return configs;
}

function decodeImageText(config: DecodeConfig) {
  let text = "";
  let unknown = 0;

  for (let y = 0; y < config.gridHeight; y += 1) {
    for (let x = 0; x < config.gridWidth; x += 1) {
      let key = "";

      for (let glyphY = 0; glyphY < 7; glyphY += 1) {
        let row = "";
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
                  alphaOnly,
                )
              ) {
                ink = true;
              }
            }
          }

          row += ink ? "1" : "0";
        }
        key += row;
      }

      const char = chooseCandidate(key);
      if (char === "�") {
        unknown += 1;
      }
      text += char;
    }
  }

  return { text, unknown };
}

let best: { config: DecodeConfig; text: string; unknown: number } | null = null;
for (const config of configCandidates()) {
  const result = decodeImageText(config);
  const decoded = decodeHbs(result.text);

  if (decoded) {
    await decodeText(result.text);
    process.exit(0);
  }

  if (!best || result.unknown < best.unknown) {
    best = { config, text: result.text, unknown: result.unknown };
  }
}

if (!best) {
  console.log({ path, page, source: "image", width, height });
  console.log("No viable highscript decode configuration found");
  process.exit(1);
}

await decodeText(best.text);
