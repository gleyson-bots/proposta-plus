import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import mysql from "mysql2/promise";

const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl) throw new Error("DATABASE_URL é necessária para preparar a base isolada de testes.");

const databaseName = `proposta_plus_test_${process.pid}_${Date.now()}`.replaceAll("-", "_");
const adminUrl = new URL(sourceUrl);
adminUrl.pathname = "/mysql";
adminUrl.search = "";
const testUrl = new URL(sourceUrl);
testUrl.pathname = `/${databaseName}`;

const secureConnection = (uri, multipleStatements = false) => mysql.createConnection({ uri, ssl: { rejectUnauthorized: true }, multipleStatements });
const admin = await secureConnection(adminUrl.toString());
try {
  await admin.query(`CREATE DATABASE \`${databaseName}\``);
  const testConnection = await secureConnection(testUrl.toString(), true);
  try {
    await testConnection.query(`
      CREATE TABLE \`users\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`openId\` varchar(64) NOT NULL,
        \`name\` text,
        \`email\` varchar(320),
        \`loginMethod\` varchar(64),
        \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`)
      );
    `);
    const migration = await readFile(new URL("../drizzle/0001_sparkling_silverclaw.sql", import.meta.url), "utf8");
    await testConnection.query(migration.replaceAll("--> statement-breakpoint", ""));
  } finally {
    await testConnection.end();
  }

  const result = spawnSync("pnpm", ["exec", "vitest", "run", "server/persistence.integration.test.ts"], {
    cwd: new URL("..", import.meta.url),
    stdio: "inherit",
    env: { ...process.env, TEST_DATABASE_URL: testUrl.toString() },
  });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
  await admin.end();
}
