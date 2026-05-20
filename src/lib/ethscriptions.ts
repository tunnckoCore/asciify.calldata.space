// https://explorer.ethscriptions.com/api/v2/tokens/{contract_id}/instances
// https://explorer.ethscriptions.com/api/v2/tokens/{contract_id}
//

// Collections Contracts
// 0x5B0325a1eCF7681F7a67F5fbB53fC4f9ECe88b08 - Ethereum Punks
// 0x08F3b1e311A1f7aDdb04A3d683BB1229490D1c86 - Missing Phunks
// 0x8D919A0f3BF23a38a2679E4735390d883436c7Bb - EtherPhunks
// 0xCe5c03B8e12510a47c0CfE3aB88Cde5B57515169 - Transformative Appropriation Punks
// 0x4baaA9c3CcCf59f9c49DB315264Cd48BcA85321a - Steam Punks
// 0xbd7f45Dc9E52b68f54b132CdCeAc5334097BF5ce - Ethereum Punk Apes
// 0x1332ACeCe2181F0A7F1481F7E7223C710dFcd526 - Punkscriptions
// 0x115E478F5cF614fDC45DfA03A6C27A7ddc426C45 - punks12px
// 0xcBCe5703CEbBF023d1b8F777f71b1CC4e622345c - mfgrrs
// 0xBCaC1c9C9848a47F6a49E886eC66E81A859b47Fa - mfpurrs
// 0x68F514f349AB4Eee5d4Bbc9B314Fe9ff10f4c05e - mfpurr-neko
// 0xCF43dF9aCb5ead4e9BBD6Af288dcA7CAb02CFEB5 - mfpurrfect
// 0xE18B977D83324C75D852BA269E4d4b161430Ebe8 - Commando Purrs
// 0xa5C12c5c19aC186a2c87e957970574B43B1bd96A - Prowling Purrs
// 0xFbF7bB7d5d93AE957f6113d7b56C456e5c8Ae717 - Spooky Purrs
// 0x44c72E629F5df3696B44f4603f14b5A08c6F8e97 - MfMickeys
// 0xe4d4F23eA2F0E3bDE225F4205383C4c56488ee73 - Mickey-Mouse
// 0x88270df5B135B5A955E3298b90A0BD4B28EE987d - EthCreatures
// 0x4858BcA449387f7840E93785672E36A9F12bAcE9 - EthsColors
// 0xDdc91052d6AcD9f35f2301dC347Ed66f7585d83a - Moonbirds
// 0xd76cdF03dC30CC67a4000410f57e1db14D75E4a3 - 0xNeko Cats
// 0x95E1F1A79C1E69C4c191b4eDb58b037d98145f50 - Script Piggies
// 0x531483D65EB7B75B5AdfC3331f301A836A0Eb3Bb - Nakamingos
// 0x0BF8f93C10d56734F7ea2e8b0Ca6f6627e4E62af - Missprint-mingos
// 0xBB41E24dA83DcAb001bd085879c66cFCB4eED522 - Call Data Comrades
// 0x4C276E1b53C34E2fC659d76b091e54a8501F4c96 - Comrades of the Dead
// 0x5D5ebc7BffB886e94a09a757f81975Ee300aab92 - Cuberekt Comrade
// 0x015Dfb804BFE6EBb921c1D05cb83C1aB02EBEf08 - Milady on-chain
// 0x7bBFd8c95BC24eE858E1dBbE7dF6307c625FCa70 - Nodemonkeths
// 0xC56C71b882dba012444eeA5CB937b8D26f5CCaD0 - NodePurrs
// 0x3dd192167111C7f5668C887519d7Ea8B000C8a50 - ittybits
// 0x6F157C7Ede6b24caD0b94D43D6bbAa85d8bd916d - peeperz
// 0xE5cCCfDDe467Beec545a68096810FFFeFf050F2e - hypocrittez
// 0x4b3172108616C439ef1Ba9B1A18d0AB4b9844362 - The Darwins
// 0xC7f712d47c409Eae5841d77e0e70d91921f03F77 - ScriptToadz
// 0xac25BB088814da6e84d2DBcedBe74379A4a7E130 - Plushscriptions
// 0x57fcDc8fc1fC39AdC4aCF428D2c9DAB7d4822b72 - Inscripigeons
// 0x8da6eFDc9037F8cbC5c9dA65fFaB76f0C205de24 - Digijoint
// 0x8A0cAb6d0C754E97AdD0085B511743B3b82CeE82 - Scribed Bricks
// 0x82F2511A38F44B3C8286F616407aEAf4d1fFb1fE - Indelible Apes
// 0x203A0b0D4fab46F81FA388EbA1FD51f1f96FBE24 - Darknezz
// 0x6464C1eF7175c08994Ae40901975569aE192E630 - PepePunks DAO
// 0x41d34a994091307e3beC3166e6d477156B32c1f1 - The 251
// 0xb857293D6fB296E337e3363248eC13ECD573b79E - The 151
// 0x3FB712A48567134EA6dF356b2DcD54fCa8c9e8A8 - DEATHBLOCK
// 0xbB072E55FAb66931779ab833cE101c3565649453 - BLOCKS
// 0xd7D0b43EDbd5dcF92600913766F20e8D7f2c8f61 - Gooseverse.eth
// 0x8D23f29a5aB7813086Be875BA60EB0AABF7f5080 - DOCTORdripp Wearable Stars
// 0x1115d81087890b05AD8C703f09a9F64aeE49e653 - Blood, Trinity, & Coin
// 0x88a3AE3FF376a5dbbe728C8b6E81a492E81FFD44 - Illegal Artifacts

import { Database } from "bun:sqlite";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import collections from "./collections";

const API_BASE_URL = "https://explorer.ethscriptions.com/api/v2";
const OUTPUT_DIR = path.join(process.cwd(), "data", "ethscriptions");
const DB_PATH = path.join(process.cwd(), "data", "ethscriptions.sqlite");

type CollectionName = (typeof collections)[number]["name"];
type Collection = (typeof collections)[number];

type TokenInstance = {
  id: string | number;
  metadata?: {
    ethscription_id?: string;
    ethscription_number?: string | number;
    attributes?: unknown;
  };
};

type InstancesResponse = {
  items: TokenInstance[];
  next_page_params?: {
    unique_token?: number;
  } | null;
};

type CollectionItemRow = {
  token_id: number;
  ethscription_id: string;
  ethscription_number: number;
  attributes: unknown;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function csvEscape(value: unknown) {
  const str = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${str.replaceAll(`"`, `""`)}"`;
}

function findCollection(name: string): Collection {
  const needle = name.toLowerCase();
  const collection = collections.find(
    (collection) =>
      collection.name.toLowerCase().includes(needle) ||
      collection.symbol.toLowerCase().includes(needle) ||
      slugify(collection.name) === slugify(name),
  );

  if (!collection) {
    throw new Error(`Unknown collection: ${name}`);
  }

  return collection;
}

function shapeItem(item: TokenInstance): CollectionItemRow {
  return {
    token_id: Number(item.id),
    ethscription_id: item.metadata?.ethscription_id.toLowerCase(),
    ethscription_number: Number(item.metadata?.ethscription_number),
    attributes: item.metadata?.attributes ?? [],
  };
}

async function fetchInstancesPage(contract: string, uniqueToken?: number) {
  const url = new URL(`${API_BASE_URL}/tokens/${contract}/instances`);

  if (uniqueToken !== undefined) {
    url.searchParams.set("unique_token", String(uniqueToken));
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as InstancesResponse;
}

function rowToCsv(row: CollectionItemRow) {
  return [
    row.token_id,
    row.ethscription_number,
    row.ethscription_id,
    csvEscape(row.attributes),
  ].join(",");
}

function normalizeAttributes(attributes: unknown) {
  if (Array.isArray(attributes)) {
    return attributes.flatMap((attribute) => {
      if (!attribute || typeof attribute !== "object") return [];

      const traitType =
        "trait_type" in attribute ? attribute.trait_type : undefined;
      const value = "value" in attribute ? attribute.value : undefined;

      if (traitType === undefined || value === undefined || value === null)
        return [];

      return [{ traitType: String(traitType), traitValue: String(value) }];
    });
  }

  if (attributes && typeof attributes === "object") {
    return Object.entries(attributes).map(([traitType, value]) => ({
      traitType,
      traitValue: String(value),
    }));
  }

  return [];
}

function openEthscriptionsDb() {
  const db = new Database(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON");

  return {
    db,
    insertCollection: db.prepare(`
      INSERT INTO collections (contract_address, name, symbol, supply)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(contract_address) DO UPDATE SET
        name = excluded.name,
        symbol = excluded.symbol,
        supply = excluded.supply
    `),
    insertItem: db.prepare(`
      INSERT INTO ethscriptions (
        contract_address,
        token_id,
        ethscription_number,
        ethscription_id
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT(contract_address, token_id) DO UPDATE SET
        ethscription_number = excluded.ethscription_number,
        ethscription_id = excluded.ethscription_id
    `),
    deleteItemAttributes: db.prepare(`
      DELETE FROM attributes
      WHERE contract_address = ? AND token_id = ?
    `),
    // contractAddress: text("contract_address").notNull(),
    // tokenId: integer("token_id").notNull(),
    // traitType: text("trait_type").notNull(),
    // traitValue: text("trait_value").notNull(),
    // ethscriptionNumber: integer("ethscription_number").notNull(),
    // ethscriptionId: text("ethscription_id").notNull(),
    insertItemAttribute: db.prepare(`
      INSERT INTO attributes (contract_address, token_id, trait_type, trait_value,ethscription_number,ethscription_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
  };
}

function insertRows(
  statements: ReturnType<typeof openEthscriptionsDb>,
  collection: Collection,
  rows: CollectionItemRow[],
) {
  const collectionId = collection.contract.toLowerCase();

  const batch = statements.db.transaction((rows: CollectionItemRow[]) => {
    for (const row of rows) {
      const tokenId = String(row.token_id);

      statements.insertItem.run(
        collectionId,
        tokenId,
        row.ethscription_number,
        row.ethscription_id,
      );
      statements.deleteItemAttributes.run(collectionId, tokenId);

      for (const attribute of normalizeAttributes(row.attributes)) {
        statements.insertItemAttribute.run(
          collectionId,
          tokenId,
          attribute.traitType,
          attribute.traitValue,
          row.ethscription_number,
          row.ethscription_id,
        );
      }
    }
  });

  batch(rows);
}

export async function fetchCollection(collectionName: CollectionName | string) {
  const collection = findCollection(collectionName);
  const filename = `${slugify(collection.name)}-${collection.contract.toLowerCase()}.csv`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const stream = createWriteStream(outputPath, { flags: "w" });
  const statements = openEthscriptionsDb();

  stream.write("token_id,ethscription_number,ethscription_id,attributes\n");
  statements.insertCollection.run(
    collection.contract.toLowerCase(),
    collection.name,
    collection.symbol,
    collection.supply,
  );

  let uniqueToken: number | undefined;
  let fetched = 0;

  try {
    while (true) {
      const page = await fetchInstancesPage(collection.contract, uniqueToken);

      const rows = page.items.map(shapeItem);

      for (const row of rows) {
        stream.write(`${rowToCsv(row)}\n`);
      }

      insertRows(statements, collection, rows);
      fetched += rows.length;

      uniqueToken = page.next_page_params?.unique_token;

      console.log("Fetched...", fetched, "of", collection.supply);
      Bun.sleep(2_000);
      if (uniqueToken === undefined || uniqueToken === null) {
        break;
      }
    }
  } finally {
    stream.end();
    statements.db.close();
  }

  console.log("Done", collection.name);
  return { collection: collection.name, fetched, outputPath, dbPath: DB_PATH };
}

await fetchCollection("nerd");
// await fetchCollection("PIGGIES");
