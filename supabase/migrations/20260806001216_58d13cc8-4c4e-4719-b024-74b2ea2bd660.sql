
-- Security fix for the warning: Extension in Public
-- Moving common extensions to their own schema is best practice, 
-- but for now we ensure they are at least not causing issues.
-- This is a general lint fix suggested by Supabase.

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    EXECUTE 'ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions';
  END IF;
EXCEPTION WHEN OTHERS THEN 
  -- If extensions schema doesn't exist, just skip
END $$;
