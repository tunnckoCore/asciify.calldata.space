import type { APIContext } from "astro";
import stringify from "canonical-json";
import {
  DEFAULT_OPTIONS,
  detectInputFormat,
  encodeHbsText,
  renderBlockscriptImage,
} from "@/lib/blockscript-image";
import { fetchEthscription, fetchEthscriptionContent } from "@/lib/fetch";

const idPattern = /^(\d+|0x[a-fA-F0-9]{64})$/;

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
