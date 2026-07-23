-- Migration: Cleanup Permissive Policies & Deprecated Functions V4.2
-- File: supabase/migrations/20260723020000_felipeycami_cleanup_permissive_policies.sql

-- 1. Ensure security schema and security.get_my_role() function
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

-- 2. Drop dependent policies using public.get_my_role() before dropping function
ALTER TABLE IF EXISTS public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_processed_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage whatsapp_sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Admin Manage whatsapp_processed_messages" ON public.whatsapp_processed_messages;

CREATE POLICY "Admin Manage whatsapp_sessions" ON public.whatsapp_sessions FOR ALL TO authenticated USING ( (SELECT security.get_my_role()) IN ('editor', 'owner') ) WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Admin Manage whatsapp_processed_messages" ON public.whatsapp_processed_messages FOR ALL TO authenticated USING ( (SELECT security.get_my_role()) IN ('editor', 'owner') ) WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );

-- Drop deprecated public schema helper functions completely
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;

-- 3. Ensure update_updated_at_column is SECURITY INVOKER and ungranted
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

-- 4. Drop ALL old permissive and duplicate policies on public tables

-- guest_photos
DROP POLICY IF EXISTS "Anyone can upload photos" ON public.guest_photos;
DROP POLICY IF EXISTS "Permitir insertar a todos" ON public.guest_photos;
DROP POLICY IF EXISTS "Public Insert guest_photos" ON public.guest_photos;
DROP POLICY IF EXISTS "Public Select guest_photos" ON public.guest_photos;
DROP POLICY IF EXISTS "Validated Insert guest_photos" ON public.guest_photos;

CREATE POLICY "Public Select guest_photos" ON public.guest_photos FOR SELECT TO public USING (true);
CREATE POLICY "Validated Insert guest_photos" ON public.guest_photos FOR INSERT TO public WITH CHECK (
  char_length(coalesce(uploader_name, '')) <= 100 AND
  (url LIKE 'http://%' OR url LIKE 'https://%')
);

-- rsvp_guests
DROP POLICY IF EXISTS "Permitir insertar a todos" ON public.rsvp_guests;
DROP POLICY IF EXISTS "Public Manage rsvp_guests" ON public.rsvp_guests;
DROP POLICY IF EXISTS "Validated Insert rsvp_guests" ON public.rsvp_guests;

CREATE POLICY "Validated Insert rsvp_guests" ON public.rsvp_guests FOR INSERT TO public WITH CHECK (
  char_length(name) >= 1 AND char_length(name) <= 200
);

-- song_requests
DROP POLICY IF EXISTS "Permitir insertar a todos" ON public.song_requests;
DROP POLICY IF EXISTS "Public Insert song_requests" ON public.song_requests;
DROP POLICY IF EXISTS "Validated Insert song_requests" ON public.song_requests;

CREATE POLICY "Validated Insert song_requests" ON public.song_requests FOR INSERT TO public WITH CHECK (
  char_length(song_name) >= 1 AND char_length(song_name) <= 200 AND
  char_length(coalesce(requester_name, '')) <= 100
);

-- admin_profiles
DROP POLICY IF EXISTS "Admin Profiles Select" ON public.admin_profiles;
DROP POLICY IF EXISTS "Auth Select admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Owner Manage admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admin Select admin_profiles" ON public.admin_profiles;

CREATE POLICY "Admin Select admin_profiles" ON public.admin_profiles FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Owner Manage admin_profiles" ON public.admin_profiles FOR ALL TO authenticated USING ( (SELECT security.get_my_role()) = 'owner' ) WITH CHECK ( (SELECT security.get_my_role()) = 'owner' );

-- Storage bucket wedding-photos: Revoke ALL broad bucket listing policies for public
DROP POLICY IF EXISTS "Public List wedding-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Select wedding-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Objects wedding-photos" ON storage.objects;

-- 5. Additional Performance Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id ON public.expenses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_guest_contact_events_guest_id ON public.guest_contact_events(guest_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_events_rsvp_id ON public.rsvp_events(rsvp_id);
CREATE INDEX IF NOT EXISTS idx_wedding_guests_replacement_for ON public.wedding_guests(replacement_for_guest_id);

DROP INDEX IF EXISTS public.idx_wedding_guests_table;
