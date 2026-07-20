-- Supabase SQL Migration
-- Run this in the Supabase SQL Editor to set up all tables and policies

-- 1. TABLE: guest_list (Pre-populated guest codes and pass counts)
CREATE TABLE IF NOT EXISTS public.guest_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    code TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    passes INTEGER DEFAULT 1
);

-- RLS policies for guest_list
ALTER TABLE public.guest_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select of guest_list" ON public.guest_list;
CREATE POLICY "Allow public select of guest_list" ON public.guest_list
    FOR SELECT USING (true);


-- 2. TABLE: rsvp_guests (Submitted guest confirmations)
CREATE TABLE IF NOT EXISTS public.rsvp_guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    has_partner BOOLEAN DEFAULT false,
    partner_name TEXT DEFAULT '',
    dietary_restrictions TEXT DEFAULT 'Ninguna',
    partner_dietary TEXT DEFAULT ''
);

-- RLS policies for rsvp_guests
ALTER TABLE public.rsvp_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert of rsvp_guests" ON public.rsvp_guests;
CREATE POLICY "Allow public insert of rsvp_guests" ON public.rsvp_guests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select of rsvp_guests" ON public.rsvp_guests;
CREATE POLICY "Allow public select of rsvp_guests" ON public.rsvp_guests
    FOR SELECT USING (true);


-- 3. TABLE: guest_photos (Live Paparazzi Photos)
CREATE TABLE IF NOT EXISTS public.guest_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    url TEXT NOT NULL,
    uploader_name TEXT,
    event_type TEXT DEFAULT 'iglesia', -- 'civil', 'iglesia', 'preparativos', 'general'
    album TEXT DEFAULT 'Invitados', -- 'Nuestro civil', 'Preparativos', 'Invitados', 'Iglesia 2026'
    approved BOOLEAN DEFAULT true, -- Auto-approve photos by default
    visible_in_gallery BOOLEAN DEFAULT true,
    notes TEXT
);

-- RLS policies for guest_photos
ALTER TABLE public.guest_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert of guest_photos" ON public.guest_photos;
CREATE POLICY "Allow public insert of guest_photos" ON public.guest_photos
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select of guest_photos" ON public.guest_photos;
CREATE POLICY "Allow public select of guest_photos" ON public.guest_photos
    FOR SELECT USING (approved = true AND visible_in_gallery = true);
