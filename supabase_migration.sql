-- Supabase SQL Migration
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.guest_photo_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    guest_token TEXT,
    guest_name TEXT,
    invite_label TEXT,
    session_id TEXT,
    original_filename TEXT,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    device_type TEXT,
    browser TEXT,
    user_agent TEXT,
    ip_hash_or_null TEXT,
    approved BOOLEAN DEFAULT true, -- Assuming auto-approve for wedding dynamic
    visible_in_gallery BOOLEAN DEFAULT true,
    notes TEXT
);

-- Note: We are not enforcing foreign keys here since we want an additive/lightweight guest system.

-- Enable RLS
ALTER TABLE public.guest_photo_uploads ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (Guests uploading)
DROP POLICY IF EXISTS "Allow public inserts" ON public.guest_photo_uploads;
CREATE POLICY "Allow public inserts" ON public.guest_photo_uploads
    FOR INSERT WITH CHECK (true);

-- Allow public selects for approved photos
DROP POLICY IF EXISTS "Allow public select of approved photos" ON public.guest_photo_uploads;
CREATE POLICY "Allow public select of approved photos" ON public.guest_photo_uploads
    FOR SELECT USING (approved = true AND visible_in_gallery = true);

-- Enable public uploads to storage bucket if not already configured 
-- (Assuming bucket 'wedding-photos' exists and allows public inserts, if not, you must configure that from the Storage settings)
