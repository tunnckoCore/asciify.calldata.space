import { getInMemoryCachedValue, setInMemoryCachedValue } from "@/lib/cache";
import {
  type EthscriptionContentResponse,
  EthscriptionFetchError,
  type EthscriptionId,
  type EthscriptionMetadataResponse,
} from "@/types/ethscription";

export const ETHSCRIPTION_API_BASE_URL = "https://mainnet.api.calldata.space";

export function metadataUrl(id: EthscriptionId, queryString?: string) {
  const qs = queryString ? `?${queryString}` : "";
  return `${ETHSCRIPTION_API_BASE_URL}/ethscriptions/${id}${qs}`;
}

export function contentUrl(id: EthscriptionId) {
  return `${ETHSCRIPTION_API_BASE_URL}/ethscriptions/${id}/content`;
}

type TypedFetcherResponse<T> = {
  headers: Headers;
  contentBody: T;
  contentType: string | null;
  contentLength: string | null;
};

// export async function fetchWithCache<T>(
//   key: string,
//   fetcher: (cacheHeaders?: Record<string, string>) => Promise<T>,
//   ttlMs = CACHE_TTL_SECONDS * 1000,
// ): Promise<T> {
//   const cached = getInMemoryCachedValue<T>(key);
//   if (cached !== undefined) return cached;

//   const value = await fetcher(getCacheHeaders());
//   return setInMemoryCachedValue(key, value, ttlMs);
// }

export async function typedFetcher<T>(
  url: string,
  bin?: false,
): Promise<TypedFetcherResponse<T>>;
export async function typedFetcher(
  url: string,
  bin: true,
): Promise<TypedFetcherResponse<ArrayBuffer>>;
export async function typedFetcher<T>(
  url: string,
  bin: boolean,
): Promise<TypedFetcherResponse<T | ArrayBuffer>>;
export async function typedFetcher<T>(
  url: string,
  bin = false,
): Promise<TypedFetcherResponse<T | ArrayBuffer>> {
  const cached =
    getInMemoryCachedValue<TypedFetcherResponse<T | ArrayBuffer>>(url);

  if (cached !== undefined) {
    return cached;
  }

  // const response = await fetchWithCache(url, () => fetch(url));
  const response = await fetch(url);
  if (!response.ok) {
    throw new EthscriptionFetchError(
      `Failed to fetch ${url}`,
      response.status,
      url,
    );
  }

  if (bin) {
    const resp = {
      headers: response.headers,
      contentBody: await response.arrayBuffer(),
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length") || "",
    };

    setInMemoryCachedValue(url, resp);

    return resp;
  }

  const resp = {
    headers: response.headers,
    contentBody: (await response.json()) as T,
    contentType: response.headers.get("content-type"),
    contentLength: response.headers.get("content-length") || "",
  };
  setInMemoryCachedValue(url, resp);
  return resp;
}

export async function fetchEthscriptionMetadata(
  id: EthscriptionId,
  queryString?: string,
): Promise<TypedFetcherResponse<EthscriptionMetadataResponse>> {
  const url = metadataUrl(id, queryString);
  const resp = await typedFetcher<EthscriptionMetadataResponse>(url, false);

  return resp;
}

export async function fetchEthscriptionContent(
  id: EthscriptionId,
): Promise<EthscriptionContentResponse> {
  const url = contentUrl(id);
  const resp = await typedFetcher(url, true);
  return { ...resp, id };
}
