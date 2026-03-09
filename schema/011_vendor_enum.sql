-- Run this FIRST. Adds 'vendor' to user_role enum.
-- PostgreSQL requires new enum values to be committed before use, so this must run
-- in its own transaction. Then run 011_vendor_access.sql.

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE 'vendor';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
