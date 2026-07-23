-- Migration: Transactional RSVP Reconciliation RPC Function
-- File: supabase/migrations/20260722230000_felipeycami_transactional_rsvp_reconcile.sql

CREATE OR REPLACE FUNCTION public.reconcile_rsvp_to_guest(
  p_rsvp_id UUID,
  p_guest_id UUID,
  p_actor TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rsvp RECORD;
  v_guest_before RECORD;
  v_guest_after RECORD;
  v_rsvp_after RECORD;
BEGIN
  -- 1. Read RSVP response
  SELECT * INTO v_rsvp FROM public.rsvp_responses WHERE id = p_rsvp_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RSVP record not found with id %', p_rsvp_id;
  END IF;

  -- 2. Read Guest record before update
  SELECT * INTO v_guest_before FROM public.wedding_guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest record not found with id %', p_guest_id;
  END IF;

  -- 3. Update rsvp_responses
  UPDATE public.rsvp_responses
  SET
    guest_id = p_guest_id,
    reconciliation_status = 'matched'
  WHERE id = p_rsvp_id
  RETURNING * INTO v_rsvp_after;

  -- 4. Update wedding_guests
  UPDATE public.wedding_guests
  SET
    rsvp_id = p_rsvp_id,
    attendance_status = v_rsvp.attendance_status,
    dietary_type = COALESCE(v_rsvp.dietary_type, dietary_type),
    dietary_detail = COALESCE(v_rsvp.dietary_detail, dietary_detail),
    last_dashboard_update_at = now()
  WHERE id = p_guest_id
  RETURNING * INTO v_guest_after;

  -- 5. Insert audit_log
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
    p_actor,
    'dashboard'
  );

  -- 6. Insert sync_outbox for rsvp_responses
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

  -- 7. Insert sync_outbox for wedding_guests
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
