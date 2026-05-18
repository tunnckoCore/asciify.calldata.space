import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Database } from "bun:sqlite";

const dbPath = path.join(process.cwd(), "data", "ethscriptions.sqlite");
const schemaPath = path.join(process.cwd(), 'scripts', "tables.sql");

await mkdir(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
const schema = await readFile(schemaPath, "utf8")

db.exec(schema);
db.close();

console.log(`Bootstrapped SQLite database at ${dbPath}`);
