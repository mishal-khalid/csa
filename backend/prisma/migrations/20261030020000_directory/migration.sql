-- The Directory: everything under the CSA, in folders and inside one another. It starts with an
-- empty Cabinet folder (the departments' folder). Locked down like every other portal table.

-- AlterEnum
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'DIRECTORY_ADDED';
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'DIRECTORY_UPDATED';
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'DIRECTORY_MOVED';
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'DIRECTORY_DELETED';

-- CreateTable
CREATE TABLE "portal"."directory_entries" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "folder" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "head_name" TEXT,
    "head_post" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directory_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "directory_entries_parent_id_position_idx" ON "portal"."directory_entries"("parent_id", "position");

-- AddForeignKey
ALTER TABLE "portal"."directory_entries" ADD CONSTRAINT "directory_entries_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "portal"."directory_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Row-level security, as on the other tables (only the backend's own database user gets past it)
ALTER TABLE "portal"."directory_entries" ENABLE ROW LEVEL SECURITY;

-- Supabase's API roles only exist on Supabase, so this is skipped on a local test database.
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON "portal"."directory_entries" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;

-- The Cabinet folder, at the top
INSERT INTO "portal"."directory_entries" ("id", "folder", "name", "position", "created_at", "updated_at")
VALUES (gen_random_uuid(), true, 'Cabinet', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
