-- Rollback Migration SQL V4.2
-- File: supabase/migrations/rollback/20260723020000_rollback_security_hardening.sql

-- 1. Restore public schema get_my_role function if needed
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

-- 2. Restore legacy get_user_role function
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

-- 3. Re-apply standard RLS policies using public.get_my_role()
CREATE POLICY "Auth Select wedding_guests" ON public.wedding_guests FOR SELECT TO authenticated USING (public.get_my_role() IS NOT NULL);
CREATE POLICY "Auth Insert wedding_guests" ON public.wedding_guests FOR INSERT TO authenticated WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Update wedding_guests" ON public.wedding_guests FOR UPDATE TO authenticated USING (public.get_my_role() IN ('editor', 'owner')) WITH CHECK (public.get_my_role() IN ('editor', 'owner'));
CREATE POLICY "Auth Delete wedding_guests" ON public.wedding_guests FOR DELETE TO authenticated USING (public.get_my_role() = 'owner');
