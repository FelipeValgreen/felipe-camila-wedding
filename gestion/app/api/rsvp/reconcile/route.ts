import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Validate user session & active profile
    if (!user) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
    if (!profile || !profile.active) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    if (profile.role === 'viewer') {
      return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });
    }

    const body = await request.json();
    const { guest_id, rsvp_id } = body;

    if (!guest_id || !rsvp_id) {
      return NextResponse.json({ ok: false, error: 'Missing guest_id or rsvp_id' }, { status: 400 });
    }

    // 1. Read rsvp_responses record
    const { data: rsvp, error: rsvpErr } = await supabase.from('rsvp_responses').select('*').eq('id', rsvp_id).single();
    if (rsvpErr || !rsvp) {
      return NextResponse.json({ ok: false, error: 'RSVP record not found' }, { status: 404 });
    }

    // 2. Read wedding_guests record before update
    const { data: beforeGuest } = await supabase.from('wedding_guests').select('*').eq('id', guest_id).single();

    // 3. Update rsvp_responses
    const { data: updatedRsvp, error: updateRsvpErr } = await supabase
      .from('rsvp_responses')
      .update({
        guest_id,
        reconciliation_status: 'matched',
        reconciled_at: new Date().toISOString()
      })
      .eq('id', rsvp_id)
      .select()
      .single();

    if (updateRsvpErr) {
      return NextResponse.json({ ok: false, error: updateRsvpErr.message }, { status: 500 });
    }

    // 4. Update wedding_guests
    const { data: updatedGuest, error: updateGuestErr } = await supabase
      .from('wedding_guests')
      .update({
        rsvp_id,
        attendance_status: rsvp.attendance_status,
        dietary_type: rsvp.dietary_type || null,
        dietary_detail: rsvp.dietary_detail || null,
        last_dashboard_update_at: new Date().toISOString()
      })
      .eq('id', guest_id)
      .select()
      .single();

    if (updateGuestErr) {
      return NextResponse.json({ ok: false, error: updateGuestErr.message }, { status: 500 });
    }

    // 5. Create audit_log
    const { error: auditErr } = await supabase.from('audit_log').insert({
      entity_type: 'rsvp_responses',
      entity_id: rsvp_id,
      action: 'RECONCILE_RSVP',
      before_data: { rsvp_before: rsvp, guest_before: beforeGuest },
      after_data: { rsvp_after: updatedRsvp, guest_after: updatedGuest },
      actor: user.email,
      origin: 'dashboard'
    });

    if (auditErr) {
      return NextResponse.json({ ok: false, error: `Audit log failed: ${auditErr.message}` }, { status: 500 });
    }

    // 6. Create sync_outbox for rsvp_responses and wedding_guests
    const { error: outboxErr1 } = await supabase.from('sync_outbox').insert({
      entity_type: 'rsvp_responses',
      entity_id: rsvp_id,
      operation: 'UPDATE',
      payload: updatedRsvp
    });

    const { error: outboxErr2 } = await supabase.from('sync_outbox').insert({
      entity_type: 'wedding_guests',
      entity_id: guest_id,
      operation: 'UPDATE',
      payload: updatedGuest
    });

    if (outboxErr1 || outboxErr2) {
      return NextResponse.json({ ok: false, error: 'Sync outbox creation failed' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      reconciled: true,
      guest: updatedGuest,
      rsvp: updatedRsvp
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
