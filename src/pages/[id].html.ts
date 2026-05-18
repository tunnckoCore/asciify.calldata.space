import type { APIRoute } from "astro";
import { getCacheHeaders } from "@/lib/cache";
import { buildCssFontFace } from "@/lib/styles";
import { getFont } from "@/lib/url_getters";
import { buildHtmlParts } from "@/lib/utils";

export const GET: APIRoute = async ({ params, url }) => {
  const { id } = params;

  if (!id || (!/^\d+$/.test(id) && !/^0x[a-fA-F0-9]{64}$/.test(id))) {
    return new Response("Invalid ID", { status: 400 });
  }

  const htmlParts = await buildHtmlParts(id, url);
  if (!htmlParts.ok) {
    return new Response(htmlParts.error, { status: htmlParts.status });
  }

  const font = getFont(url);
  const fontFaceStrs = font
    ? `<style
      id="style-${font}">${buildCssFontFace(url)}</style>`
    : "";

  const finalHtml = `<html><head>${htmlParts.data.fontPreload}<title>Asciify Art - Ethscription #${htmlParts.data.ethscription_number.toLocaleString()}</title>${fontFaceStrs}<style>${htmlParts.data.css}</style></head><body>${htmlParts.data.asciiartDiv}</body></html>`;

  return new Response(finalHtml, {
    status: 200,
    headers: {
      ...getCacheHeaders(),
      "x-ethscription-id": id,
      "content-type": "text/html; charset=utf-8",
      "content-length": String(finalHtml.length),
    },
  });
};
