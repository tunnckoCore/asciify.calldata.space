import { fetchEthscriptionMetadata } from "@/lib/fetch";
import {
  type AsciiartMetadata,
  buildAsciiartDiv,
  getAsciiifyStyles,
  getHtmlFontPreload,
} from "@/lib/styles";
import { EthscriptionFetchError } from "@/types/ethscription";

export function sortObjectKeys<T extends Record<string, string | number>>(
  obj: T,
): T {
  return Object.keys(obj)
    .sort()
    .reduce((out, key) => {
      out[key as keyof T] = obj[key as keyof T];
      return out;
    }, {} as T);
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];

    const bitmap = (b1 << 16) | (b2 << 8) | b3;

    result += chars[(bitmap >> 18) & 63];
    result += chars[(bitmap >> 12) & 63];
    result += i + 1 < bytes.length ? chars[(bitmap >> 6) & 63] : "=";
    result += i + 2 < bytes.length ? chars[bitmap & 63] : "=";
  }

  return result;
}

export async function digest(value: ArrayBuffer | Uint8Array | string) {
  const val =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const hash = await crypto.subtle.digest("SHA-256", val as any);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// console.log(await digest("foo"));

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

    const incomingSeed = url.searchParams.get("seed");
    const content = url.searchParams.has("randomize")
      ? shuffler(containerContent, incomingSeed ? Number(incomingSeed) : null)
          .result
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

export function camelCaseObjectKeys(obj: Record<string, string | number>) {
  return Object.entries(obj).map(([key, val]) => {
    const [first, ...rest] = key.split("_");
    const newKey =
      first +
      rest
        .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
        .join("");

    return [newKey, val];
  });
}

export const NOT_FULL_GLYPHS: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    " ": [
      "0000000",
      "0000000",
      "0000000",
      "0000000",
      "0000000",
      "0000000",
      "0000000",
    ],
    ".": [
      "1111111",
      "1000001",
      "1011101",
      "1010101",
      "1011101",
      "1000001",
      "1111111",
    ],
    "0": [
      "1111111",
      "1000001",
      "1010101",
      "0000000",
      "1010101",
      "1000001",
      "1111111",
    ],
    "1": [
      "1111111",
      "1000001",
      "1011101",
      "0000100",
      "1010101",
      "1000001",
      "1111111",
    ],
    "2": [
      "1111111",
      "1000001",
      "1010101",
      "0010100",
      "1010101",
      "1000001",
      "1111111",
    ],
    "3": [
      "1111111",
      "1000001",
      "1011101",
      "0000100",
      "1011101",
      "1000001",
      "1111111",
    ],
    "4": [
      "1111111",
      "1000001",
      "1010101",
      "0010100",
      "1011101",
      "1000001",
      "1111111",
    ],
    "5": [
      "1111111",
      "1000001",
      "1011101",
      "0010000",
      "1011101",
      "1000001",
      "1111111",
    ],
    "6": [
      "1111111",
      "1000001",
      "1011101",
      "0010000",
      "1010101",
      "1000001",
      "1111111",
    ],
    "7": [
      "1111111",
      "1000001",
      "1011101",
      "0010100",
      "1010101",
      "1000001",
      "1111111",
    ],
    "8": [
      "1111111",
      "1000001",
      "1011101",
      "0000000",
      "1011101",
      "1000001",
      "1111111",
    ],
    "9": [
      "1111111",
      "1000001",
      "1010101",
      "0000100",
      "1011101",
      "1000001",
      "1111111",
    ],
    a: [
      "1110111",
      "1010101",
      "1110111",
      "0000000",
      "1111111",
      "1000001",
      "1010101",
    ],
    b: [
      "1110111",
      "1010101",
      "1110111",
      "0000000",
      "1111111",
      "1000001",
      "1111111",
    ],
    c: [
      "1110111",
      "1010101",
      "1010101",
      "1010101",
      "1110111",
      "0000000",
      "1111111",
    ],
    d: [
      "1110111",
      "1010101",
      "1010111",
      "1010000",
      "1010111",
      "1010101",
      "1110111",
    ],
    e: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1111111",
    ],
    f: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1010101",
    ],
    g: [
      "1110111",
      "1010101",
      "1110101",
      "0000101",
      "1110101",
      "1010101",
      "1110111",
    ],
    h: [
      "1110111",
      "1010101",
      "1011101",
      "0000000",
      "1011101",
      "1010101",
      "1110111",
    ],
    i: [
      "1110111",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1110111",
    ],
    j: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1011101",
      "1010101",
      "1110111",
    ],
    k: [
      "1011101",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1010101",
    ],
    l: [
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1010101",
      "1000001",
      "1010101",
    ],
    m: [
      "1110111",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1011101",
    ],
    n: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1011101",
    ],
    o: [
      "1110111",
      "1010101",
      "1110111",
      "0000000",
      "1110111",
      "1010101",
      "1110111",
    ],
    p: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1110111",
      "1010101",
      "1110111",
    ],
    q: [
      "1110111",
      "1010101",
      "1111111",
      "0010100",
      "1111111",
      "1010101",
      "1110111",
    ],
    r: [
      "1111111",
      "1000001",
      "1111111",
      "0000000",
      "1110111",
      "1010101",
      "1011101",
    ],
    s: [
      "1111111",
      "1000000",
      "1111111",
      "0000001",
      "1111111",
      "1000000",
      "1111111",
    ],
    t: [
      "1111111",
      "0000000",
      "1110111",
      "1010101",
      "1010101",
      "1010101",
      "1110111",
    ],
    u: [
      "1011101",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
      "1000001",
      "1111111",
    ],
    v: [
      "1011101",
      "1010101",
      "1011101",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
    ],
    w: [
      "1011101",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1010101",
      "1110111",
    ],
    x: [
      "1011101",
      "1010101",
      "1110111",
      "0000000",
      "1110111",
      "1010101",
      "1011101",
    ],
    y: [
      "1010101",
      "1000001",
      "1010101",
      "1000001",
      "1111111",
      "0000000",
      "1111111",
    ],
    z: [
      "1111111",
      "0000001",
      "1111111",
      "1000000",
      "1111111",
      "0000001",
      "1111111",
    ],
  });
