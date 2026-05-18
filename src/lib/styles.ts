import {
  getArtBoxPadding,
  getAspectRatio,
  getBaseUrl,
  getBgColor,
  getFont,
  getFontSize,
  getHeight,
  getWidth,
} from "@/lib/url_getters";

const FONT_HASHES = {
  highscript: {
    woff2: "0x5296ef8b8fb4168b57a09813622f7bc8198a9456b57886e47e1129475ef88d4a",
    otf: "0xcbf0c8a0c61f8018f9ad186e4aaa300faad892c6cbfa398841814f02c3bdea30",
  },
  lowscript: {
    woff2: "0x6c588b716ba2c2eda5fc12acea9914a103f0bfeb0bb47ab2072cf523fa2339a8",
    otf: "0x665ba2d452904e03e1943e0800af42468e107b614ee4ec59d377a66ffbe5ea5d",
  },
} as const;

export type AsciiartMetadata = {
  transaction_hash: string | number;
  ethscription_number: string | number;
  content_uri: string;
  content_type: string;
  isNotImage: boolean;
  asciiContent: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizeBaseUrl(baseUrl: string) {
  let url = baseUrl.replace(/\/+$/, "");
  if (url && !url.match(/^https?:\/\//)) {
    url = `https://${url}`;
  }
  return url;
}

export function buildCssFontFace(url: URL) {
  const font = getFont(url);
  if (!font) {
    return "";
  }

  const baseUrl = getBaseUrl(url);
  const { woff2 } = FONT_HASHES[font];
  const family = font === "highscript" ? "High Blockscript" : "Low Blockscript";
  return `@font-face{font-family:"${family}";src:url("${baseUrl}/ethscriptions/${woff2}/content")format("woff2");font-display:swap}`;
}

export function safeCssColor(input: string | null | undefined) {
  const value = (input ?? "").trim();
  // conservative allowlist: hex, rgb/rgba, hsl/hsla, or simple color keywords
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  if (/^(rgb|hsl)a?\([\d\s.,%+-]+\)$/.test(value)) return value;
  if (/^[a-zA-Z]+$/.test(value)) return value;
  return "black";
}

export function getAsciiifyStyles(url: URL) {
  const cssFontFace = buildCssFontFace(url);
  const baseColor = getBgColor(url);
  const fontSize = getFontSize(url);
  const artBoxPadding = getArtBoxPadding(url);
  const width = getWidth(url);
  const height = getHeight(url);
  const aspectRatio = getAspectRatio(url);
  const circle = url.searchParams.has("circle") ? "border-radius:50%;" : "";
  const preview =
    url.searchParams.has("preview") &&
    (url.pathname.endsWith(".html") || url.pathname.endsWith("/html"))
      ? `body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}`
      : "";

  return `html,body{margin:0;padding:0;background-color:#000;}*{box-sizing:border-box;margin:0;padding:0;}${cssFontFace}.highscript{font-family:"High Blockscript"}.lowscript{font-family:"Low Blockscript"}.asciiart{background-clip:text;background-position:center center;background-repeat:no-repeat;background-size:cover;-webkit-text-fill-color:transparent;word-break:break-all;color:#fff;font-size:clamp(10px,2vw,${fontSize});text-align:justify;text-align-last:justify;text-justify:inter-character}.art-box{${circle}padding:${artBoxPadding};overflow:hidden;background-color:${baseColor};width:${width};height:${height};flex-shrink:0;}${preview}.art{width:100%;height:100%;padding:0;margin:0;}@media(max-width:640px){.art-box{width:100%;height:auto;aspect-ratio:${aspectRatio};flex-shrink:1;}}`;
}

export function getHtmlFontPreload(url: URL, font?: string) {
  const fontName = font || getFont(url);
  if (!fontName) {
    return "";
  }
  if (fontName !== "highscript" && fontName !== "lowscript") {
    return "";
  }

  const baseUrl = getBaseUrl(url);
  const { woff2 } = FONT_HASHES[fontName];

  return `<link rel="preload" as="font" type="font/woff2" id="${fontName}-woff" crossorigin href="${baseUrl}/ethscriptions/${woff2}/content"/>`;
}

export function buildAsciiartDiv(url: URL, metadata: AsciiartMetadata) {
  const font = getFont(url);
  const externalUrl =
    url.searchParams.get("url") ||
    /* metadata.content_uri */ `/ethscriptions/${metadata.ethscription_number}/content`;
  // https://pbs.twimg.com/profile_images/1727119277570883584/yMEnNJEs_400x400.jpg
  const img = escapeHtml(externalUrl);
  return `<div class="art-box"><div class="asciiart art ${escapeHtml(font)}" data-eid="${escapeHtml(String(metadata.transaction_hash))}" data-enumber="${escapeHtml(String(metadata.ethscription_number))}" style="background-image: url('${img}')">${metadata.asciiContent}</div></div>`;
}
