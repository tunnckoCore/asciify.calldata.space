import type { APIRoute } from "astro";
import { getCacheHeaders } from "@/lib/cache";
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

  const finalHtml = `<html data-enum="${htmlParts.data.transaction_hash}"><head>${htmlParts.data.fontPreload}<style>${htmlParts.data.css}</style></head><body>${htmlParts.data.asciiartDiv}</body></html>`;

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
