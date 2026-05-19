import type { APIContext } from "astro";
import stringify from "canonical-json";
import { bech32 } from "@scure/base";
import { fetchEthscription, fetchEthscriptionContent } from "@/lib/fetch";
import { renderBlockscriptSvg } from "../blockscript-svg";

const idPattern = /^(\d+|0x[a-fA-F0-9]{64})$/;

const DEFAULT_CELL_SIZE = 8;
const DEFAULT_RESO_SIZE = 376; // 360 368 376

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

export async function svgRoute(ctx: APIContext) {
  const { params, url } = ctx;
  const { id } = params;

  if (!id || !idPattern.test(id)) {
    return new Response("Invalid ID", { status: 400 });
  }

  const res = await fetchEthscriptionContent(id);
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

  try {
    const { content_uri, ...meta } = JSON.parse(
      stringify({
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
      }),
    );
    const metadataText = JSON.stringify({ ...meta, content_uri });

    const result = await renderBlockscriptSvg(res.contentBody, {
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
      fontUrl: url.searchParams.has("nohighscript") ?? url.searchParams.has("rawtext")
        ? null : (url.searchParams.get("fontUrl") ??
          "/ethscriptions/0x5296ef8b8fb4168b57a09813622f7bc8198a9456b57886e47e1129475ef88d4a/content")
        ,
      imageUrl:
        url.searchParams.get("imageUrl") ??
        url.searchParams.get("url") ??
        `/ethscriptions/${id}/content`,
      expandText: url.searchParams.has("expandText") || url.searchParams.has("expand"),
      text: encodeHbsText(metadataText),
    });

    return new Response(result.svg, {
      status: 200,
      headers: {
        "content-type": result.mimeType,
        "x-ethscription-id": id,
        "x-blockscript-grid": `${result.gridWidth}x${result.gridHeight}`,
        "x-blockscript-size": `${result.outputWidth}x${result.outputHeight}`,
      },
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.stack || error.message : String(error),
      {
        status: 500,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-ethscription-id": id,
          "x-asciify-route": "image/svg",
        },
      },
    );
  }
}
