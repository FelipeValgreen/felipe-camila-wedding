-- Migration: Security Advisors & Performance Optimization V4.2
-- File: supabase/migrations/20260723010000_felipeycami_advisors_security_and_performance.sql

-- 1. Create dedicated internal security schema and get_my_role function
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

-- 2. Redefine get_user_role to enforce self-only lookup and delegate to security.get_my_role()
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RETURN NULL;
  END IF;

  RETURN security.get_my_role();
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_role(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_role(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;

-- 3. Change update_updated_at_column to SECURITY INVOKER and revoke grants
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

-- 4. Consolidate RLS policies using (SELECT security.get_my_role()) to prevent auth_rls_initplan overhead

-- admin_profiles (Fix duplicate SELECT policies and initplan)
DROP POLICY IF EXISTS "Admin Profiles Select" ON public.admin_profiles;
DROP POLICY IF EXISTS "Auth Select admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Owner Manage admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admin Select admin_profiles" ON public.admin_profiles;

CREATE POLICY "Admin Select admin_profiles" ON public.admin_profiles FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Owner Manage admin_profiles" ON public.admin_profiles FOR ALL TO authenticated USING ( (SELECT security.get_my_role()) = 'owner' ) WITH CHECK ( (SELECT security.get_my_role()) = 'owner' );

-- wedding_guests
DROP POLICY IF EXISTS "Auth Select wedding_guests" ON public.wedding_guests;
DROP POLICY IF EXISTS "Auth Insert wedding_guests" ON public.wedding_guests;
DROP POLICY IF EXISTS "Auth Update wedding_guests" ON public.wedding_guests;
DROP POLICY IF EXISTS "Auth Delete wedding_guests" ON public.wedding_guests;

CREATE POLICY "Auth Select wedding_guests" ON public.wedding_guests FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Insert wedding_guests" ON public.wedding_guests FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Update wedding_guests" ON public.wedding_guests FOR UPDATE TO authenticated USING ( (SELECT security.get_my_role()) IN ('editor', 'owner') ) WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Delete wedding_guests" ON public.wedding_guests FOR DELETE TO authenticated USING ( (SELECT security.get_my_role()) = 'owner' );

-- wedding_tables
DROP POLICY IF EXISTS "Auth Select wedding_tables" ON public.wedding_tables;
DROP POLICY IF EXISTS "Auth Insert wedding_tables" ON public.wedding_tables;
DROP POLICY IF EXISTS "Auth Update wedding_tables" ON public.wedding_tables;
DROP POLICY IF EXISTS "Auth Delete wedding_tables" ON public.wedding_tables;

CREATE POLICY "Auth Select wedding_tables" ON public.wedding_tables FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Insert wedding_tables" ON public.wedding_tables FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Update wedding_tables" ON public.wedding_tables FOR UPDATE TO authenticated USING ( (SELECT security.get_my_role()) IN ('editor', 'owner') ) WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Delete wedding_tables" ON public.wedding_tables FOR DELETE TO authenticated USING ( (SELECT security.get_my_role()) = 'owner' );

-- seating_assignments
DROP POLICY IF EXISTS "Auth Select seating_assignments" ON public.seating_assignments;
DROP POLICY IF EXISTS "Auth Insert seating_assignments" ON public.seating_assignments;
DROP POLICY IF EXISTS "Auth Update seating_assignments" ON public.seating_assignments;
DROP POLICY IF EXISTS "Auth Delete seating_assignments" ON public.seating_assignments;

CREATE POLICY "Auth Select seating_assignments" ON public.seating_assignments FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Insert seating_assignments" ON public.seating_assignments FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Update seating_assignments" ON public.seating_assignments FOR UPDATE TO authenticated USING ( (SELECT security.get_my_role()) IN ('editor', 'owner') ) WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Delete seating_assignments" ON public.seating_assignments FOR DELETE TO authenticated USING ( (SELECT security.get_my_role()) = 'owner' );

-- vendors
DROP POLICY IF EXISTS "Auth Select vendors" ON public.vendors;
DROP POLICY IF EXISTS "Auth Insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Auth Update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Auth Delete vendors" ON public.vendors;

CREATE POLICY "Auth Select vendors" ON public.vendors FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Insert vendors" ON public.vendors FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Update vendors" ON public.vendors FOR UPDATE TO authenticated USING ( (SELECT security.get_my_role()) IN ('editor', 'owner') ) WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Delete vendors" ON public.vendors FOR DELETE TO authenticated USING ( (SELECT security.get_my_role()) = 'owner' );

-- expenses
DROP POLICY IF EXISTS "Auth Select expenses" ON public.expenses;
DROP POLICY IF EXISTS "Auth Insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Auth Update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Auth Delete expenses" ON public.expenses;

CREATE POLICY "Auth Select expenses" ON public.expenses FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Update expenses" ON public.expenses FOR UPDATE TO authenticated USING ( (SELECT security.get_my_role()) IN ('editor', 'owner') ) WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Delete expenses" ON public.expenses FOR DELETE TO authenticated USING ( (SELECT security.get_my_role()) = 'owner' );

-- expense_payments
DROP POLICY IF EXISTS "Auth Select expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Auth Insert expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Auth Update expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Auth Delete expense_payments" ON public.expense_payments;

CREATE POLICY "Auth Select expense_payments" ON public.expense_payments FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Insert expense_payments" ON public.expense_payments FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Update expense_payments" ON public.expense_payments FOR UPDATE TO authenticated USING ( (SELECT security.get_my_role()) IN ('editor', 'owner') ) WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Delete expense_payments" ON public.expense_payments FOR DELETE TO authenticated USING ( (SELECT security.get_my_role()) = 'owner' );

-- guest_contact_events
DROP POLICY IF EXISTS "Auth Select guest_contact_events" ON public.guest_contact_events;
DROP POLICY IF EXISTS "Auth Insert guest_contact_events" ON public.guest_contact_events;

CREATE POLICY "Auth Select guest_contact_events" ON public.guest_contact_events FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Insert guest_contact_events" ON public.guest_contact_events FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );

-- sync_outbox & sync_conflicts
DROP POLICY IF EXISTS "Auth Select sync_outbox" ON public.sync_outbox;
DROP POLICY IF EXISTS "Auth Insert sync_outbox" ON public.sync_outbox;
DROP POLICY IF EXISTS "Auth Update sync_outbox" ON public.sync_outbox;

CREATE POLICY "Auth Select sync_outbox" ON public.sync_outbox FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Insert sync_outbox" ON public.sync_outbox FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );
CREATE POLICY "Auth Update sync_outbox" ON public.sync_outbox FOR UPDATE TO authenticated USING ( (SELECT security.get_my_role()) IN ('editor', 'owner') ) WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );

DROP POLICY IF EXISTS "Auth Select sync_conflicts" ON public.sync_conflicts;
DROP POLICY IF EXISTS "Auth Insert sync_conflicts" ON public.sync_conflicts;

CREATE POLICY "Auth Select sync_conflicts" ON public.sync_conflicts FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Insert sync_conflicts" ON public.sync_conflicts FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );

-- audit_log
DROP POLICY IF EXISTS "Auth Select audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Auth Insert audit_log" ON public.audit_log;

CREATE POLICY "Auth Select audit_log" ON public.audit_log FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );

-- rsvp_responses & rsvp_events
DROP POLICY IF EXISTS "Auth Select rsvp_responses" ON public.rsvp_responses;
DROP POLICY IF EXISTS "Auth Update rsvp_responses" ON public.rsvp_responses;

CREATE POLICY "Auth Select rsvp_responses" ON public.rsvp_responses FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Update rsvp_responses" ON public.rsvp_responses FOR UPDATE TO authenticated USING ( (SELECT security.get_my_role()) IN ('editor', 'owner') ) WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );

DROP POLICY IF EXISTS "Auth Select rsvp_events" ON public.rsvp_events;
DROP POLICY IF EXISTS "Auth Insert rsvp_events" ON public.rsvp_events;

CREATE POLICY "Auth Select rsvp_events" ON public.rsvp_events FOR SELECT TO authenticated USING ( (SELECT security.get_my_role()) IS NOT NULL );
CREATE POLICY "Auth Insert rsvp_events" ON public.rsvp_events FOR INSERT TO authenticated WITH CHECK ( (SELECT security.get_my_role()) IN ('editor', 'owner') );

-- 5. Hardening Public Web Tables & RLS WITH CHECK validation

-- guest_photos
ALTER TABLE IF EXISTS public.guest_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert guest_photos" ON public.guest_photos;
DROP POLICY IF EXISTS "Public Select guest_photos" ON public.guest_photos;
DROP POLICY IF EXISTS "Validated Insert guest_photos" ON public.guest_photos;

CREATE POLICY "Public Select guest_photos" ON public.guest_photos FOR SELECT TO public USING (true);
CREATE POLICY "Validated Insert guest_photos" ON public.guest_photos FOR INSERT TO public WITH CHECK (
  char_length(coalesce(uploader_name, '')) <= 100 AND
  (url LIKE 'http://%' OR url LIKE 'https://%')
);

-- rsvp_guests
ALTER TABLE IF EXISTS public.rsvp_guests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Manage rsvp_guests" ON public.rsvp_guests;
DROP POLICY IF EXISTS "Validated Insert rsvp_guests" ON public.rsvp_guests;

CREATE POLICY "Validated Insert rsvp_guests" ON public.rsvp_guests FOR INSERT TO public WITH CHECK (
  char_length(name) >= 1 AND char_length(name) <= 200
);

-- song_requests
ALTER TABLE IF EXISTS public.song_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert song_requests" ON public.song_requests;
DROP POLICY IF EXISTS "Validated Insert song_requests" ON public.song_requests;

CREATE POLICY "Validated Insert song_requests" ON public.song_requests FOR INSERT TO public WITH CHECK (
  char_length(song_name) >= 1 AND char_length(song_name) <= 200 AND
  char_length(coalesce(requester_name, '')) <= 100
);

-- Storage bucket wedding-photos: Keep public object view by URL, revoke broad bucket listing
DROP POLICY IF EXISTS "Public List wedding-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Select wedding-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Objects wedding-photos" ON storage.objects;

CREATE POLICY "Public Read Objects wedding-photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'wedding-photos');

-- 6. Missing Performance Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id ON public.expenses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_guest_contact_events_guest_id ON public.guest_contact_events(guest_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_events_rsvp_id ON public.rsvp_events(rsvp_id);
CREATE INDEX IF NOT EXISTS idx_wedding_guests_replacement_for ON public.wedding_guests(replacement_for_guest_id);

-- Drop duplicate index if exists
DROP INDEX IF EXISTS public.idx_wedding_guests_table;
