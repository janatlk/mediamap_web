import path from "node:path";
import { defineConfig } from "prisma/config";

// Начиная с Prisma 7 файл .env сам по себе не подхватывается,
// переменные нужно загрузить явно.
import "dotenv/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "npx tsx prisma/seed.ts",
  },
});
