import { normalizeBaseUrl, safeCssColor } from "@/lib/styles";

export function getBaseUrl(url: URL) {
  return normalizeBaseUrl(
    url.searchParams.get("baseUrl") || url.searchParams.get("base_url") || "",
  );
}

export function getBgColor(url: URL) {
  return safeCssColor(
    url.searchParams.get("bg") ||
      url.searchParams.get("bg_color") ||
      url.searchParams.get("bgColor"),
  );
}

export function getFont(url: URL): "lowscript" | "highscript" {
  const str = url.searchParams.get("font") || "";
  const fontStr = str as "lowscript" | "highscript";

  if (fontStr === "lowscript") {
    return fontStr as "lowscript";
  }

  if (fontStr === "highscript") {
    return fontStr as "highscript";
  }

  return fontStr;
}

export function getFontSize(url: URL) {
  return (
    url.searchParams.get("fontSize") ||
    url.searchParams.get("font_size") ||
    "15px"
  );
}

export function getWidth(url: URL) {
  return url.searchParams.get("width") || url.searchParams.get("w") || "750px";
}

export function getHeight(url: URL) {
  return url.searchParams.get("height") || url.searchParams.get("h") || "750px";
}

export function getArtBoxPadding(url: URL) {
  return (
    url.searchParams.get("artboxPadding") ||
    url.searchParams.get("size") ||
    url.searchParams.get("artbox") ||
    url.searchParams.get("artbox_padding") ||
    "0"
  );
}

export function getAspectRatio(url: URL) {
  return (
    url.searchParams.get("aspectRatio") ||
    url.searchParams.get("aspect") ||
    url.searchParams.get("aspect_ratio") ||
    "1/1"
  );
}
