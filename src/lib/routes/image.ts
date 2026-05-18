import type { APIContext } from "astro";
import { fetchEthscriptionContent } from "@/lib/fetch";

const idPattern = /^(\d+|0x[a-fA-F0-9]{64})$/;

function positiveInt(value: string | null, fallback: number, max = 4096) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function imageRoute(ctx: APIContext, fmt: "png" | "gif") {
  const { params, url } = ctx;
  const { id } = params;

  if (!id || !idPattern.test(id)) {
    return new Response("Invalid ID", { status: 400 });
  }

  const content = await fetchEthscriptionContent(id);

  if (!content.contentType?.startsWith("image/")) {
    return new Response("Not an image", { status: 415 });
  }
  if (content.contentType.includes("gif") && fmt !== "gif") {
    return ctx.redirect(`/${id}.gif`);
  }
  if (content.contentType.includes("png") && fmt !== "png") {
    return ctx.redirect(`/${id}.png`);
  }

  const cellWidth = positiveInt(url.searchParams.get("cellWidth"), 8, 64);
  const cellHeight = positiveInt(url.searchParams.get("cellHeight"), 8, 64);
  const requestedSize = positiveInt(url.searchParams.get("size"), 336);
  const defaultGridWidth = Math.max(1, Math.floor(requestedSize / cellWidth));
  const defaultGridHeight = Math.max(1, Math.floor(requestedSize / cellHeight));
  const gridWidth = positiveInt(url.searchParams.get("gridWidth"), defaultGridWidth, 512);
  const gridHeight = positiveInt(url.searchParams.get("gridHeight"), defaultGridHeight, 512);

  const { render } = await import("../../../blockscript-ascii-standalone.mjs");
  const result = await render({
    input: Buffer.from(content.contentBody),
    output: null,
    cellWidth,
    cellHeight,
    gridWidth,
    gridHeight,
    background: url.searchParams.get("background") ?? "#05000B",
    transparentGlyph: url.searchParams.get("transparentGlyph") ?? "#26235D",
    transparentMode: url.searchParams.get("transparentMode") === "skip" ? "skip" : "dim",
    alphaThreshold: positiveInt(url.searchParams.get("alphaThreshold"), 12, 255),
    circle: url.searchParams.has("circle"),
    heart: url.searchParams.has("heart"),
    palette: url.searchParams.has("palette"),
  });

  const body = new Uint8Array(result.image ?? result.png);

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": result.mimeType ?? "image/png",
      "x-ethscription-id": id,
      "x-blockscript-grid": `${result.gridWidth}x${result.gridHeight}`,
      "x-blockscript-size": `${result.outputWidth}x${result.outputHeight}`,
    },
  });
}
