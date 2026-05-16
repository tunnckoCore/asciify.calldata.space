import type { APIRoute } from 'astro';
import { fetchEthscriptionMetadata } from '../../lib/fetch';
import { EthscriptionFetchError } from '../../types/ethscription';
import { getCacheHeaders } from '../../lib/cache';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing ethscription ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const metadata = await fetchEthscriptionMetadata(id);

    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCacheHeaders(),
      },
    });
  } catch (error) {
    if (error instanceof EthscriptionFetchError) {
      if (error.status === 404) {
        return new Response(JSON.stringify({ error: `Ethscription ${id} not found` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Failed to fetch ethscription metadata' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
