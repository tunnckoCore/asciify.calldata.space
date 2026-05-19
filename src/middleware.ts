import { defineMiddleware } from "astro:middleware";
import { getCacheHeaders } from "@/lib/cache";
import { htmlRoute } from "@/lib/routes/html";
import { imageRoute } from "@/lib/routes/image";
import { svgRoute } from "@/lib/routes/svg";

async function digest(value: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function etagMatches(ifNoneMatch: string | null, etag: string) {
  if (!ifNoneMatch) return false;
  return ifNoneMatch
    .split(",")
    .map((part) => part.trim())
    .some((part) => part === etag || part === "*");
}

function shouldProcess(response: Response) {
  if (!response.body) return false;
  if (response.status < 200 || response.status >= 300) return false;
  const contentType = response.headers.get("content-type") ?? "";
  return /^(image\/|text\/|application\/json|application\/xml|application\/javascript)/.test(
    contentType,
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const formattedRoute = url.pathname.match(/^\/([^/.]+)\.(png|gif|html|svg)$/);
  const response = formattedRoute
    ? formattedRoute[2] === "html"
      ? await htmlRoute({
          ...context,
          params: { ...context.params, id: formattedRoute[1] },
        })
      : formattedRoute[2] === "svg"
        ? await svgRoute({
            ...context,
            params: { ...context.params, id: formattedRoute[1] },
          })
        : await imageRoute(
            {
              ...context,
              params: { ...context.params, id: formattedRoute[1] },
            },
            formattedRoute[2] as "png" | "gif",
          )
    : await next();
  const ifNoneMatch = request.headers.get("if-none-match");
  const cacheHeaders = getCacheHeaders();

  if (!shouldProcess(response)) {
    return response;
  }

  const body = await response.arrayBuffer();
  const etag = `"${await digest(body)}"`;
  const headers = new Headers(response.headers);
  headers.set("ETag", etag);
  for (const [key, value] of Object.entries(cacheHeaders)) {
    headers.set(key, value);
  }

  if (etagMatches(ifNoneMatch, etag)) {
    headers.delete("content-length");
    headers.delete("content-type");
    return new Response(null, {
      status: 304,
      headers,
    });
  }

  headers.set("content-length", String(body.byteLength));
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
