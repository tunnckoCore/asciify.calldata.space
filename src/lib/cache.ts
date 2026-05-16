export const CACHE_TTL = 31536000;

export function getCacheHeaders() {
	return {
		"Cache-Control": `public, max-age=${CACHE_TTL}, immutable`,
		"Netlify-CDN-Cache-Control": `public, durable, max-age=${CACHE_TTL}, immutable`,
	};
}
