-- Fingerprint Management: fingerprints (passkeys), the accounts each one signs in to, and the
-- one-time challenges fingerprint readers sign. Locked down like every other portal table.

-- AlterEnum


ALTER TYPE "portal"."AuthEventType" ADD VALUE 'FINGERPRINT_ADDED';
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'FINGERPRINT_UPDATED';
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'FINGERPRINT_DELETED';

-- CreateTable
CREATE TABLE "portal"."fingerprints" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "device_type" TEXT NOT NULL,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal"."fingerprint_accounts" (
    "fingerprint_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fingerprint_accounts_pkey" PRIMARY KEY ("fingerprint_id","user_id")
);

-- CreateTable
CREATE TABLE "portal"."webauthn_challenges" (
    "challenge" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "user_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("challenge")
);

-- CreateIndex
CREATE UNIQUE INDEX "fingerprints_credential_id_key" ON "portal"."fingerprints"("credential_id");

-- CreateIndex
CREATE INDEX "fingerprint_accounts_user_id_idx" ON "portal"."fingerprint_accounts"("user_id");

-- CreateIndex
CREATE INDEX "webauthn_challenges_expires_at_idx" ON "portal"."webauthn_challenges"("expires_at");

-- AddForeignKey
ALTER TABLE "portal"."fingerprint_accounts" ADD CONSTRAINT "fingerprint_accounts_fingerprint_id_fkey" FOREIGN KEY ("fingerprint_id") REFERENCES "portal"."fingerprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal"."fingerprint_accounts" ADD CONSTRAINT "fingerprint_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "portal"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row-level security, as on the other tables (only the backend's own database user gets past it)
ALTER TABLE "portal"."fingerprints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal"."fingerprint_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal"."webauthn_challenges" ENABLE ROW LEVEL SECURITY;

-- Supabase's API roles only exist on Supabase, so this is skipped on a local test database.
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON "portal"."fingerprints", "portal"."fingerprint_accounts", "portal"."webauthn_challenges" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
