import { defineMiddleware } from "astro:middleware";

async function digest(val: string | Uint8Array) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    (typeof val === "string" ? new TextEncoder().encode(val) : val) as any,
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const onRequest = defineMiddleware(async (context, next) => {
  const req = context.request;
  const ifNoneMatch = req.headers.get("if-none-match");

  // get the response that would normally be returned
  const response = await next();

  // If there's already an ETag header set by something else, prefer it
  const existingEtag = response.headers.get("etag");
  if (existingEtag) {
    if (ifNoneMatch && ifNoneMatch === existingEtag) {
      // Client has the same version
      const headers = new Headers();
      headers.set("ETag", existingEtag);
      headers.set("Cache-Control", "public, max-age=31536000, must-revalidate");

      return new Response(null, { status: 304, headers });
    }
    // return response as-is (but ensure it's a Response object)
    return response;
  }

  // Heuristic: skip very large or streaming responses if needed.
  // If the response has no body (304/204) just forward it
  if (!response.body) return response;

  // Clone the response to compute hash without losing original body
  const clone = response.clone();

  // Read entire body into ArrayBuffer (WARNING: memory for large bodies)
  const buf = await clone.arrayBuffer();
  const hash = await digest(new Uint8Array(buf));

  // Format ETag (strong or weak as needed)
  const etag = `"${hash}"`; // strong ETag example

  // If client sent If-None-Match and it matches, return 304
  if (ifNoneMatch && ifNoneMatch === etag) {
    const headers = new Headers(response.headers);
    headers.set("ETag", etag);
    headers.set("Cache-Control", "public, max-age=31536000, must-revalidate");

    return new Response(null, { status: 304, headers });
  }

  // Otherwise return the original body but add the ETag header.
  const headers = new Headers(response.headers);
  headers.set("ETag", etag);
  headers.set("Cache-Control", "public, max-age=31536000, must-revalidate");

  // Return a new Response with the same status and body (using the ArrayBuffer),
  // preserving headers. Using ArrayBuffer prevents having consumed the original stream.
  return new Response(buf, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
