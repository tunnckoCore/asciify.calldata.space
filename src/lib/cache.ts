export const CACHE_TTL = 31536000;

type CacheValue = {
	expiresAt: number;
	value: unknown;
};

const memoryCache = new Map<string, CacheValue>();

export function getCacheHeaders() {
	return {
		"Cache-Control": `public, max-age=${CACHE_TTL}, immutable`,
		"Netlify-CDN-Cache-Control": `public, durable, max-age=${CACHE_TTL}, immutable`,
	};
}

export function cacheKey(req: Request) {
	const url = new URL(req.url);
	url.hash = "";

	const query = [...url.searchParams.entries()].sort(([aKey, aValue], [bKey, bValue]) => {
		if (aKey === bKey) return aValue.localeCompare(bValue);
		return aKey.localeCompare(bKey);
	});

	url.search = query.length ? new URLSearchParams(query).toString() : "";

	return `${req.method.toUpperCase()} ${url.toString()}`;
}

type CacheContext = {
	cache?: {
		set: (options: { maxAge: number }) => void;
	};
};

export function withCache<T>(key: string, fetcher: () => Promise<T> | T): Promise<T>;
export function withCache<T>(ctx: CacheContext, fetcher: () => Promise<T> | T): Promise<T | Response>;
export async function withCache<T>(arg: string | CacheContext, fetcher: () => Promise<T> | T): Promise<T | Response> {
	if (typeof arg === "string") {
		const cached = memoryCache.get(arg);
		if (cached && cached.expiresAt > Date.now()) {
			return cached.value as T;
		}

		const result = await fetcher();
		memoryCache.set(arg, {
			expiresAt: Date.now() + CACHE_TTL * 1000,
			value: result,
		});
		return result;
	}

	const result = await fetcher();

	if (!(result instanceof Response)) {
		arg.cache?.set({ maxAge: CACHE_TTL });
		return result;
	}

	if (!result.ok) {
		return result;
	}

	arg.cache?.set({ maxAge: CACHE_TTL });

	const headers = new Headers(result.headers);
	for (const [key, value] of Object.entries(getCacheHeaders())) {
		headers.set(key, value);
	}

	return new Response(result.body, {
		status: result.status,
		statusText: result.statusText,
		headers,
	});
}

export function getCachedValue<T>(key: string): T | undefined {
	const cached = memoryCache.get(key);
	if (!cached || cached.expiresAt <= Date.now()) {
		if (cached) memoryCache.delete(key);
		return undefined;
	}

	return cached.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs = CACHE_TTL * 1000): T {
	memoryCache.set(key, {
		expiresAt: Date.now() + ttlMs,
		value,
	});

	return value;
}

export async function cacheAsync<T>(key: string, fetcher: () => Promise<T>, ttlMs = CACHE_TTL * 1000): Promise<T> {
	const cached = getCachedValue<T>(key);
	if (cached !== undefined) return cached;

	const value = await fetcher();
	return setCachedValue(key, value, ttlMs);
}
