-- Migration: RLS & Strict Security Policies for F&C Management System
-- File: supabase/migrations/20260722150000_felipeycami_gestion_rls.sql

-- 1. Enable RLS on all management tables
ALTER TABLE public.wedding_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seating_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_contact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Revoke all privileges from anon role on management tables
REVOKE ALL ON public.wedding_guests FROM anon;
REVOKE ALL ON public.wedding_tables FROM anon;
REVOKE ALL ON public.seating_assignments FROM anon;
REVOKE ALL ON public.vendors FROM anon;
REVOKE ALL ON public.expenses FROM anon;
REVOKE ALL ON public.expense_payments FROM anon;
REVOKE ALL ON public.guest_contact_events FROM anon;
REVOKE ALL ON public.sync_outbox FROM anon;
REVOKE ALL ON public.sync_conflicts FROM anon;
REVOKE ALL ON public.audit_log FROM anon;
REVOKE ALL ON public.admin_profiles FROM anon;

-- 3. Security Definer Helper to check active user role safely
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_active BOOLEAN;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT role, active INTO v_role, v_active
    FROM public.admin_profiles
    WHERE id = p_user_id;

    IF v_active IS TRUE THEN
        RETURN v_role;
    END IF;
    RETURN NULL;
END;
$$;

-- 4. RLS POLICIES FOR ADMIN PROFILES
DROP POLICY IF EXISTS "Auth Select admin_profiles" ON public.admin_profiles;
CREATE POLICY "Auth Select admin_profiles"
ON public.admin_profiles FOR SELECT TO authenticated
USING (public.get_user_role(auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Owner Manage admin_profiles" ON public.admin_profiles;
CREATE POLICY "Owner Manage admin_profiles"
ON public.admin_profiles FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'owner');

-- 5. EXPLICIT RLS POLICIES FOR ALL MANAGEMENT TABLES

-- wedding_guests
DROP POLICY IF EXISTS "Auth Select wedding_guests" ON public.wedding_guests;
CREATE POLICY "Auth Select wedding_guests" ON public.wedding_guests FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Auth Insert wedding_guests" ON public.wedding_guests;
CREATE POLICY "Auth Insert wedding_guests" ON public.wedding_guests FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Update wedding_guests" ON public.wedding_guests;
CREATE POLICY "Auth Update wedding_guests" ON public.wedding_guests FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Delete wedding_guests" ON public.wedding_guests;
CREATE POLICY "Auth Delete wedding_guests" ON public.wedding_guests FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) = 'owner');

-- wedding_tables
DROP POLICY IF EXISTS "Auth Select wedding_tables" ON public.wedding_tables;
CREATE POLICY "Auth Select wedding_tables" ON public.wedding_tables FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Auth Insert wedding_tables" ON public.wedding_tables;
CREATE POLICY "Auth Insert wedding_tables" ON public.wedding_tables FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Update wedding_tables" ON public.wedding_tables;
CREATE POLICY "Auth Update wedding_tables" ON public.wedding_tables FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Delete wedding_tables" ON public.wedding_tables;
CREATE POLICY "Auth Delete wedding_tables" ON public.wedding_tables FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) = 'owner');

-- seating_assignments
DROP POLICY IF EXISTS "Auth Select seating_assignments" ON public.seating_assignments;
CREATE POLICY "Auth Select seating_assignments" ON public.seating_assignments FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Auth Insert seating_assignments" ON public.seating_assignments;
CREATE POLICY "Auth Insert seating_assignments" ON public.seating_assignments FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Update seating_assignments" ON public.seating_assignments;
CREATE POLICY "Auth Update seating_assignments" ON public.seating_assignments FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Delete seating_assignments" ON public.seating_assignments;
CREATE POLICY "Auth Delete seating_assignments" ON public.seating_assignments FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) = 'owner');

-- vendors
DROP POLICY IF EXISTS "Auth Select vendors" ON public.vendors;
CREATE POLICY "Auth Select vendors" ON public.vendors FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Auth Insert vendors" ON public.vendors;
CREATE POLICY "Auth Insert vendors" ON public.vendors FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Update vendors" ON public.vendors;
CREATE POLICY "Auth Update vendors" ON public.vendors FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Delete vendors" ON public.vendors;
CREATE POLICY "Auth Delete vendors" ON public.vendors FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) = 'owner');

-- expenses
DROP POLICY IF EXISTS "Auth Select expenses" ON public.expenses;
CREATE POLICY "Auth Select expenses" ON public.expenses FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Auth Insert expenses" ON public.expenses;
CREATE POLICY "Auth Insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Update expenses" ON public.expenses;
CREATE POLICY "Auth Update expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Delete expenses" ON public.expenses;
CREATE POLICY "Auth Delete expenses" ON public.expenses FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) = 'owner');

-- expense_payments
DROP POLICY IF EXISTS "Auth Select expense_payments" ON public.expense_payments;
CREATE POLICY "Auth Select expense_payments" ON public.expense_payments FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Auth Insert expense_payments" ON public.expense_payments;
CREATE POLICY "Auth Insert expense_payments" ON public.expense_payments FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Update expense_payments" ON public.expense_payments;
CREATE POLICY "Auth Update expense_payments" ON public.expense_payments FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Delete expense_payments" ON public.expense_payments;
CREATE POLICY "Auth Delete expense_payments" ON public.expense_payments FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) = 'owner');

-- guest_contact_events
DROP POLICY IF EXISTS "Auth Select guest_contact_events" ON public.guest_contact_events;
CREATE POLICY "Auth Select guest_contact_events" ON public.guest_contact_events FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Auth Insert guest_contact_events" ON public.guest_contact_events;
CREATE POLICY "Auth Insert guest_contact_events" ON public.guest_contact_events FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('editor', 'owner'));

-- sync_outbox
DROP POLICY IF EXISTS "Auth Select sync_outbox" ON public.sync_outbox;
CREATE POLICY "Auth Select sync_outbox" ON public.sync_outbox FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Auth Insert sync_outbox" ON public.sync_outbox;
CREATE POLICY "Auth Insert sync_outbox" ON public.sync_outbox FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
DROP POLICY IF EXISTS "Auth Update sync_outbox" ON public.sync_outbox;
CREATE POLICY "Auth Update sync_outbox" ON public.sync_outbox FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('editor', 'owner'));

-- sync_conflicts
DROP POLICY IF EXISTS "Auth Select sync_conflicts" ON public.sync_conflicts;
CREATE POLICY "Auth Select sync_conflicts" ON public.sync_conflicts FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Auth Insert sync_conflicts" ON public.sync_conflicts;
CREATE POLICY "Auth Insert sync_conflicts" ON public.sync_conflicts FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('editor', 'owner'));

-- audit_log
DROP POLICY IF EXISTS "Auth Select audit_log" ON public.audit_log;
CREATE POLICY "Auth Select audit_log" ON public.audit_log FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS "Auth Insert audit_log" ON public.audit_log;
CREATE POLICY "Auth Insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
