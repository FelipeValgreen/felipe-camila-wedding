-- Migration: Automated Safe System RSVP Reconciliation Function
-- File: supabase/migrations/20260725000000_felipeycami_auto_reconcile_system.sql

CREATE OR REPLACE FUNCTION public.reconcile_rsvp_system(
  p_rsvp_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rsvp RECORD;
  v_match_guest RECORD;
  v_candidate_count INTEGER := 0;
  v_match_note TEXT;
  v_guest_before RECORD;
  v_guest_after RECORD;
  v_rsvp_after RECORD;
BEGIN
  -- 1. Fetch RSVP response
  SELECT * INTO v_rsvp FROM public.rsvp_responses WHERE id = p_rsvp_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'RSVP_NOT_FOUND',
      'rsvp_id', p_rsvp_id
    );
  END IF;

  -- 2. Priority 1: Match by exact phone_e164 (if phone is present)
  IF v_rsvp.phone_e164 IS NOT NULL AND v_rsvp.phone_e164 <> '' THEN
    SELECT COUNT(*) INTO v_candidate_count
    FROM public.wedding_guests
    WHERE phone_e164 = v_rsvp.phone_e164 AND guest_status = 'active';

    IF v_candidate_count = 1 THEN
      SELECT * INTO v_match_guest
      FROM public.wedding_guests
      WHERE phone_e164 = v_rsvp.phone_e164 AND guest_status = 'active';
      v_match_note := 'AUTO_MATCH_EXACT_PHONE';
    ELSIF v_candidate_count > 1 THEN
      UPDATE public.rsvp_responses
      SET guest_id = NULL,
          reconciliation_status = 'ambiguous',
          reconciliation_notes = 'AMBIGUOUS_CANDIDATE_COUNT_' || v_candidate_count
      WHERE id = p_rsvp_id
      RETURNING * INTO v_rsvp_after;

      RETURN jsonb_build_object(
        'ok', true,
        'reconciliation_status', 'ambiguous',
        'candidate_count', v_candidate_count,
        'rsvp', row_to_json(v_rsvp_after)
      );
    END IF;
  END IF;

  -- 3. Priority 2: Match by exact full_name_normalized (if no phone match was found)
  IF v_match_guest.id IS NULL THEN
    SELECT COUNT(*) INTO v_candidate_count
    FROM public.wedding_guests
    WHERE full_name_normalized = v_rsvp.full_name_normalized AND guest_status = 'active';

    IF v_candidate_count = 1 THEN
      SELECT * INTO v_match_guest
      FROM public.wedding_guests
      WHERE full_name_normalized = v_rsvp.full_name_normalized AND guest_status = 'active';
      v_match_note := 'AUTO_MATCH_EXACT_NAME';
    ELSIF v_candidate_count > 1 THEN
      UPDATE public.rsvp_responses
      SET guest_id = NULL,
          reconciliation_status = 'ambiguous',
          reconciliation_notes = 'AMBIGUOUS_CANDIDATE_COUNT_' || v_candidate_count
      WHERE id = p_rsvp_id
      RETURNING * INTO v_rsvp_after;

      RETURN jsonb_build_object(
        'ok', true,
        'reconciliation_status', 'ambiguous',
        'candidate_count', v_candidate_count,
        'rsvp', row_to_json(v_rsvp_after)
      );
    END IF;
  END IF;

  -- 4. No exact match found
  IF v_match_guest.id IS NULL THEN
    UPDATE public.rsvp_responses
    SET guest_id = NULL,
        reconciliation_status = 'unmatched',
        reconciliation_notes = 'NO_EXACT_MATCH'
    WHERE id = p_rsvp_id
    RETURNING * INTO v_rsvp_after;

    RETURN jsonb_build_object(
      'ok', true,
      'reconciliation_status', 'unmatched',
      'rsvp', row_to_json(v_rsvp_after)
    );
  END IF;

  -- 5. Conflict Check: Is the candidate guest already linked to a different RSVP?
  IF v_match_guest.rsvp_id IS NOT NULL AND v_match_guest.rsvp_id <> p_rsvp_id THEN
    UPDATE public.rsvp_responses
    SET guest_id = NULL,
        reconciliation_status = 'conflict',
        reconciliation_notes = 'GUEST_ALREADY_LINKED'
    WHERE id = p_rsvp_id
    RETURNING * INTO v_rsvp_after;

    RETURN jsonb_build_object(
      'ok', true,
      'reconciliation_status', 'conflict',
      'conflict_guest_id', v_match_guest.id,
      'rsvp', row_to_json(v_rsvp_after)
    );
  END IF;

  -- 6. Execute Match & Atomic Updates
  v_guest_before := v_match_guest;

  -- Update rsvp_responses
  UPDATE public.rsvp_responses
  SET guest_id = v_match_guest.id,
      reconciliation_status = 'matched',
      reconciliation_notes = v_match_note
  WHERE id = p_rsvp_id
  RETURNING * INTO v_rsvp_after;

  -- Update wedding_guests (preserving reconfirmation_status, guest_status, invitation_status, group_name, family_side)
  UPDATE public.wedding_guests
  SET rsvp_id = p_rsvp_id,
      attendance_status = v_rsvp.attendance_status,
      dietary_type = COALESCE(v_rsvp.dietary_type, dietary_type),
      dietary_detail = COALESCE(v_rsvp.dietary_detail, dietary_detail),
      last_dashboard_update_at = now(),
      updated_by = 'rsvp_system'
  WHERE id = v_match_guest.id
  RETURNING * INTO v_guest_after;

  -- Audit log entry
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
    'AUTO_RECONCILE_SYSTEM',
    jsonb_build_object('rsvp_before', row_to_json(v_rsvp), 'guest_before', row_to_json(v_guest_before)),
    jsonb_build_object('rsvp_after', row_to_json(v_rsvp_after), 'guest_after', row_to_json(v_guest_after)),
    'rsvp_system',
    'system'
  );

  -- Sync outbox entries
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

  INSERT INTO public.sync_outbox (
    entity_type,
    entity_id,
    operation,
    payload,
    status
  ) VALUES (
    'wedding_guests',
    v_match_guest.id,
    'UPDATE',
    row_to_json(v_guest_after),
    'pending'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'reconciliation_status', 'matched',
    'guest', row_to_json(v_guest_after),
    'rsvp', row_to_json(v_rsvp_after)
  );
END;
$$;

-- Strict Security Grants: Revoke from public, anon, and authenticated; grant ONLY to service_role and postgres
REVOKE ALL ON FUNCTION public.reconcile_rsvp_system(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_rsvp_system(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.reconcile_rsvp_system(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_rsvp_system(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_rsvp_system(UUID) TO postgres;
