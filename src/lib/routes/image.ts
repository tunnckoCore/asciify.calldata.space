import type { APIContext } from "astro";
import stringify from "canonical-json";
import { bech32 } from "@scure/base";
import { fetchEthscription, fetchEthscriptionContent } from "@/lib/fetch";

const idPattern = /^(\d+|0x[a-fA-F0-9]{64})$/;

// # compact
// cell=8&size=304  - small  (11.5 KB)
// cell=8&size=336  - medium (13.5 KB)
// cell=8&size=360  - big    (15.3 KB)
// cell=8&size=376  - bigger

// # balanced
// cell=9&size=342  - small  (12.6 KB)
// cell=9&size=380  - medium (14.8 KB)
// cell=9&size=405  - big    (16.7 KB)

// # detail
// cell=10&size=380 - small  (13.1 KB)
// cell=10&size=420 - medium (15.7 KB)
// cell=10&size=450 - big    (17.7 KB)

const DEFAULT_CELL_SIZE = 9;
const DEFAULT_RESO_SIZE = 342;

function positiveInt(value: string | null, fallback: number, max = 4096) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function colorParam(value: string | null, fallback: string) {
  if (!value) return fallback;
  const clean = value.trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean) ? `#${clean}` : value;
}

function encodeHbsText(json: string) {
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

function detectImageFormat(bytes: Uint8Array) {
  if (looksLikeSvg(bytes)) return "svg";

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return pngHasChunk(bytes, "acTL") ? "apng" : "png";
  }

  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "gif";
  }

  if (
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9
  ) {
    return "jpeg";
  }

  return null;
}

export async function imageRoute(ctx: APIContext, fmt: "png" | "gif") {
  const { params, url } = ctx;
  const { id } = params;

  if (!id || !idPattern.test(id)) {
    return new Response("Invalid ID", { status: 400 });
  }

  const res = await fetchEthscriptionContent(id);

  const contentBytes = new Uint8Array(res.contentBody);
  const actualInputSourceFormat = detectImageFormat(contentBytes);

  if (!actualInputSourceFormat) {
    return new Response("Not a supported image", { status: 415 });
  }

  const canonicalFormat = actualInputSourceFormat === "gif" ? "gif" : "png";
  const outputFormat =
    actualInputSourceFormat === "gif" || actualInputSourceFormat === "apng"
      ? "gif"
      : "png";
  if (fmt !== canonicalFormat) {
    return ctx.redirect(`/${id}.${canonicalFormat}`);
  }

  const cWidth = url.searchParams.get("cell") ?? url.searchParams.get("cellWidth")
  const cHeight = url.searchParams.get("cell") ?? url.searchParams.get("cellHeight")
  const cellWidth = positiveInt(cWidth, DEFAULT_CELL_SIZE, 64);
  const cellHeight = positiveInt(cHeight, DEFAULT_CELL_SIZE, 64);
  const requestedSize = positiveInt(url.searchParams.get("size"), DEFAULT_RESO_SIZE);
  const defaultGridWidth = Math.max(1, Math.floor(requestedSize / cellWidth));
  const defaultGridHeight = Math.max(1, Math.floor(requestedSize / cellHeight));
  const grid = url.searchParams.get("grid");
  const gridWidth = positiveInt(
    grid ?? url.searchParams.get("gridWidth"),
    defaultGridWidth,
    512,
  );
  const gridHeight = positiveInt(
    grid ?? url.searchParams.get("gridHeight"),
    defaultGridHeight,
    512,
  );

  const mergedQs = new URLSearchParams(url.searchParams);
  mergedQs.set("with", "ethscription_number,content_uri");

  const { renderBlockscriptImage } = await import("../blockscript.ts");
  let result: Awaited<ReturnType<typeof renderBlockscriptImage>>;

  try {
    const metadataJson = stringify({
      ...(await fetchEthscription(id)).contentBody.result,
      attributes: [
        { trait_type: "Eyewear", value: "Rose-Colored Glasses" },
        { trait_type: "Outerwear", value: "Diamond Necklace" },
        { trait_type: "Headwear", value: "Fire" },
        { trait_type: "Body", value: "Crescent" },
        { trait_type: "Feathers", value: "Brown" },
        { trait_type: "Background", value: "Purple" },
        { trait_type: "Beak", value: "Short - Orange" },
      ],
    });

    result = await renderBlockscriptImage(res.contentBody, {
      text: encodeHbsText(metadataJson),
      cellWidth,
      cellHeight,
      gridWidth,
      gridHeight,
      background: colorParam(
        url.searchParams.get("background") ?? url.searchParams.get("bg"),
        "#000",
      ),
      transparentGlyph: colorParam(
        url.searchParams.get("transparentGlyph") ?? url.searchParams.get("tg"),
        "#fff",
      ),
      transparentMode:
        (url.searchParams.get("transparentMode") ??
          url.searchParams.get("tm")) !== "skip"
          ? "dim"
          : "skip",
      alphaThreshold: positiveInt(
        url.searchParams.get("alphaThreshold"),
        12,
        255,
      ),

      circle: url.searchParams.has("circle"),
      heart: url.searchParams.has("heart"),
      palette: url.searchParams.has("palette"),
      outputFormat,
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.stack || error.message : String(error),
      {
        status: 500,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-ethscription-id": id,
          "x-asciify-route": `image/${fmt}`,
        },
      },
    );
  }

  const body = new Uint8Array(result.image ?? result.png);

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": result.mimeType,
      "x-ethscription-id": id,
      "x-blockscript-grid": `${result.gridWidth}x${result.gridHeight}`,
      "x-blockscript-size": `${result.outputWidth}x${result.outputHeight}`,
    },
  });
}
