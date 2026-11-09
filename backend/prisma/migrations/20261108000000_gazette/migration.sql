-- The CSA Gazette: drafts made in the portal's Gazette tab, and every published document (the
-- Gazette Register). Locked down like every other portal table.

-- AlterEnum
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'GAZETTE_DRAFTED';
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'GAZETTE_UPDATED';
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'GAZETTE_PUBLISHED';
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'GAZETTE_DELETED';

-- CreateEnum
CREATE TYPE "portal"."GazetteState" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "portal"."gazette_documents" (
    "id" UUID NOT NULL,
    "state" "portal"."GazetteState" NOT NULL DEFAULT 'DRAFT',
    "serial" INTEGER,
    "volume" INTEGER,
    "number" INTEGER,
    "legacy_index" TEXT,
    "body" TEXT NOT NULL DEFAULT 'csa',
    "type" TEXT NOT NULL,
    "doc_number" TEXT,
    "series_number" INTEGER,
    "series_year" INTEGER,
    "reference" TEXT,
    "tag" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "issuing_body" TEXT,
    "published_on" DATE,
    "commences_on" DATE,
    "status" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "cover" BOOLEAN NOT NULL DEFAULT false,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "notes" JSONB NOT NULL DEFAULT '[]',
    "sources" JSONB NOT NULL DEFAULT '{}',
    "files" JSONB NOT NULL DEFAULT '[]',
    "created_by_id" UUID,
    "published_by_id" UUID,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gazette_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gazette_documents_serial_key" ON "portal"."gazette_documents"("serial");
CREATE UNIQUE INDEX "gazette_documents_legacy_index_key" ON "portal"."gazette_documents"("legacy_index");
CREATE INDEX "gazette_documents_state_serial_idx" ON "portal"."gazette_documents"("state", "serial");

-- A number in a series is never given to two published documents, even after one is repealed
-- (Director's Order Number 01/2026, point 18); nor is a Gazette Number twice in a year.
CREATE UNIQUE INDEX "gazette_documents_series_key" ON "portal"."gazette_documents"("type", "series_year", "series_number")
  WHERE "state" = 'PUBLISHED' AND "series_number" IS NOT NULL;
CREATE UNIQUE INDEX "gazette_documents_number_key" ON "portal"."gazette_documents"((EXTRACT(YEAR FROM "published_on")), "number")
  WHERE "state" = 'PUBLISHED' AND "number" IS NOT NULL;

-- Row-level security, as on the other tables (only the backend's own database user gets past it)
ALTER TABLE "portal"."gazette_documents" ENABLE ROW LEVEL SECURITY;

-- Supabase's API roles only exist on Supabase, so this is skipped on a local test database.
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON "portal"."gazette_documents" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
