import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

export function getSqliteUrl() {
  return process.env.VERCEL
    ? "file:/tmp/proposta-plus.db"
    : process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";
}

/**
 * Banco único do Proposta Plus: SQLite via better-sqlite3.
 *
 * Local: prisma/dev.db
 * Vercel: /tmp/proposta-plus.db (efêmero entre cold starts/instâncias)
 */
export function createDatabaseAdapter() {
  const url = getSqliteUrl();

  if (!url.startsWith("file:")) {
    throw new Error("DATABASE_URL precisa usar SQLite no formato file:./caminho.db");
  }

  return new PrismaBetterSqlite3({ url });
}
