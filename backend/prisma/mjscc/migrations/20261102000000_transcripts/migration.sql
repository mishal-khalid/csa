-- CreateTable
CREATE TABLE "mjscc"."transcript_files" (
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcript_files_pkey" PRIMARY KEY ("name")
);

-- Locked down like the init migration's tables: row-level security with no policies, and nothing for
-- Supabase's API roles (which only exist on Supabase).
ALTER TABLE "mjscc"."transcript_files" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON "mjscc"."transcript_files" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
