-- Migration: Fix admin_profiles.id DROP DEFAULT
-- File: supabase/migrations/20260722220000_felipeycami_fix_admin_profiles_id_no_default.sql

ALTER TABLE public.admin_profiles ALTER COLUMN id DROP DEFAULT;
