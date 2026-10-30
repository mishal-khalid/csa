import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations run over the direct connection (DIRECT_URL); the app itself uses the pooled one
// (DATABASE_URL, see src/prisma.service.ts). Locally both point at the same test database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
