import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { camelCaseObjectKeys, sortObjectKeys } from "@/lib/utils";
import type { Prettify } from "@/types/ethscription";

export const HBS_PREFIX = "hbs2";
export const HBS_METADATA_TRAITS_KEY = "traits";

export type HbsPayload = Record<string, string | number>;
export type HbsAttribute = Prettify<
  | {
      trait_type: string;
      value: string | number;
    }
  | {
      trait_type: string;
      trait_value: string | number;
    }
  | {
      traitType: string;
      traitValue: string | number;
    }
>;

export type DecodeHbsPayloadOptions = {
  partial?: boolean;
};

export type DecodeHbsPayloadResult = {
  payload: HbsPayload;
  truncated: boolean;
};

export type DecodeHbsResult = {
  prefix: typeof HBS_PREFIX;
  truncated: boolean;
  valid: boolean;
  integrity: string;
  checksum: string;
  expectedLength: number;
  actualLength: number;
  payload: HbsPayload;
  input: string;
};

function getAttributeKey(attribute: HbsAttribute) {
  if ("trait_type" in attribute) {
    return attribute.trait_type;
  }

  return attribute.traitType;
}

function getAttributeValue(attribute: HbsAttribute) {
  if ("value" in attribute) {
    return attribute.value;
  }

  if ("trait_value" in attribute) {
    return attribute.trait_value;
  }

  return attribute.traitValue;
}

export function attributesToHbsPayload(attributes: readonly HbsAttribute[]) {
  const payload: HbsPayload = {};

  for (const attribute of attributes) {
    payload[getAttributeKey(attribute)] = getAttributeValue(attribute);
  }

  return payload;
}

export function encodeHbsPayload(payload: HbsPayload) {
  let output = "";

  for (const [key, value] of Object.entries(payload)) {
    output += `${key.length}:${key}${String(value).length}:${value}`;
  }

  return output;
}

export function decodeHbsPayload(
  input: string,
  options: DecodeHbsPayloadOptions & { partial: true },
): DecodeHbsPayloadResult;
export function decodeHbsPayload(
  input: string,
  options?: DecodeHbsPayloadOptions,
): HbsPayload;
export function decodeHbsPayload(
  input: string,
  options: DecodeHbsPayloadOptions = {},
) {
  const payload: HbsPayload = {};
  let offset = 0;
  let truncated = false;

  function finish() {
    if (options.partial) {
      return { payload, truncated };
    }

    return payload;
  }

  while (offset < input.length) {
    const keyLengthEnd = input.indexOf(":", offset);
    if (keyLengthEnd === -1) {
      if (options.partial) {
        truncated = true;
        return finish();
      }
      throw new Error("Invalid HBS payload: missing key length separator");
    }

    const keyLength = Number.parseInt(input.slice(offset, keyLengthEnd), 10);
    if (!Number.isFinite(keyLength) || keyLength < 0) {
      if (options.partial) {
        truncated = true;
        return finish();
      }
      throw new Error("Invalid HBS payload: invalid key length");
    }

    const keyStart = keyLengthEnd + 1;
    const keyEnd = keyStart + keyLength;
    if (keyEnd > input.length) {
      if (options.partial) {
        truncated = true;
        return finish();
      }
      throw new Error("Invalid HBS payload: incomplete key");
    }

    const key = input.slice(keyStart, keyEnd);
    const valueLengthEnd = input.indexOf(":", keyEnd);
    if (valueLengthEnd === -1) {
      if (options.partial) {
        truncated = true;
        return finish();
      }
      throw new Error("Invalid HBS payload: missing value length separator");
    }

    const valueLength = Number.parseInt(
      input.slice(keyEnd, valueLengthEnd),
      10,
    );
    if (!Number.isFinite(valueLength) || valueLength < 0) {
      if (options.partial) {
        truncated = true;
        return finish();
      }
      throw new Error("Invalid HBS payload: invalid value length");
    }

    const valueStart = valueLengthEnd + 1;
    const valueEnd = valueStart + valueLength;
    if (valueEnd > input.length) {
      if (options.partial) {
        truncated = true;
        return finish();
      }
      throw new Error("Invalid HBS payload: incomplete value");
    }

    payload[key] = input.slice(valueStart, valueEnd);
    offset = valueEnd;
  }

  return finish();
}

export function encodeSymbols(str: string) {
  let encoded = str
    // symbols
    .replaceAll("-", "1xx1")
    .replaceAll("_", "2xx2")
    .replaceAll(":", "3xx3")
    .replaceAll("#", "4xx4")
    .replaceAll("@", "5xx5")
    .replaceAll(",", "6xx6")
    .replaceAll(";", "7xx7")
    .replaceAll("/", "8xx8")
    .replaceAll("\\", "9xx9")

    // quotes & backtick
    .replaceAll("'", "1xy1")
    .replaceAll(`"`, "2xy2")
    .replaceAll("`", "5xy5")

    // parens/brackets
    .replaceAll("(", "1xz1")
    .replaceAll(")", "2xz2")
    .replaceAll("{", "3xz3")
    .replaceAll("}", "4xz4")
    .replaceAll("[", "5xz5")
    .replaceAll("]", "6xz6");

  for (let index = 0; index < 26; index += 1) {
    const upper = String.fromCharCode(65 + index);
    const lower = String.fromCharCode(97 + index);
    encoded = encoded.replaceAll(upper, `0u${lower}0`);
  }

  return encoded;
}

export function decodeSymbols(str: string) {
  let decoded = str;

  for (let index = 0; index < 26; index += 1) {
    const upper = String.fromCharCode(65 + index);
    const lower = String.fromCharCode(97 + index);
    decoded = decoded.replaceAll(`0u${lower}0`, upper);
  }

  return (
    decoded
      .replaceAll("1xx1", "-")
      .replaceAll("2xx2", "_")
      .replaceAll("3xx3", ":")
      .replaceAll("4xx4", "#")
      .replaceAll("5xx5", "@")
      .replaceAll("6xx6", ",")
      .replaceAll("7xx7", ";")
      .replaceAll("8xx8", "/")
      .replaceAll("9xx9", "\\")

      // quotes & backtick
      .replaceAll("1xy1", "'")
      .replaceAll("2xy2", `"`)
      .replaceAll("5xy5", "`")

      // parens/brackets
      .replaceAll("1xz1", "(")
      .replaceAll("2xz2", ")")
      .replaceAll("3xz3", "{")
      .replaceAll("4xz4", "}")
      .replaceAll("5xz5", "[")
      .replaceAll("6xz6", "]")
  );
}

export function encodeHbs(payload: HbsPayload) {
  const sortedObj = sortObjectKeys(payload);
  const entriesObj = camelCaseObjectKeys(sortedObj);

  const hbsPayload = encodeHbsPayload(Object.fromEntries(entriesObj));
  const encodedPayload = hbsPayload;
  const sha = bytesToHex(sha256(new TextEncoder().encode(hbsPayload)));

  return `${HBS_PREFIX}.${sha.slice(0, 16)}.${encodedPayload.length}.${encodedPayload}.${sha.slice(8, 16)}`;
}

export function decodeHbs(input: string): DecodeHbsResult | null {
  const start = input.indexOf(`${HBS_PREFIX}.`);

  if (start === -1) {
    return null;
  }

  const frame = input.slice(start);
  const parts = frame.split(".");
  const prefix = parts[0];
  const integrity = parts[1];
  const lengthText = parts[2];

  if (prefix !== HBS_PREFIX || !integrity || !lengthText) {
    return null;
  }

  const expectedLength = Number.parseInt(lengthText, 10);
  if (!Number.isFinite(expectedLength) || expectedLength < 0) {
    return null;
  }

  const payloadStart = `${HBS_PREFIX}.${integrity}.${lengthText}.`.length;
  const encodedPayload = frame.slice(
    payloadStart,
    payloadStart + expectedLength,
  );
  const payload = encodedPayload;
  const checksumStart = payloadStart + expectedLength + 1;
  const checksum = frame.slice(checksumStart, checksumStart + 8);
  const decodedPayload = decodeHbsPayload(payload, { partial: true });
  const sha = bytesToHex(sha256(new TextEncoder().encode(payload)));
  const valid =
    encodedPayload.length === expectedLength &&
    !decodedPayload.truncated &&
    sha.slice(0, 16) === integrity &&
    sha.slice(8, 16) === checksum;

  return {
    prefix: HBS_PREFIX,
    valid,
    truncated:
      decodedPayload.truncated || encodedPayload.length < expectedLength,
    integrity: integrity,
    checksum,
    expectedLength,
    actualLength: encodedPayload.length,
    payload: decodedPayload.payload,
    input: frame,
  };
}
