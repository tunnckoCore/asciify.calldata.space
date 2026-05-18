import { fetchEthscriptionMetadata } from "@/lib/fetch";
import {
  type AsciiartMetadata,
  buildAsciiartDiv,
  getAsciiifyStyles,
  getHtmlFontPreload,
} from "@/lib/styles";
import { EthscriptionFetchError } from "@/types/ethscription";

export async function buildHtmlParts(
  id: string,
  url: URL,
  defaultAsciiFillerFn = defaultAsciiFiller,
) {
  // const VALID_FONTS = ["highscript", "lowscript"] as const;
  // const fontParam = url.searchParams.get("font");
  // const font = (
  //   VALID_FONTS.includes(fontParam as (typeof VALID_FONTS)[number])
  //     ? fontParam
  //     : undefined
  // ) as (typeof VALID_FONTS)[number] | undefined;

  const mergedQs = new URLSearchParams(url.searchParams);
  mergedQs.set("with", "ethscription_number,content_uri");

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
    const containerContent = {
      block_hash: res.block_hash,
      block_number: res.block_number,
      block_timestamp: res.block_timestamp,
      block_datetime: res.block_datetime,
      collection_id: "0x95e1f1a79c1e69c4c191b4edb58b037d98145f50",
      token_id: 1167,
      ethscription_number: 5564962,
      ethscription_id:
        "0x7bbcf285056c2c9e825df927ad24038df4855d4cbf7d0f6ed897c137c7f48fc4",
      transaction_index: 65,
      transaction_value: 0,
      transaction_fee: 898001184939120,
      gas_price: 32966269638,
      gas_used: 27240,
      creator: "0x1c5a1d2915a59436752d3519e5a39c8f454f5226",
      receiver: "0x1c5a1d2915a59436752d3519e5a39c8f454f5226",
      media_type: "image",
      media_subtype: "png",
      content_type: "image/png",
      content_sha:
        "0x13f93cfdcbc202ffc8232dadbc59fb54df68d90c7bbed41d715a1fa4edd7cb39",
      attributes: [
        {
          trait_type: "Background",
          trait_value: "Pink",
        },
        {
          trait_type: "Body",
          trait_value: "Purp",
        },
        {
          trait_type: "Snout",
          trait_value: "Snout Wide",
        },
        {
          trait_type: "Spots",
          trait_value: "Spots 3",
        },
        {
          trait_type: "Tail",
          trait_value: "Tail 2",
        },
        {
          trait_type: "Eyes",
          trait_value: "Orange",
        },
      ],
      is_esip0: true,
      is_esip3: false,
      is_esip4: false,
      is_esip6: false,
      is_esip8: false,
      content_uri: res.content_uri,
    };

    const incomingSeed = url.searchParams.get('seed');
    const content = url.searchParams.has("randomize")
      ? shuffler(containerContent, incomingSeed ? Number(incomingSeed) : null).result
      : containerContent;

    const asciiContent =
      defaultAsciiFillerFn?.(content) || JSON.stringify(content);

    const metadata: AsciiartMetadata = {
      transaction_hash: res.transaction_hash,
      ethscription_number: res.ethscription_number,
      content_uri: String(res.content_uri ?? ""),
      content_type: res.content_type,
      isNotImage,
      asciiContent,
    };

    const css = getAsciiifyStyles(url);
    const fontPreload = getHtmlFontPreload(url);
    const asciiartDiv = buildAsciiartDiv(url, metadata);

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
      error: `internal server error: ${error.message.slice(0, 150)}...`,
      status: 500,
    };
  }
}

export function shuffleObjectFields<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(shuffleObjectFields) as unknown as T;
  }

  const entries = Object.entries(obj);

  // Fisher-Yates shuffle
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  const shuffled = Object.fromEntries(
    entries.map(([key, value]) => [key, shuffleObjectFields(value)]),
  );

  return shuffled as T;
}

export function shuffler<T extends Record<string, any>>(
  obj: T,
  seed?: number | null,
): { result: T; seed: number } {
  const usedSeed = seed ?? randomSeed();
  const entries = Object.entries(obj);
  const rnd = mulberry32(usedSeed);

  // Fisher-Yates shuffle
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  return {
    result: Object.fromEntries(entries) as T,
    seed: usedSeed,
  };

  function mulberry32(zeed: number): () => number {
    return () => {
      let t = (zeed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomSeed(): number {
    return Math.floor(Math.random() * 2147483647);
  }
}

export function defaultAsciiFiller(res: any) {
  // const {content_uri: _, ...cleaned} = {...res}
  let content = JSON.stringify(res);

  while (content.length < 18_000) {
    const curr = content.length;
    content += curr > 1000 ? content.slice(0, 1000) : content;
  }

  return content;
}
