-- Migration: Security and Performance Hardening V4.2
-- File: supabase/migrations/20260723000000_felipeycami_security_and_performance_hardening.sql

-- 1. Create secure get_my_role() function deriving user role strictly from auth.uid()
CREATE OR REPLACE FUNCTION public.get_my_role()
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

-- Revoke execution of get_my_role from PUBLIC and anon, grant to authenticated only
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- 2. Redefine legacy get_user_role to prevent cross-user role querying
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

  RETURN public.get_my_role();
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_role(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_role(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;

-- 3. Fix search_path on update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. Re-apply RLS policies on management tables to use get_my_role()

-- wedding_guests
DROP POLICY IF EXISTS "Auth Select wedding_guests" ON public.wedding_guests;
DROP POLICY IF EXISTS "Auth Insert wedding_guests" ON public.wedding_guests;
DROP POLICY IF EXISTS "Auth Update wedding_guests" ON public.wedding_guests;
DROP POLICY IF EXISTS "Auth Delete wedding_guests" ON public.wedding_guests;

CREATE POLICY "Auth Select wedding_guests" ON public.wedding_guests FOR SELECT TO authenticated USING (public.get_my_role() IS NOT NULL);
CREATE POLICY "Auth Insert wedding_guests" ON public.wedding_guests FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Update wedding_guests" ON public.wedding_guests FOR UPDATE TO authenticated USING (public.get_my_role() IN ('editor', 'owner')) WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Delete wedding_guests" ON public.wedding_guests FOR DELETE TO authenticated USING (public.get_my_role() = 'owner');

-- wedding_tables
DROP POLICY IF EXISTS "Auth Select wedding_tables" ON public.wedding_tables;
DROP POLICY IF EXISTS "Auth Insert wedding_tables" ON public.wedding_tables;
DROP POLICY IF EXISTS "Auth Update wedding_tables" ON public.wedding_tables;
DROP POLICY IF EXISTS "Auth Delete wedding_tables" ON public.wedding_tables;

CREATE POLICY "Auth Select wedding_tables" ON public.wedding_tables FOR SELECT TO authenticated USING (public.get_my_role() IS NOT NULL);
CREATE POLICY "Auth Insert wedding_tables" ON public.wedding_tables FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Update wedding_tables" ON public.wedding_tables FOR UPDATE TO authenticated USING (public.get_my_role() IN ('editor', 'owner')) WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Delete wedding_tables" ON public.wedding_tables FOR DELETE TO authenticated USING (public.get_my_role() = 'owner');

-- seating_assignments
DROP POLICY IF EXISTS "Auth Select seating_assignments" ON public.seating_assignments;
DROP POLICY IF EXISTS "Auth Insert seating_assignments" ON public.seating_assignments;
DROP POLICY IF EXISTS "Auth Update seating_assignments" ON public.seating_assignments;
DROP POLICY IF EXISTS "Auth Delete seating_assignments" ON public.seating_assignments;

CREATE POLICY "Auth Select seating_assignments" ON public.seating_assignments FOR SELECT TO authenticated USING (public.get_my_role() IS NOT NULL);
CREATE POLICY "Auth Insert seating_assignments" ON public.seating_assignments FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Update seating_assignments" ON public.seating_assignments FOR UPDATE TO authenticated USING (public.get_my_role() IN ('editor', 'owner')) WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Delete seating_assignments" ON public.seating_assignments FOR DELETE TO authenticated USING (public.get_my_role() = 'owner');

-- vendors
DROP POLICY IF EXISTS "Auth Select vendors" ON public.vendors;
DROP POLICY IF EXISTS "Auth Insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Auth Update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Auth Delete vendors" ON public.vendors;

CREATE POLICY "Auth Select vendors" ON public.vendors FOR SELECT TO authenticated USING (public.get_my_role() IS NOT NULL);
CREATE POLICY "Auth Insert vendors" ON public.vendors FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Update vendors" ON public.vendors FOR UPDATE TO authenticated USING (public.get_my_role() IN ('editor', 'owner')) WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Delete vendors" ON public.vendors FOR DELETE TO authenticated USING (public.get_my_role() = 'owner');

-- expenses
DROP POLICY IF EXISTS "Auth Select expenses" ON public.expenses;
DROP POLICY IF EXISTS "Auth Insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Auth Update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Auth Delete expenses" ON public.expenses;

CREATE POLICY "Auth Select expenses" ON public.expenses FOR SELECT TO authenticated USING (public.get_my_role() IS NOT NULL);
CREATE POLICY "Auth Insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Update expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.get_my_role() IN ('editor', 'owner')) WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Delete expenses" ON public.expenses FOR DELETE TO authenticated USING (public.get_my_role() = 'owner');

-- expense_payments
DROP POLICY IF EXISTS "Auth Select expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Auth Insert expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Auth Update expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Auth Delete expense_payments" ON public.expense_payments;

CREATE POLICY "Auth Select expense_payments" ON public.expense_payments FOR SELECT TO authenticated USING (public.get_my_role() IS NOT NULL);
CREATE POLICY "Auth Insert expense_payments" ON public.expense_payments FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Update expense_payments" ON public.expense_payments FOR UPDATE TO authenticated USING (public.get_my_role() IN ('editor', 'owner')) WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Delete expense_payments" ON public.expense_payments FOR DELETE TO authenticated USING (public.get_my_role() = 'owner');

-- sync_outbox & audit_log
DROP POLICY IF EXISTS "Auth Select sync_outbox" ON public.sync_outbox;
DROP POLICY IF EXISTS "Auth Insert sync_outbox" ON public.sync_outbox;
DROP POLICY IF EXISTS "Auth Update sync_outbox" ON public.sync_outbox;

CREATE POLICY "Auth Select sync_outbox" ON public.sync_outbox FOR SELECT TO authenticated USING (public.get_my_role() IS NOT NULL);
CREATE POLICY "Auth Insert sync_outbox" ON public.sync_outbox FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Update sync_outbox" ON public.sync_outbox FOR UPDATE TO authenticated USING (public.get_my_role() IN ('editor', 'owner')) WITH CHECK (public.get_my_role() IN ('editor', 'owner'));

DROP POLICY IF EXISTS "Auth Select audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Auth Insert audit_log" ON public.audit_log;

CREATE POLICY "Auth Select audit_log" ON public.audit_log FOR SELECT TO authenticated USING (public.get_my_role() IS NOT NULL);
CREATE POLICY "Auth Insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('editor', 'owner'));

-- rsvp_responses & rsvp_events
DROP POLICY IF EXISTS "Auth Select rsvp_responses" ON public.rsvp_responses;
DROP POLICY IF EXISTS "Auth Update rsvp_responses" ON public.rsvp_responses;

CREATE POLICY "Auth Select rsvp_responses" ON public.rsvp_responses FOR SELECT TO authenticated USING (public.get_my_role() IS NOT NULL);
CREATE POLICY "Auth Update rsvp_responses" ON public.rsvp_responses FOR UPDATE TO authenticated USING (public.get_my_role() IN ('editor', 'owner')) WITH CHECK (public.get_my_role() IN ('editor', 'owner'));

-- 5. Hardening legacy tables & WhatsApp sessions
ALTER TABLE IF EXISTS public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_processed_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage whatsapp_sessions" ON public.whatsapp_sessions;
CREATE POLICY "Admin Manage whatsapp_sessions" ON public.whatsapp_sessions FOR ALL TO authenticated USING (public.get_my_role() IN ('editor', 'owner')) WITH CHECK (public.get_my_role() IN ('editor', 'owner'));

DROP POLICY IF EXISTS "Admin Manage whatsapp_processed_messages" ON public.whatsapp_processed_messages;
CREATE POLICY "Admin Manage whatsapp_processed_messages" ON public.whatsapp_processed_messages FOR ALL TO authenticated USING (public.get_my_role() IN ('editor', 'owner')) WITH CHECK (public.get_my_role() IN ('editor', 'owner'));

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_wedding_guests_table_id ON public.wedding_guests(table_id);
CREATE INDEX IF NOT EXISTS idx_wedding_guests_rsvp_id ON public.wedding_guests(rsvp_id);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_table_id ON public.seating_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_expense_payments_expense_id ON public.expense_payments(expense_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_guest_id ON public.rsvp_responses(guest_id);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON public.sync_outbox(status);
