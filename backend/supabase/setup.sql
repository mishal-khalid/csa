-- Run once in Supabase → SQL Editor, before the first migration. It creates the database user the
-- backend connects as. Replace the password with a long random one (e.g. openssl rand -base64 32)
-- and put the same password in the backend's .env.
--
-- The user can create the backend's own "portal" schema and owns everything in it. It bypasses
-- row-level security, which stays switched on for every other database role.

create user "prisma" with password 'REPLACE-WITH-A-LONG-RANDOM-PASSWORD' bypassrls;

-- lets the Supabase dashboard show and manage what this user creates
grant "prisma" to "postgres";

-- lets it create the "portal" schema in the first migration
grant create on database postgres to "prisma";
