import {
	EthscriptionFetchError,
	type EthscriptionContentResponse,
	type EthscriptionId,
	type EthscriptionMetadataResponse,
} from '../types/ethscription';

export const ETHSCRIPTION_API_BASE_URL = 'https://mainnet.api.calldata.space';

export function metadataUrl(id: EthscriptionId, queryString?: string) {
	const qs = queryString ? `?${queryString}` : '';
	return `${ETHSCRIPTION_API_BASE_URL}/ethscriptions/${id}${qs}`;
}

export function contentUrl(id: EthscriptionId) {
	return `${ETHSCRIPTION_API_BASE_URL}/ethscriptions/${id}/content`;
}

export async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new EthscriptionFetchError(`Failed to fetch ${url}`, response.status, url);
	}

	return (await response.json()) as T;
}

export async function fetchBinary(url: string): Promise<{ body: ArrayBuffer; contentType: string | null }> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new EthscriptionFetchError(`Failed to fetch ${url}`, response.status, url);
	}

	return {
		body: await response.arrayBuffer(),
		contentType: response.headers.get('content-type'),
	};
}

export function fetchEthscriptionMetadata(id: EthscriptionId, queryString?: string): Promise<EthscriptionMetadataResponse> {
	const url = metadataUrl(id, queryString);
	return fetchJson<EthscriptionMetadataResponse>(url);
}

export async function fetchEthscriptionContent(id: EthscriptionId): Promise<EthscriptionContentResponse> {
	const url = contentUrl(id);
	const { body, contentType } = await fetchBinary(url);
	return { id, body, contentType };
}
