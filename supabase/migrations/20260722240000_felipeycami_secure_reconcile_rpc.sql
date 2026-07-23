-- Migration: Secure Transactional RSVP Reconciliation RPC Function V4.2
-- File: supabase/migrations/20260722240000_felipeycami_secure_reconcile_rpc.sql

CREATE OR REPLACE FUNCTION public.reconcile_rsvp_to_guest(
  p_rsvp_id UUID,
  p_guest_id UUID,
  p_actor TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_admin RECORD;
  v_effective_actor TEXT;
  v_rsvp RECORD;
  v_guest_before RECORD;
  v_guest_after RECORD;
  v_rsvp_after RECORD;
BEGIN
  -- 1. Get authenticated user ID from Supabase Auth context
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: User is not authenticated';
  END IF;

  -- 2. Verify active admin profile
  SELECT * INTO v_admin FROM public.admin_profiles WHERE id = v_user_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'UNAUTHORIZED: No active admin profile found for user %', v_user_id;
  END IF;

  -- 3. Enforce role-based access control (editor or owner only, viewer denied)
  IF v_admin.role NOT IN ('editor', 'owner') THEN
    RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS: Only editor or owner can reconcile RSVP (user role: %)', v_admin.role;
  END IF;

  -- 4. Derive verified actor from admin profile
  v_effective_actor := COALESCE(v_admin.email, p_actor, 'dashboard_admin');

  -- 5. Read RSVP response
  SELECT * INTO v_rsvp FROM public.rsvp_responses WHERE id = p_rsvp_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RSVP record not found with id %', p_rsvp_id;
  END IF;

  -- 6. Read Guest record before update
  SELECT * INTO v_guest_before FROM public.wedding_guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest record not found with id %', p_guest_id;
  END IF;

  -- 7. Update rsvp_responses
  UPDATE public.rsvp_responses
  SET
    guest_id = p_guest_id,
    reconciliation_status = 'matched'
  WHERE id = p_rsvp_id
  RETURNING * INTO v_rsvp_after;

  -- 8. Update wedding_guests
  UPDATE public.wedding_guests
  SET
    rsvp_id = p_rsvp_id,
    attendance_status = v_rsvp.attendance_status,
    dietary_type = COALESCE(v_rsvp.dietary_type, dietary_type),
    dietary_detail = COALESCE(v_rsvp.dietary_detail, dietary_detail),
    last_dashboard_update_at = now()
  WHERE id = p_guest_id
  RETURNING * INTO v_guest_after;

  -- 9. Insert audit_log with verified actor
  INSERT INTO public.audit_log (
    entity_type,
    entity_id,
    action,
    before_data,
    after_data,
    actor,
    origin
  ) VALUES (
    'rsvp_responses',
    p_rsvp_id,
    'RECONCILE_RSVP',
    jsonb_build_object('rsvp_before', row_to_json(v_rsvp), 'guest_before', row_to_json(v_guest_before)),
    jsonb_build_object('rsvp_after', row_to_json(v_rsvp_after), 'guest_after', row_to_json(v_guest_after)),
    v_effective_actor,
    'dashboard'
  );

  -- 10. Insert sync_outbox for rsvp_responses
  INSERT INTO public.sync_outbox (
    entity_type,
    entity_id,
    operation,
    payload,
    status
  ) VALUES (
    'rsvp_responses',
    p_rsvp_id,
    'UPDATE',
    row_to_json(v_rsvp_after),
    'pending'
  );

  -- 11. Insert sync_outbox for wedding_guests
  INSERT INTO public.sync_outbox (
    entity_type,
    entity_id,
    operation,
    payload,
    status
  ) VALUES (
    'wedding_guests',
    p_guest_id,
    'UPDATE',
    row_to_json(v_guest_after),
    'pending'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'reconciled', true,
    'guest', row_to_json(v_guest_after),
    'rsvp', row_to_json(v_rsvp_after)
  );
END;
$$;

-- Security hardening: revoke permissions from public and anon, grant to authenticated only
REVOKE ALL ON FUNCTION public.reconcile_rsvp_to_guest(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_rsvp_to_guest(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.reconcile_rsvp_to_guest(UUID, UUID, TEXT) TO authenticated;
