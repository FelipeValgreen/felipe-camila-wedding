-- Migration: RSVP Admin RLS Policies
-- File: supabase/migrations/20260722210000_felipeycami_rsvp_admin_policies.sql

-- Enable RLS on rsvp_responses and rsvp_events if not enabled
ALTER TABLE public.rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_events ENABLE ROW LEVEL SECURITY;

-- Select policies for authenticated admin users
DROP POLICY IF EXISTS "Auth Select rsvp_responses" ON public.rsvp_responses;
CREATE POLICY "Auth Select rsvp_responses" ON public.rsvp_responses FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Auth Update rsvp_responses" ON public.rsvp_responses;
CREATE POLICY "Auth Update rsvp_responses" ON public.rsvp_responses FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('editor', 'owner'));

DROP POLICY IF EXISTS "Auth Select rsvp_events" ON public.rsvp_events;
CREATE POLICY "Auth Select rsvp_events" ON public.rsvp_events FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Auth Insert rsvp_events" ON public.rsvp_events;
CREATE POLICY "Auth Insert rsvp_events" ON public.rsvp_events FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('editor', 'owner'));
