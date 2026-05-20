import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { decodeHbs, HBS_METADATA_TRAITS_KEY } from "../src/lib/hbs";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const input = process.argv[2];
const output = process.argv[3];
const scale = process.argv[4] ? Number.parseInt(process.argv[4], 10) : 2;

if (!input || !output) {
  console.error(
    "Usage: bun scripts/upscale-png.ts <input.png> <output.png> [scale]",
  );
  process.exit(1);
}

if (!Number.isFinite(scale) || scale <= 0) {
  console.error("Scale must be a positive integer");
  process.exit(1);
}

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

function makePngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function readTraitsTextChunk(data: Buffer) {
  const separator = data.indexOf(0);

  if (separator === -1) {
    return null;
  }

  const keyword = data.subarray(0, separator).toString("latin1");

  if (keyword !== HBS_METADATA_TRAITS_KEY) {
    return null;
  }

  return data.subarray(separator + 1).toString("latin1");
}

function readTraitsInternationalTextChunk(data: Buffer) {
  const keywordEnd = data.indexOf(0);

  if (keywordEnd === -1) {
    return null;
  }

  const keyword = data.subarray(0, keywordEnd).toString("latin1");

  if (keyword !== HBS_METADATA_TRAITS_KEY) {
    return null;
  }

  const compressionFlagOffset = keywordEnd + 1;
  const compressionMethodOffset = compressionFlagOffset + 1;
  const languageTagOffset = compressionMethodOffset + 1;

  if (languageTagOffset > data.length) {
    return null;
  }

  if (data[compressionFlagOffset] !== 0) {
    return null;
  }

  const languageTagEnd = data.indexOf(0, languageTagOffset);

  if (languageTagEnd === -1) {
    return null;
  }

  const translatedKeywordEnd = data.indexOf(0, languageTagEnd + 1);

  if (translatedKeywordEnd === -1) {
    return null;
  }

  return data.subarray(translatedKeywordEnd + 1).toString("utf8");
}

function extractTraitsChunk(png: Buffer) {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return null;
  }

  let offset = 8;
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);

    if (type === "tEXt" || type === "iTXt") {
      const traits =
        type === "iTXt"
          ? readTraitsInternationalTextChunk(data)
          : readTraitsTextChunk(data);

      if (traits !== null) {
        decodeHbs(traits);
        return makePngChunk(type, data);
      }
    }

    offset += 12 + length;

    if (type === "IEND") {
      break;
    }
  }

  return null;
}

function addChunkBeforeIend(png: Buffer, chunk: Buffer | null) {
  if (!chunk || !png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return png;
  }

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

const metadata = await sharp(input).metadata();

if (metadata.format !== "png") {
  console.error("Only PNG input is supported");
  process.exit(1);
}

const width = metadata.width ?? 0;
const height = metadata.height ?? 0;

if (width <= 0 || height <= 0) {
  console.error("Could not read PNG dimensions");
  process.exit(1);
}

const inputBytes = await readFile(input);
const traitsChunk = extractTraitsChunk(inputBytes);
const upscaled = await sharp(input)
  .resize({
    width: width * scale,
    height: height * scale,
    kernel: sharp.kernel.nearest,
  })
  .png({ palette: true, effort: 10, compressionLevel: 9 })
  .toBuffer();

await writeFile(output, addChunkBeforeIend(upscaled, traitsChunk));

console.log({
  input,
  output,
  scale,
  width,
  height,
  outputWidth: width * scale,
  outputHeight: height * scale,
  traitsMetadata: traitsChunk !== null,
});
