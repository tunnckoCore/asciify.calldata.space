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
  url: string | URL,
  bin?: false,
): Promise<TypedFetcherResponse<T>>;
export async function typedFetcher(
  url: string | URL,
  bin: true,
): Promise<TypedFetcherResponse<ArrayBuffer>>;
export async function typedFetcher<T>(
  url: string | URL,
  bin: boolean,
): Promise<TypedFetcherResponse<T | ArrayBuffer>>;
export async function typedFetcher<T>(
  urlx: string | URL,
  bin = false,
): Promise<TypedFetcherResponse<T | ArrayBuffer>> {
  const url = typeof urlx === "string" ? urlx : urlx.toString();
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

type FocusedRecord = {
  block_number: number;
  block_hash: `0x${string}`;
  block_datetime: "2023-08-21T23:27:47.000Z";
  transaction_hash: `0x${string}`;
  transaction_index: number;
  transaction_value: number;
  transaction_fee: number;
  gas_price: number;
  gas_used: number;
  creator: `0x${string}`;
  receiver: `0x${string}`;
  media_type: string;
  media_subtype: string;
  content_type: string;
  content_sha: `0x${string}`;
  content_uri: string;
  ethscription_number: `${number}`;
  current_owner: `0x${string}`;
  previous_owner: `0x${string}`;
};

// TODO: finalize new general fetcher of Ethscription Metadata, Tx Metadata, and Token Metadata
export async function fetchEthscription(id: EthscriptionId) {
  const ethUrl = new URL(
    `https://mainnet.api.calldata.space/ethscriptions/${id}`,
  );
  ethUrl.searchParams.set(
    "with",
    "content_uri,ethscription_number,current_owner,previous_owner",
  );
  ethUrl.searchParams.set(
    "only",
    "block_number,block_hash,block_datetime,transaction_hash,transaction_index,transaction_value,transaction_fee,gas_price,gas_used,creator,receiver,media_type,media_subtype,content_type,content_sha,content_uri,ethscription_number,current_owner,previous_owner",
  );

  const resp = await typedFetcher<{
    result?: FocusedRecord;
    error?: unknown;
    [key: string]: unknown;
  }>(ethUrl, false);

  return resp;
}

// https://mainnet.api.calldata.space/ethscriptions/1092558?with=content_uri,ethscription_number,current_owner,previous_owner&only=block_number,block_hash,block_datetime,transaction_hash,transaction_index,transaction_value,transaction_fee,gas_price,gas_used,creator,receiver,media_type,media_subtype,content_type,content_sha,content_uri,ethscription_number,current_owner,previous_owner,
