-- Migration: Add default gen_random_uuid() to admin_profiles id column
ALTER TABLE public.admin_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
