import { cacheAsync } from './cache';
import {
  EthscriptionFetchError,
  type EthscriptionContentResponse,
  type EthscriptionId,
  type EthscriptionMetadataResponse,
} from '../types/ethscription';

export const ETHSCRIPTION_API_BASE_URL = 'https://mainnet.api.calldata.space';

const metadataUrl = (id: EthscriptionId) => `${ETHSCRIPTION_API_BASE_URL}/ethscriptions/${id}?with=ethscription_number,content_uri`;
const contentUrl = (id: EthscriptionId) => `${ETHSCRIPTION_API_BASE_URL}/ethscriptions/${id}/content`;

async function fetchJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new EthscriptionFetchError(`Failed to fetch ${url}`, response.status, url);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof EthscriptionFetchError) throw error;
    throw new EthscriptionFetchError(`Network error while fetching ${url}`, 0, url, error);
  }
}

async function fetchBinary(url: string): Promise<{ body: ArrayBuffer; contentType: string | null }> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new EthscriptionFetchError(`Failed to fetch ${url}`, response.status, url);
    }

    return {
      body: await response.arrayBuffer(),
      contentType: response.headers.get('content-type'),
    };
  } catch (error) {
    if (error instanceof EthscriptionFetchError) throw error;
    throw new EthscriptionFetchError(`Network error while fetching ${url}`, 0, url, error);
  }
}

export function fetchEthscriptionMetadata(id: EthscriptionId): Promise<EthscriptionMetadataResponse> {
  const url = metadataUrl(id);
  return cacheAsync(`ethscription:metadata:${id}`, () => fetchJson<EthscriptionMetadataResponse>(url));
}

export function fetchEthscriptionContent(id: EthscriptionId): Promise<EthscriptionContentResponse> {
  const url = contentUrl(id);

  return cacheAsync(`ethscription:content:${id}`, async () => {
    const { body, contentType } = await fetchBinary(url);
    return { id, body, contentType };
  });
}
