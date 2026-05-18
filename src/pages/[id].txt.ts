import type { APIRoute } from "astro";
import { getCacheHeaders } from "@/lib/cache";
import { buildCssFontFace } from "@/lib/styles";
import { getFont } from "@/lib/url_getters";
import { buildHtmlParts } from "@/lib/utils";

export function bytesToBase64(bytes: Uint8Array): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];

    const bitmap = (b1 << 16) | (b2 << 8) | b3;

    result += chars[(bitmap >> 18) & 63];
    result += chars[(bitmap >> 12) & 63];
    result += i + 1 < bytes.length ? chars[(bitmap >> 6) & 63] : "=";
    result += i + 2 < bytes.length ? chars[bitmap & 63] : "=";
  }

  return result;
}

export const GET: APIRoute = async ({ params, url }) => {
  const { id } = params;

  if (!id || (!/^\d+$/.test(id) && !/^0x[a-fA-F0-9]{64}$/.test(id))) {
    return new Response("Invalid ID", { status: 400 });
  }

  const htmlParts = await buildHtmlParts(id, url);
  if (!htmlParts.ok) {
    return new Response(htmlParts.error, { status: htmlParts.status });
  }

  // TODO: Use Boxd as html-to-image engine with Playwright
  const font = getFont(url);
  const fontFaceStrs = font
    ? `<style
      id="style-${font}">${buildCssFontFace(url)}</style>`
    : "";

  const finalHtml = `<html><head>${htmlParts.data.fontPreload}<title>Asciify Art - Ethscription #${htmlParts.data.ethscription_number.toLocaleString()}</title>${fontFaceStrs}<style>${htmlParts.data.css}</style></head><body>${htmlParts.data.asciiartDiv}</body></html>`;
  const htmlBytes = new TextEncoder().encode(finalHtml);
  const htmlBase64 = bytesToBase64(htmlBytes)

  return new Response(`data:text/html;base64,${htmlBase64}`,
    {
      status: 200,
      headers: {
        ...getCacheHeaders(),
        "x-ethscription-id": id,
        "content-type": "text/plain",
        "content-length": String(htmlBase64.length),
      },
    },
  );
};
