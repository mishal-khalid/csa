-- User Management: permanent account numbers, the main account, passwords that can be shown, and
-- a record of what admins change.

-- AlterEnum
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'USER_CREATED';
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'USER_UPDATED';
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'USER_DELETED';
ALTER TYPE "portal"."AuthEventType" ADD VALUE 'PASSWORD_VIEWED';

-- AlterTable
ALTER TABLE "portal"."auth_events" ADD COLUMN "detail" TEXT,
ADD COLUMN "target_id" UUID;

-- AlterTable
ALTER TABLE "portal"."users" ADD COLUMN "main_account" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "password_sealed" TEXT,
ADD COLUMN "number" INTEGER;

-- Accounts that already exist are numbered in the order they were made; new ones carry on from
-- there (the same SERIAL column Prisma would make, filled in first).
UPDATE "portal"."users" AS u SET "number" = n.position
FROM (SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS position FROM "portal"."users") AS n
WHERE u."id" = n."id";
CREATE SEQUENCE "portal"."users_number_seq" AS INTEGER OWNED BY "portal"."users"."number";
SELECT setval('"portal"."users_number_seq"', COALESCE((SELECT max("number") FROM "portal"."users"), 0) + 1, false);
ALTER TABLE "portal"."users" ALTER COLUMN "number" SET DEFAULT nextval('"portal"."users_number_seq"'),
ALTER COLUMN "number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_number_key" ON "portal"."users"("number");

-- At most one main account. (Prisma's schema can't describe a partial index, so it lives here.)
CREATE UNIQUE INDEX "users_one_main_account" ON "portal"."users"("main_account") WHERE "main_account";
