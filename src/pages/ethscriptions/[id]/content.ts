import type { APIRoute } from 'astro';
import { fetchEthscriptionContent } from '../../../lib/fetch';
import { EthscriptionFetchError } from '../../../types/ethscription';
import { getCacheHeaders } from '../../../lib/cache';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing ethscription ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const content = await fetchEthscriptionContent(id);

    return new Response(content.body, {
      status: 200,
      headers: {
        'Content-Type': content.contentType ?? 'application/octet-stream',
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

    return new Response(JSON.stringify({ error: 'Failed to fetch ethscription content' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
