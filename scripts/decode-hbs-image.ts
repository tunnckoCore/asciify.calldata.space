import { readFile } from "node:fs/promises";
import { bech32 } from "@scure/base";
import sharp from "sharp";
import { GLYPH_ROWS } from "../src/lib/blockscript";

const path = process.argv[2];
if (!path) {
  console.error("Usage: bun scripts/decode-hbs-image.ts <image.png|image.gif> [page]");
  process.exit(1);
}

const page = process.argv[3] ? Number.parseInt(process.argv[3], 10) : 0;
const candidates = new Map<string, string[]>();
for (const [char, rows] of Object.entries(GLYPH_ROWS)) {
  const key = rows.join("");
  const values = candidates.get(key) ?? [];
  values.push(char);
  candidates.set(key, values);
}

function chooseCandidate(values: string[] | undefined) {
  if (!values) return "�";
  return values.find((char) => char >= "a" && char <= "z") ?? values[0];
}

function isInk(r: number, g: number, b: number, a: number) {
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
  return decodeText(text, { path, source: "svg", textLength: text.length });
}

async function decodeText(text: string, info: Record<string, unknown>) {
  const match = text.match(/^(\d+)\.(hbs1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)/);
  console.log({ ...info, prefix: text.slice(0, 120) });

  if (!match) {
    console.log("No HBS bech32 frame found");
    process.exit(1);
  }

  const declaredLength = Number(match[1]);
  const encoded = match[2];
  const decoded = bech32.decode(encoded, false);
  if (decoded.prefix !== "hbs") {
    throw new Error(`Unexpected bech32 prefix: ${decoded.prefix}`);
  }
  const bytes = bech32.fromWords(decoded.words).subarray(0, declaredLength);
  const json = new TextDecoder().decode(bytes);
  console.log({ declaredLength, decodedBytes: bytes.length, checksum: "valid" });
  console.log(json);
  try {
    console.log(JSON.stringify(JSON.parse(json), null, 2));
  } catch {
    console.log("Decoded text is not complete JSON");
  }
}

if (path.endsWith(".svg")) {
  await decodeSvg(path);
  process.exit(0);
}

const metadata = await sharp(path, { page }).metadata();
const width = metadata.width ?? 0;
const height = metadata.pageHeight ?? metadata.height ?? 0;
const cellWidth = 8;
const cellHeight = 8;
const gridWidth = Math.floor(width / cellWidth);
const gridHeight = Math.floor(height / cellHeight);

const { data } = await sharp(path, { page })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

let text = "";
let unknown = 0;
for (let y = 0; y < gridHeight; y += 1) {
  for (let x = 0; x < gridWidth; x += 1) {
    let key = "";
    for (let glyphY = 0; glyphY < 7; glyphY += 1) {
      let row = "";
      for (let glyphX = 0; glyphX < 7; glyphX += 1) {
        const index =
          ((y * cellHeight + glyphY) * width + x * cellWidth + glyphX) * 4;
        row += isInk(data[index], data[index + 1], data[index + 2], data[index + 3])
          ? "1"
          : "0";
      }
      key += row;
    }
    const char = chooseCandidate(candidates.get(key));
    if (char === "�") unknown += 1;
    text += char;
  }
}

await decodeText(text, {
  path,
  page,
  source: "image",
  width,
  height,
  gridWidth,
  gridHeight,
  unknown,
});
