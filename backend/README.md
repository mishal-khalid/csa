# CSA Portal API

The backend for the CSA Portal (portal.agee.pro), served at api.agee.pro. NestJS, Prisma and
Supabase Postgres, deployed on Vercel as its own project (root directory `backend`).

## What it does

- `POST /auth/lookup`: tells the portal whether an email or username has an account (the green
  tick).
- `POST /auth/login` and `POST /auth/logout`: sign in and sign out.
- `GET /auth/me`: the signed-in account, or `null`.
- User Management (admins only):
  - `GET /users`: every account;
  - `POST /users`: create one;
  - `PATCH /users/:id`: change its name, username, email, password or role;
  - `DELETE /users/:id`: delete it, with its username typed out to confirm;
  - `POST /users/:id/password`: show its password.
- Fingerprint Management (the main account only): `GET /fingerprints`; `POST /fingerprints/options`
  then `POST /fingerprints` to add one; `PATCH` and `DELETE /fingerprints/:id` (the name typed out
  to delete); `POST /fingerprints/:id/accounts` and `DELETE /fingerprints/:id/accounts/:userId` to
  link and unlink accounts.
- The Directory (read by any signed-in account, changed by admins): `GET /directory` (every entry,
  as a flat list); `POST /directory` to add a folder or entry; `PATCH /directory/:id` for its name,
  kind, head and contact details; `POST /directory/bulk` to add many at once (a tree of up to 300,
  all or nothing); `POST /directory/:id/move` to move or reorder it; `DELETE
  /directory/:id` (only when nothing is inside it).
- Fingerprint sign-in: `POST /auth/fingerprint/options`, then `POST /auth/fingerprint`. A fingerprint
  linked to one account signs straight in; one linked to several answers with the accounts, and
  `POST /auth/fingerprint/choose` signs in to the one picked.

## Security layers

- **Passwords:** hashed with argon2id at OWASP's recommended cost, which is what logins check.
  New ones must be at least 10 characters. One found in known data breaches (checked with Have I
  Been Pwned) gets a warning, which has to be accepted to use it anyway.
- **Shown passwords:** so User Management can show passwords, each is also kept encrypted
  (AES-256-GCM with `PASSWORD_KEY`, bound to its account). Anyone with both the key and a copy of
  the database could read them all, so the key lives only in `.env` and Vercel's settings. Every
  password shown is logged.
- **Locking:** five wrong passwords in a row lock the account for 15 minutes; the right password
  doesn't unlock it early.
- **Rate limits:** per IP address, shared by every server instance.
  - lookups: 30 a minute and 300 an hour;
  - logins: 20 per 10 minutes.
- **Timing:** lookups and logins take a fixed minimum time, and a login for a missing account
  still hashes a password, so response times reveal nothing.
- **Sessions:** kept on the server.
  - The cookie holds a random 256-bit token; the database stores only its SHA-256 hash.
  - The cookie is httpOnly, Secure, SameSite=Strict and `__Host-`.
  - Sessions end after 12 hours, or 30 minutes idle; logging out ends them on the server.
- **Cross-site protection:** CORS only for the portal's origin; every other request must come from
  the portal and be JSON.
- **Server checks:** security headers (helmet), 64 KB request bodies, and strict validation of
  every input (unknown fields are refused).
- **Database:** the tables live in a private `portal` schema that Supabase's Data API doesn't
  expose. Row-level security is on, and Supabase's API roles have no access.
- **Sign-in record:** every login, failure, lock and logout is logged, and so is every account
  created, changed or deleted in User Management, with who did it.
- **Roles:** `CITIZEN`, `STAFF` and `ADMIN`, enforced with `@Roles(...)` on routes.
- **The main account:** one account (made with `npm run user:create`) is the portal's main account.
  It's always an admin, only it can change or see itself, and it can't be deleted. Nobody can change
  their own role or delete their own account. Changes are limited to 60 a minute per admin, and
  shown passwords to 30.
- **New passwords:** setting someone's password signs them out everywhere and lifts any lock.
- **Fingerprints:** passkeys (WebAuthn). The device's own reader checks the finger, and the portal
  stores only each passkey's public key, never a fingerprint. Readings must be signed by the
  device, for this site, with the finger (or the device's PIN) checked. Each reading's challenge
  works once, within 5 minutes, and a passkey whose use count goes backwards is refused as a copy.
  Fingerprint sign-in has its own rate limits (20 per 10 minutes per IP address).
  Passkeys only work on the address they were added on, so fingerprints added on portal.agee.pro
  must be added again if the portal moves to another domain.

## Setting up Supabase (once)

1. In Supabase → SQL Editor, run `supabase/setup.sql`, with your own long random password. It
   creates the `prisma` database user.
2. Put the Supabase settings in `.env.supabase` (kept out of git, like `.env`), from
   `.env.example`. Use Supabase → Connect → ORMs → Prisma for the two connection strings, with the
   `prisma` user and its password. Local development keeps using `.env` and the test database.
3. Run the migrations: `npm run supabase:migrate` (`npm run supabase:status` shows where they're at).
4. Create the main account: `npm run supabase:user`, answering `y` when it asks whether this is the
   main account. It asks for the details and the password, which is typed hidden. Other accounts
   can then be made in the portal's User Management.

## Developing locally

Everything runs on this machine, with a throwaway test database instead of Supabase.

- `npm run db:local`: the test database, on port 5433. Keep it running.
- `npm run db:migrate`: sets the test database up.
- `npm run db:seed-dev`: a test account (`test.user`), with the password in `.env`.
- `npm run start:dev`: the API on http://localhost:3300.
- `npm run test:e2e`: the end-to-end checks.

## Deploying to Vercel

Create a Vercel project from this repository with **Root Directory** `backend`. Set the
environment variables from `.env.example`: the Supabase connection strings, `COOKIE_SECRET` and
`PASSWORD_KEY` (the same values as in `.env.supabase`), and `PORTAL_ORIGIN=https://portal.agee.pro`.
Then add the domain `api.agee.pro`.
