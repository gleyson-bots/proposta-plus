import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

/**
 * Banco do Proposta Plus:
 * - Desenvolvimento/local: arquivo SQLite via better-sqlite3.
 * - Vercel/produção: Turso/libSQL, mantendo compatibilidade SQLite.
 *
 * Não fazemos fallback para arquivo local na Vercel porque o filesystem das
 * Functions é efêmero e não deve ser usado como banco persistente.
 */
export function createDatabaseAdapter() {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();

  if (tursoUrl) {
    return new PrismaLibSQL({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
    });
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Banco SQLite persistente não configurado na Vercel. Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.",
    );
  }

  const localUrl = process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";

  if (!localUrl.startsWith("file:")) {
    throw new Error(
      "Em desenvolvimento, DATABASE_URL precisa apontar para um arquivo SQLite, por exemplo file:./prisma/dev.db.",
    );
  }

  return new PrismaBetterSqlite3({ url: localUrl });
}
