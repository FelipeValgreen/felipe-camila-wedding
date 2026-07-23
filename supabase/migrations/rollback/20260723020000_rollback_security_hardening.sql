-- RESTORATION RUNBOOK & ROLLBACK MIGRATION V4.2
-- File: supabase/migrations/rollback/20260723020000_rollback_security_hardening.sql

-- ============================================================================
-- RESTORATION RUNBOOK PROCEDURE
-- ============================================================================
-- 1. Operational Google Sheets Data Restoration:
--    Restore master data from native backup tabs (BK_MAESTRA_...) in spreadsheet
--    ID: 1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0 or import local FC_Centro_Comandos_Backup.xlsx.
-- 2. Vercel Project Promotion:
--    To revert Next.js application version, promote previous Vercel deployment ID in Vercel Dashboard.
-- 3. Database & Policy Safety Verification:
--    Run the idempotent SQL statements below to verify database stability.
-- ============================================================================

-- Ensure security schema and security.get_my_role function are intact
CREATE SCHEMA IF NOT EXISTS security;

CREATE OR REPLACE FUNCTION security.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.admin_profiles
  WHERE id = auth.uid() AND active = true;

  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION security.get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION security.get_my_role() FROM anon;
GRANT EXECUTE ON FUNCTION security.get_my_role() TO authenticated;

-- Ensure update_updated_at_column remains SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM authenticated;
