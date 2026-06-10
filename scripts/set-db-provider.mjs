// Sets the Prisma datasource provider based on DATABASE_URL so the same codebase
// runs on SQLite locally and PostgreSQL in production (Vercel) without edits.
//
//   file:./dev.db            -> sqlite
//   postgres(ql)://...       -> postgresql
//   mysql://...              -> mysql
//
// Runs automatically via `postinstall` and the build scripts.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "prisma", "schema.prisma");

const url = process.env.DATABASE_URL || "file:./dev.db";

let provider = "sqlite";
if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
  provider = "postgresql";
} else if (url.startsWith("mysql://")) {
  provider = "mysql";
}

const schema = readFileSync(schemaPath, "utf8");
const updated = schema.replace(
  /datasource db \{\s*provider = "(?:sqlite|postgresql|mysql)"/,
  `datasource db {\n  provider = "${provider}"`
);

if (updated !== schema) {
  writeFileSync(schemaPath, updated);
}

console.log(`[set-db-provider] datasource provider => ${provider}`);
