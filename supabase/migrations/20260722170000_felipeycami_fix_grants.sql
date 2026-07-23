-- Migration: Specific Role Table Grants for F&C Management Tables
-- File: supabase/migrations/20260722170000_felipeycami_fix_grants.sql

-- Revoke all privileges from anon and authenticated on all 11 management tables
REVOKE ALL ON public.wedding_guests FROM anon, authenticated;
REVOKE ALL ON public.wedding_tables FROM anon, authenticated;
REVOKE ALL ON public.seating_assignments FROM anon, authenticated;
REVOKE ALL ON public.vendors FROM anon, authenticated;
REVOKE ALL ON public.expenses FROM anon, authenticated;
REVOKE ALL ON public.expense_payments FROM anon, authenticated;
REVOKE ALL ON public.guest_contact_events FROM anon, authenticated;
REVOKE ALL ON public.sync_outbox FROM anon, authenticated;
REVOKE ALL ON public.sync_conflicts FROM anon, authenticated;
REVOKE ALL ON public.audit_log FROM anon, authenticated;
REVOKE ALL ON public.admin_profiles FROM anon, authenticated;

-- Grant explicitly SELECT, INSERT, UPDATE, DELETE ONLY to authenticated (NO TRUNCATE, TRIGGER, REFERENCES)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wedding_guests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wedding_tables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seating_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_contact_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_outbox TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_conflicts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_profiles TO authenticated;
