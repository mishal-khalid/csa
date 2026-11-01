-- Run once in Supabase → SQL Editor, before the MJSCC evaluation's first migration. It creates the
-- database user the evaluation connects as. Replace the password with a long random one (e.g.
-- openssl rand -base64 32) and put the same password in MJSCC_DATABASE_URL and MJSCC_DIRECT_URL.
--
-- The user creates the evaluation's own "mjscc" schema in its first migration and owns everything
-- in it. It gets no access to the CSA Portal's "portal" schema, and the portal's "prisma" user gets
-- none to "mjscc": neither can read the other's tables.

create user "mjscc" with password 'REPLACE-WITH-A-LONG-RANDOM-PASSWORD';

-- lets the Supabase dashboard show and manage what this user creates
grant "mjscc" to "postgres";

-- lets it create the "mjscc" schema in the first migration
grant create on database postgres to "mjscc";
