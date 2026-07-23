-- Migration: Add last_imported_at and last_dashboard_update_at to wedding_guests
ALTER TABLE public.wedding_guests ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ;
ALTER TABLE public.wedding_guests ADD COLUMN IF NOT EXISTS last_dashboard_update_at TIMESTAMPTZ;
