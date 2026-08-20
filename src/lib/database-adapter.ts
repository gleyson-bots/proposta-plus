import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

/**
 * Banco do Proposta Plus:
 * - Desenvolvimento/local: arquivo SQLite via better-sqlite3.
 * - Vercel/produção: Turso/libSQL, mantendo compatibilidade SQLite.
 *
 * Durante `next build` na Vercel usamos um arquivo temporário apenas para
 * permitir compilação/prerender sem depender do banco remoto. Em runtime de
 * produção, Turso é obrigatório para impedir perda silenciosa de dados.
 */
export function createDatabaseAdapter() {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();

  if (tursoUrl) {
    return new PrismaLibSQL({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
    });
  }

  const isBuild =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.npm_lifecycle_event === "vercel-build";

  if (process.env.VERCEL && !isBuild) {
    throw new Error(
      "Banco SQLite persistente não configurado na Vercel. Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.",
    );
  }

  const localUrl = process.env.VERCEL
    ? "file:/tmp/proposta-plus-build.db"
    : process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";

  if (!localUrl.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL precisa apontar para um arquivo SQLite local, por exemplo file:./prisma/dev.db.",
    );
  }

  return new PrismaBetterSqlite3({ url: localUrl });
}
