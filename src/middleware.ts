import { defineMiddleware } from "astro:middleware";
import { CACHE_TTL_SECONDS, getCacheHeaders, getCacheKey } from "@/lib/cache";
import { digest } from "@/lib/utils";

const DEV =
  process.env.DEV == null ? import.meta.env.DEV : process.env.DEV === "true";

type CachedResponse = {
  body: ArrayBuffer;
  etag: string;
  expiresAt: number;
  headers: [string, string][];
  status: number;
  statusText: string;
};

const responseCache = new Map<string, CachedResponse>();

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

function wantsSvgShell(request: Request, ext: string | undefined) {
  if (ext !== "svg") return false;
  const destination = request.headers.get("sec-fetch-dest");
  if (destination)
    return destination === "iframe" || destination === "document";
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function svgShell(svg: string, title: string) {
  return `<!doctype html><html style="height: 100%;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, minimum-scale=0.1"><title>${title}</title><style>body{margin:0;height:100%;background-color:rgb(14,14,14);display:grid;place-items:center;overflow:hidden}svg{display:block;-webkit-user-select:none;background-color:hsl(0,0%,90%);transition:background-color 300ms;max-width:100%;max-height:100%}</style></head><body>${svg}</body></html>`;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const formattedRoute = url.pathname.match(/^\/([^/.]+)\.(png|gif|html|svg)$/);
  const shouldShellSvg = wantsSvgShell(request, formattedRoute?.[2]);
  const ifNoneMatch = request.headers.get("if-none-match");
  const cacheHeaders = getCacheHeaders();
  const cacheKey = getCacheKey(
    `${request.url}${shouldShellSvg ? "#svg-shell" : ""}`,
    "response",
  );
  const cached = DEV ? undefined : responseCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    const headers = new Headers(cached.headers);
    for (const [key, value] of Object.entries(cacheHeaders)) {
      headers.set(key, value);
    }

    if (etagMatches(ifNoneMatch, cached.etag)) {
      headers.delete("content-length");
      headers.delete("content-type");
      return new Response(null, { status: 304, headers });
    }

    headers.set("content-length", String(cached.body.byteLength));
    return new Response(cached.body.slice(0), {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    });
  }

  if (cached) responseCache.delete(cacheKey);

  let response: Response;

  if (!formattedRoute) {
    response = await next();
  } else if (formattedRoute[2] === "html") {
    const { htmlRoute } = await import("@/lib/routes/html");

    response = await htmlRoute({
      ...context,
      params: { ...context.params, id: formattedRoute[1] },
    });
  } else if (formattedRoute[2] === "svg") {
    const { svgRoute } = await import("@/lib/routes/svg");

    response = await svgRoute({
      ...context,
      params: { ...context.params, id: formattedRoute[1] },
    });
  } else {
    const { imageRoute } = await import("@/lib/routes/image");

    response = await imageRoute(
      {
        ...context,
        params: { ...context.params, id: formattedRoute[1] },
      },
      formattedRoute[2] as "png" | "gif",
    );
  }

  if (!shouldProcess(response)) {
    return response;
  }

  let body = await response.arrayBuffer();
  const headers = new Headers(response.headers);

  if (
    shouldShellSvg &&
    headers.get("content-type")?.startsWith("image/svg+xml")
  ) {
    const size = headers.get("x-blockscript-size")?.replace("x", "×") ?? "";
    const title = `${formattedRoute?.[1]}.svg${size ? ` (${size})` : ""}`;
    body = new TextEncoder().encode(
      svgShell(new TextDecoder().decode(body), title),
    ).buffer;
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("x-asciify-svg-shell", "1");
  }

  const etag = `"${await digest(body)}"`;

  if (!DEV) {
    headers.set("ETag", etag);
  }

  for (const [key, value] of Object.entries(cacheHeaders)) {
    headers.set(key, value);
  }

  if (!DEV && etagMatches(ifNoneMatch, etag)) {
    headers.delete("content-length");
    headers.delete("content-type");
    return new Response(null, {
      status: 304,
      headers,
    });
  }

  headers.set("content-length", String(body.byteLength));

  if (!DEV) {
    responseCache.set(cacheKey, {
      body: body.slice(0),
      etag,
      expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
      headers: [...headers.entries()],
      status: response.status,
      statusText: response.statusText,
    });
  }

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
