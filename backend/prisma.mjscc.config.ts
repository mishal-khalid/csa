import "dotenv/config";
import { defineConfig } from "prisma/config";

// The MJSCC evaluation's database, kept apart from the portal's (prisma.config.ts): its own schema
// file, migrations and connection, as its own database user. Used with --config, e.g.
// `prisma migrate deploy --config prisma.mjscc.config.ts` (npm run mjscc:migrate).
export default defineConfig({
  schema: "prisma/mjscc/schema.prisma",
  migrations: {
    path: "prisma/mjscc/migrations",
  },
  datasource: {
    url: process.env["MJSCC_DIRECT_URL"] ?? process.env["MJSCC_DATABASE_URL"],
  },
});
