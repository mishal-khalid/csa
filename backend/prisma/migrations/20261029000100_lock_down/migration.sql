-- Locks the portal's tables down for everyone but the backend's own database user ("prisma", which
-- bypasses row-level security). The "portal" schema isn't exposed by Supabase's Data API, but in
-- case it ever is: row-level security with no policies refuses every row, and Supabase's public
-- roles get no access to the schema at all.

ALTER TABLE "portal"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal"."auth_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal"."rate_limits" ENABLE ROW LEVEL SECURITY;

-- Supabase's API roles only exist on Supabase, so this is skipped on a local test database.
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA "portal" FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA "portal" FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA "portal" FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "portal" FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "portal" REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "portal" REVOKE ALL ON SEQUENCES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "portal" REVOKE ALL ON FUNCTIONS FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
