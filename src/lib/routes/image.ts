import type { APIContext } from "astro";
import {
  DEFAULT_OPTIONS,
  detectInputFormat,
  renderBlockscriptImage,
} from "@/lib/blockscript-image";
import { fetchEthscription, fetchEthscriptionContent } from "@/lib/fetch";
import { encodeHbs } from "@/lib/hbs";

// moonbird attrs
// const metadataJson = stringify({
//   ...(await fetchEthscription(id)).contentBody.result,
//   // attributes: [
//   //   { trait_type: "Eyewear", value: "Rose-Colored Glasses" },
//   //   { trait_type: "Outerwear", value: "Diamond Necklace" },
//   //   { trait_type: "Headwear", value: "Fire" },
//   //   { trait_type: "Body", value: "Crescent" },
//   //   { trait_type: "Feathers", value: "Brown" },
//   //   { trait_type: "Background", value: "Purple" },
//   //   { trait_type: "Beak", value: "Short - Orange" },
//   // ],
// });
//
// Comrade 8711 - 6169177 - 0xa51759f47d949e755de3c30964e0fb14d7b638a12354fd40fc62eba0313e2653
const attr = [
  {
    trait_type: "Background",
    value: "Classic Punks BG",
  },
  {
    trait_type: "Type",
    value: "Human Melanin Level Goth",
  },
  {
    trait_type: "Cloths",
    value: "Vampire Attack Attire",
  },
  {
    trait_type: "Head",
    value: "Blockthink Receiver",
  },
  {
    trait_type: "Eyes",
    value: "Visoor Pink",
  },
  {
    trait_type: "Classification",
    value: "Comrade",
  },
  {
    trait_type: "Affiliation",
    value: "Corrupted",
  },
  {
    trait_type: "Rank",
    value: "4300",
  },
];

const idPattern = /^(\d+|0x[a-fA-F0-9]{64})$/;
const textModes = ["highscript", "lowscript", "monospace"] as const;

function textModeParam(value: string | null) {
  return textModes.find((mode) => mode === value) ?? DEFAULT_OPTIONS.textMode;
}

function positiveNumber(
  value: string | null | undefined,
  fallback: number,
  max = 4096,
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export async function imageRoute(ctx: APIContext, fmt: "png" | "gif") {
  const { params } = ctx;
  const { id } = params;

  if (!id || !idPattern.test(id)) {
    return new Response(
      "Invalid Ethscription ID: should be number or transaction hash",
      { status: 400 },
    );
  }

  const res = await fetchEthscriptionContent(id);
  const contentBytes = new Uint8Array(res.contentBody);
  const actualInputSourceFormat = detectInputFormat(contentBytes);

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

  let result: Awaited<ReturnType<typeof renderBlockscriptImage>>;

  try {
    result = await renderBlockscriptImage(res.contentBody, {
      text: encodeHbs((await fetchEthscription(id)).contentBody.result),
      attributes: attr,
      cell: positiveNumber(
        ctx.url.searchParams.get("cell"),
        DEFAULT_OPTIONS.cell,
        64,
      ),
      scale: positiveNumber(
        ctx.url.searchParams.get("scale"),
        DEFAULT_OPTIONS.scale,
        16,
      ),
      size: positiveNumber(
        ctx.url.searchParams.get("glyph"),
        DEFAULT_OPTIONS.size,
        16,
      ),
      gap: positiveNumber(
        ctx.url.searchParams.get("gap"),
        DEFAULT_OPTIONS.gap,
        64,
      ),
      outputFormat,
      textMode: textModeParam(ctx.url.searchParams.get("mode")),
      background:
        ctx.url.searchParams.get("bg") ??
        ctx.url.searchParams.get("background") ??
        DEFAULT_OPTIONS.background,
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

  return new Response(new Uint8Array(result.image), {
    status: 200,
    headers: {
      "content-type": result.mimeType,
      "x-ethscription-id": id,
      "x-blockscript-grid": `${result.gridWidth}x${result.gridHeight}`,
      "x-blockscript-size": `${result.outputWidth}x${result.outputHeight}`,
    },
  });
}
