import type { APIContext } from "astro";
import { buildHtmlParts } from "@/lib/utils";

const idPattern = /^(\d+|0x[a-fA-F0-9]{64})$/;

function bytesToBase64(bytes: Uint8Array): string {
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

export const htmlRoute = async ({ params, url }: APIContext) => {
  const { id } = params;

  if (!id || !idPattern.test(id)) {
    return new Response("Invalid ID", { status: 400 });
  }

  const htmlParts = await buildHtmlParts(id, url);
  if (!htmlParts.ok) {
    return new Response(htmlParts.error, { status: htmlParts.status });
  }

  const finalHtml = `<html data-enum="${htmlParts.data.transaction_hash}"><head>${htmlParts.data.fontPreload}<style>${htmlParts.data.css}</style></head><body>${htmlParts.data.asciiartDiv}</body></html>`;

  if (url.searchParams.has("datauri")) {
    const htmlBytes = new TextEncoder().encode(finalHtml);
    const htmlBase64 = bytesToBase64(htmlBytes);

    return new Response(`data:text/html;base64,${htmlBase64}`, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-ethscription-id": id,
      },
    });
  }

  return new Response(finalHtml, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-ethscription-id": id,
    },
  });
};
