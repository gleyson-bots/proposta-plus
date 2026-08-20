import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export function hasPersistentDatabase() {
  return Boolean(process.env.TURSO_DATABASE_URL?.trim());
}

/**
 * Banco do Proposta Plus:
 * - Desenvolvimento/local: arquivo SQLite via better-sqlite3.
 * - Vercel/produção: Turso/libSQL, mantendo compatibilidade SQLite.
 *
 * Na Vercel sem Turso configurado nós NÃO derrubamos a renderização pública.
 * Um SQLite temporário em /tmp é criado apenas para permitir que módulos que
 * importam Prisma sejam carregados. As operações autenticadas validam a
 * configuração persistente antes de consultar o banco.
 */
export function createDatabaseAdapter() {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();

  if (tursoUrl) {
    return new PrismaLibSql({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
    });
  }

  const localUrl = process.env.VERCEL
    ? "file:/tmp/proposta-plus-runtime.db"
    : process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db";

  if (!localUrl.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL precisa apontar para um arquivo SQLite local, por exemplo file:./prisma/dev.db.",
    );
  }

  return new PrismaBetterSqlite3({ url: localUrl });
}
