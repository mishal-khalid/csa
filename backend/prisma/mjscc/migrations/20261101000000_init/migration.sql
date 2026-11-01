-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "mjscc";

-- CreateEnum
CREATE TYPE "mjscc"."Part" AS ENUM ('THEORY', 'DRILL', 'COMMANDING', 'INSPECTION');

-- CreateTable
CREATE TABLE "mjscc"."instructors" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mjscc"."sessions" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "instructor_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mjscc"."scores" (
    "instructor_id" UUID NOT NULL,
    "student" INTEGER NOT NULL,
    "part" "mjscc"."Part" NOT NULL,
    "item" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("instructor_id","student","part","item")
);

-- CreateTable
CREATE TABLE "mjscc"."inspection_notes" (
    "instructor_id" UUID NOT NULL,
    "student" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_notes_pkey" PRIMARY KEY ("instructor_id","student")
);

-- CreateTable
CREATE TABLE "mjscc"."command_draws" (
    "student" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "command" INTEGER NOT NULL,

    CONSTRAINT "command_draws_pkey" PRIMARY KEY ("student","position")
);

-- CreateTable
CREATE TABLE "mjscc"."rate_limits" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key","window_start")
);

-- CreateIndex
CREATE UNIQUE INDEX "instructors_name_key_key" ON "mjscc"."instructors"("name_key");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "mjscc"."sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_instructor_id_idx" ON "mjscc"."sessions"("instructor_id");

-- AddForeignKey
ALTER TABLE "mjscc"."sessions" ADD CONSTRAINT "sessions_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "mjscc"."instructors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mjscc"."scores" ADD CONSTRAINT "scores_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "mjscc"."instructors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mjscc"."inspection_notes" ADD CONSTRAINT "inspection_notes_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "mjscc"."instructors"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A score is never outside 0–5, even if something got past the API's own checks (theory's 0–3 is
-- checked there).
ALTER TABLE "mjscc"."scores" ADD CONSTRAINT "scores_value_range" CHECK ("value" BETWEEN 0 AND 5);

-- Locks the tables down for everyone but their owner, the "mjscc" database user. The schema isn't
-- exposed by Supabase's Data API, but in case it ever is: row-level security with no policies
-- refuses every row, and Supabase's public roles get no access to the schema at all.
ALTER TABLE "mjscc"."instructors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mjscc"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mjscc"."scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mjscc"."inspection_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mjscc"."command_draws" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mjscc"."rate_limits" ENABLE ROW LEVEL SECURITY;

-- Supabase's API roles only exist on Supabase, so this is skipped on a local test database.
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA "mjscc" FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA "mjscc" FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA "mjscc" FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "mjscc" FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "mjscc" REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "mjscc" REVOKE ALL ON SEQUENCES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "mjscc" REVOKE ALL ON FUNCTIONS FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
