import type { APIContext } from "astro";
import stringify from "canonical-json";
import { bech32 } from "@scure/base";
import { fetchEthscription, fetchEthscriptionContent } from "@/lib/fetch";

const idPattern = /^(\d+|0x[a-fA-F0-9]{64})$/;

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

  const cellWidth = positiveInt(url.searchParams.get("cellWidth"), 8, 64);
  const cellHeight = positiveInt(url.searchParams.get("cellHeight"), 8, 64);
  const requestedSize = positiveInt(url.searchParams.get("size"), 336);
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
        "#05000B",
      ),
      transparentGlyph: colorParam(
        url.searchParams.get("transparentGlyph") ?? url.searchParams.get("tg"),
        "#26235D",
      ),
      transparentMode:
        (url.searchParams.get("transparentMode") ??
          url.searchParams.get("tm")) === "skip"
          ? "skip"
          : "dim",
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
