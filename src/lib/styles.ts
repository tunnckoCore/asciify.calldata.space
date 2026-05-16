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

type FontName = keyof typeof FONT_HASHES;

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

function normalizeBaseUrl(baseUrl: string) {
  let url = baseUrl.replace(/\/+$/, "");
  if (url && !url.match(/^https?:\/\//)) {
    url = `https://${url}`;
  }
  return url;
}

export function buildFontFace(font: FontName, baseUrl?: string) {
  const prefix = baseUrl ? normalizeBaseUrl(baseUrl) : "";
  const { woff2, otf } = FONT_HASHES[font];
  const family = font === "highscript" ? "High Blockscript" : "Low Blockscript";
  return `@font-face{font-family:"${family}";src:url("${prefix}/ethscriptions/${woff2}/content")format("woff2"),url("${prefix}/ethscriptions/${otf}/content")format("opentype");font-display:swap}`;
}
function safeCssColor(input: string | null | undefined) {
  const value = (input ?? "").trim();
  // conservative allowlist: hex, rgb/rgba, hsl/hsla, or simple color keywords
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  if (/^(rgb|hsl)a?\([\d\s.,%+-]+\)$/.test(value)) return value;
  if (/^[a-zA-Z]+$/.test(value)) return value;
  return "black";
}
export function getAsciiifyStyles(
  font: FontName | null,
  baseUrl?: string,
  url?: URL,
) {
  const fontFaces = font
    ? buildFontFace(font, baseUrl)
    : // : alwaysLoadFontFaces
      //   ? [
      //     buildFontFace('highscript', baseUrl),
      //     buildFontFace('lowscript', baseUrl)
      //     ].join("/**/")
      "";
  const bgColor = safeCssColor(
    url?.searchParams?.get("bg") ||
    url?.searchParams?.get("bg_color") ||
    url?.searchParams?.get("bgColor")
  );

  return `*{box-sizing:border-box;margin:0;padding:0}body{background-color:${bgColor};}${fontFaces}.highscript{font-family:"High Blockscript"}.lowscript{font-family:"Low Blockscript"}.asciiart{background-clip:text;background-position:center center;background-repeat:no-repeat;background-size:cover;-webkit-text-fill-color:transparent;text-fill-color:transparent;word-break:break-all;color:#fff;font-size:clamp(10px,2vw,12px);text-align:justify}.art{padding:0.5rem;width:100%;max-width:750px;min-height:750px;max-height:750px}@media(max-width:640px){.art{max-width:calc(100vw - 16px);min-height:350px;max-height:calc(100vw - 16px)}}`;
}

export function getFontLinks(baseUrl?: string, font?: FontName) {
  if (!font) return "";

  const prefix = normalizeBaseUrl(baseUrl ?? "");
  const { woff2, otf } = FONT_HASHES[font];

  return [
    `<link rel="preload" as="font" type="font/woff2" id="${font}-woff" crossorigin href="${prefix}/ethscriptions/${woff2}/content"/>`,
    `<link rel="preload" as="font" type="font/otf" id="${font}-otf" crossorigin href="${prefix}/ethscriptions/${otf}/content"/>`,
  ].join("\n");
}

export function buildAsciiartDiv(metadata: AsciiartMetadata, font: FontName) {
  return `<div class="asciiart art ${font || ""}" data-eid="${escapeHtml(String(metadata.transaction_hash))}" data-enumber="${escapeHtml(String(metadata.ethscription_number))}" style="background-image: url('${escapeHtml(metadata.content_uri)}')">${metadata.asciiContent}</div>`;
}
