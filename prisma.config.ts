import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI trabalha sobre o arquivo SQLite local. Na Vercel, o runtime
    // usa TURSO_DATABASE_URL através do adapter libSQL em src/lib/database-adapter.ts.
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  },
});
