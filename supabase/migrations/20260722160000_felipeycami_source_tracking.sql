-- Add source tracking columns to wedding_guests for idempotent imports
ALTER TABLE public.wedding_guests ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT 'google_sheets';
ALTER TABLE public.wedding_guests ADD COLUMN IF NOT EXISTS source_row_id TEXT;
ALTER TABLE public.wedding_guests ADD COLUMN IF NOT EXISTS source_sheet_name TEXT DEFAULT 'BD_MAESTRA_INVITADOS';
ALTER TABLE public.wedding_guests ADD COLUMN IF NOT EXISTS source_row_number INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wedding_guests_source_row ON public.wedding_guests(source_row_id) WHERE source_row_id IS NOT NULL;
