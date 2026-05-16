export const CACHE_TTL_SECONDS = 31536000;
export const EXCLUDED_QS = [
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "dclid",
  "msclkid",
  "twclid",
  "li_fat_id",
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
  "_hsenc",
  "_hsmi",
  "_ke",
  "oly_anon_id",
  "oly_enc_id",
  "rb_clickid",
  "s_cid",
  "vero_id",
  "wickedid",
  "yclid",
  "__s",
  "ref",
];

type CacheValue = {
  expiresAt: number;
  value: unknown;
};

const memoryCache = new Map<string, CacheValue>();

export function getCacheHeaders() {
  return {
    "Cache-Control": `public, max-age=120, stale-while-revalidate=3600, must-revalidate`,
    "CDN-Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, immutable`,
    "Netlify-CDN-Cache-Control": `public, durable, max-age=${CACHE_TTL_SECONDS}, immutable`,
  };
}

export function getCacheKey(urlstr: string, tag = "eths") {
  const url = new URL(urlstr);
  url.hash = "";

  const query = [...url.searchParams.entries()]
    .sort(([aKey, aValue], [bKey, bValue]) => {
      if (aKey === bKey) return aValue.localeCompare(bValue);
      return aKey.localeCompare(bKey);
    })
    .filter(([k]) => !EXCLUDED_QS.includes(k) && !k.startsWith("utm_"));

  url.search = query.length ? new URLSearchParams(query).toString() : "";

  return [
    tag,
    url.toString().replace("https://", "").replace("http://", ""),
  ].join(":");
}

export function getInMemoryCachedValue<T>(key: string): T | undefined {
  const cached = memoryCache.get(getCacheKey(key));
  if (!cached || cached.expiresAt <= Date.now()) {
    if (cached) memoryCache.delete(getCacheKey(key));
    return undefined;
  }

  return cached.value as T;
}

export function setInMemoryCachedValue<T>(
  key: string,
  value: T,
  ttlMs = CACHE_TTL_SECONDS * 1000,
): T {
  memoryCache.set(getCacheKey(key), {
    expiresAt: Date.now() + ttlMs,
    value,
  });

  return value;
}
