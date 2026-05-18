import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlitePath = resolve(process.cwd(), "data/ethscriptions.sqlite");
const tablesSqlPath = resolve(process.cwd(), "scripts/tables.sql");

export const sqlite = new Database(sqlitePath);
sqlite.exec(readFileSync(tablesSqlPath, "utf8"));

export const db = drizzle(sqlite, { schema });

export { schema };
