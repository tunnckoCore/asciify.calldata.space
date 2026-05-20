import { decodeHbs, encodeHbs } from "@/lib/hbs";

const some = {
  block_number: 22191567,
  block_hash: `0x56d300c3969337054d4159d38d30d7fcb447135c12593d484239c592e12e7472`,
  block_timestamp: 1743721691,
  transaction_hash: `0xa51759f47d949e755de3c30964e0fb14d7b638a12354fd40fc62eba0313e2653`,
  transaction_index: 92,
  transaction_value: 0,
  transaction_fee: 25103474279928,
  gas_price: 908755947,
  gas_used: 27624,
  creator: "0xc2402ddb90e98a4e2fe8f485ec1e6c5b85aeb41d",
  receiver: "0xc2402ddb90e98a4e2fe8f485ec1e6c5b85aeb41d",
  content_type: "image/png",
  content_sha: `0x535a413ab2455460d1ea6854fb1e31caeaebcf39cab8734930b9252cf41ec337`,
  ethscription_number: "6169177",
  current_owner: "0x4212d149f77308a87ce9928f1095eddb894f4d68",
  previous_owner: "0x1776cfdcffc21cd51b35d1efaf5b3db4848da1d7",
};

// function encodeHbs2(data: Record<string, string | number>) {
//   const str = encodeHbsPayload(sortObjectKeys(data));
//   const sha = bytesToHex(sha256(new TextEncoder().encode(str)));
//   return `hbs2.${sha.slice(0, 12)}.${str.length}.${str}.${sha.slice(8, 12)}`;
// }

// function decodeHbs2(str: string) {
//   const [prefix, sha12, len, ...rest] = str.split(".");
//   const prepPayload = rest.join(".");
//   const payload = prepPayload.slice(0, -5);
//   const checksum = str.slice(-4);
//   const pload = decodeHbsPayload(payload, { partial: true });

//   return {
//     prefix,
//     sha12,
//     len,
//     payload: pload,
//     checksum,
//     valid: sha12.slice(-4) === checksum,
//   };
// }

const encoded = encodeHbs(some);
// => hbs2.cc988eb7516f.732.14:block_datetime24:2025-04-03T23:08:11.000Z10:block_hash66:0x56d300c3969337054d4159d38d30d7fcb447135c12593d484239c592e12e747212:block_number8:2219156711:content_sha66:0x535a413ab2455460d1ea6854fb1e31caeaebcf39cab8734930b9252cf41ec33712:content_type9:image/png7:creator42:0xc2402ddb90e98a4e2fe8f485ec1e6c5b85aeb41d13:current_owner42:0x4212d149f77308a87ce9928f1095eddb894f4d6819:ethscription_number7:61691779:gas_price9:9087559478:gas_used5:2762414:previous_owner42:0x1776cfdcffc21cd51b35d1efaf5b3db4848da1d78:receiver42:0xc2402ddb90e98a4e2fe8f485ec1e6c5b85aeb41d15:transaction_fee14:2510347427992816:transaction_hash66:0xa51759f47d949e755de3c30964e0fb14d7b638a12354fd40fc62eba0313e265317:transaction_index2:9217:transaction_value1:0.516f

console.log(encoded);

const decoded = decodeHbs(encoded);
console.log(decoded);
