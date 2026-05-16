import type { APIRoute } from 'astro';
import { fetchEthscriptionMetadata } from '../../lib/fetch';
import { EthscriptionFetchError } from '../../types/ethscription';
import { getCacheHeaders } from '../../lib/cache';
import { getAsciiifyStyles, getFontLinks, buildAsciiartDiv, type AsciiartMetadata } from '../../lib/styles';

const VALID_FONTS = ['highscript', 'lowscript'] as const;

export const GET: APIRoute = async ({ params, url }) => {
  const { id } = params;

  if (!id) {
    return new Response('Missing ID', { status: 400 });
  }

  const fontParam = url.searchParams.get('font');
  const font = (VALID_FONTS.includes(fontParam as typeof VALID_FONTS[number]) ? fontParam : undefined) as typeof VALID_FONTS[number] | undefined;
  const baseUrl = url.searchParams.get('base_url') ?? undefined;

  try {
    const meta = await fetchEthscriptionMetadata(id);
    const res = meta.result;

    if (!res || res.media_type !== 'image') {
      return new Response('Not Found', { status: 404 });
    }

    const num = Number(res.ethscription_number ?? '498580');

    let backgroundAsciiContent = JSON.stringify(res);
    while (backgroundAsciiContent.length < 18_000) {
      const curr = backgroundAsciiContent.length;
      backgroundAsciiContent += curr > 1000 ? backgroundAsciiContent.slice(0, 1000) : backgroundAsciiContent;
    }

    const metadata: AsciiartMetadata = {
      transaction_hash: String(res.transaction_hash ?? res.ethscription_number ?? id),
      ethscription_number: String(res.ethscription_number ?? id),
      content_uri: String(res.content_uri ?? ''),
      blockscript: typeof res.blockscript === 'string' ? res.blockscript : null,
      content: backgroundAsciiContent,
    };

    const css = getAsciiifyStyles(font, baseUrl);
    const fontPreload = getFontLinks(baseUrl, font);
    const asciiartDiv = buildAsciiartDiv(metadata);

    const html = `<html><head><title>Asciify.Art - Ethscription #${num.toLocaleString()}</title><style>${css}</style>${fontPreload}</head><body>${asciiartDiv}</body></html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...getCacheHeaders(),
      },
    });
  } catch (error) {
    if (error instanceof EthscriptionFetchError) {
      if (error.status === 404) {
        return new Response('Not Found', { status: 404 });
      }
    }

    return new Response('Internal Server Error', { status: 500 });
  }
};
