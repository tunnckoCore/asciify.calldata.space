import { fetchEthscriptionMetadata } from "@/lib/fetch";
import {
  type AsciiartMetadata,
  buildAsciiartDiv,
  getAsciiifyStyles,
  getFontLinks,
} from "@/lib/styles";
import { EthscriptionFetchError } from "@/types/ethscription";

export async function buildHtmlParts(
  id: string,
  url: URL,
  defaultAsciiFillerFn = defaultAsciiFiller,
) {
  const VALID_FONTS = ["highscript", "lowscript"] as const;
  const fontParam = url.searchParams.get("font");
  const font = (
    VALID_FONTS.includes(fontParam as (typeof VALID_FONTS)[number])
      ? fontParam
      : undefined
  ) as (typeof VALID_FONTS)[number] | undefined;

  const baseUrl = url.searchParams.get("base_url") ?? undefined;
  const mergedQs = new URLSearchParams(url.searchParams);
  mergedQs.set("with", "ethscription_number,content_uri,content_type");

  try {
    const meta = await fetchEthscriptionMetadata(
      id,
      mergedQs.toString().replaceAll("%2C", ","),
    );
    const res = meta.contentBody.result;

    if (!res) {
      return {
        ok: false,
        error: "not found",
        status: 404,
      };
    }

    const isNotImage = Boolean(res?.media_type !== "image");
    const content = defaultAsciiFillerFn?.(res) || JSON.stringify(res);
    const metadata: AsciiartMetadata = {
      transaction_hash: res.transaction_hash,
      ethscription_number: res.ethscription_number,
      content_uri: String(res.content_uri ?? ""),
      content_type: res.content_type,
      isNotImage,
      asciiContent: content,
    };

    const css = getAsciiifyStyles(font, baseUrl, url);
    const fontPreload = getFontLinks(baseUrl, font);

    const asciiartDiv = buildAsciiartDiv(metadata, font);

    return {
      ok: true,
      data: {
        ...metadata,
        css,
        fontPreload,
        asciiartDiv,
      },
    };
  } catch (error) {
    if (error instanceof EthscriptionFetchError) {
      if (error.status === 404) {
        return {
          ok: false,
          error: "not found",
          status: 404,
        };
      }
    }

    return {
      ok: false,
      error: `internal server error: ${error.message.slice(0, 100)}`,
      status: 500,
    };
  }
}

export function defaultAsciiFiller(res) {
  let content = JSON.stringify(res);
  while (content.length < 18_000) {
    const curr = content.length;
    content += curr > 1000 ? content.slice(0, 1000) : content;
  }

  return content;
}
