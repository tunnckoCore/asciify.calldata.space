import type { APIRoute } from "astro";
import { getCacheHeaders } from "@/lib/cache";
import { fetchEthscriptionContent } from "@/lib/fetch";

// cche proxy of mainnet.api.calldata.space/ethscriptions/:id/content
export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  const { contentBody, contentType } = await fetchEthscriptionContent(id);

  return new Response(contentBody, {
    headers: {
      ...getCacheHeaders(),
      "x-ethscription-id": id,
      "content-type": contentType,
    },
  });
};
