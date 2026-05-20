import type { APIRoute } from "astro";
import { getCacheHeaders } from "@/lib/cache";
import { fetchEthscriptionMetadata } from "@/lib/fetch";

// cche proxy of mainnet.api.calldata.space/ethscriptions/:id/content
export const GET: APIRoute = async ({ params, url }) => {
  const { id } = params;
  const qs = url.searchParams.toString();

  const result = await fetchEthscriptionMetadata(id, qs);

  return Response.json(result.contentBody, {
    headers: {
      ...getCacheHeaders(),
      "x-ethscription-id": id,
    },
  });
};
