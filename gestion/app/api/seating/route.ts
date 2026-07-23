import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
    if (!profile || !profile.active) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    if (profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });

    const body = await request.json();
    const { guest_id, table_id } = body;

    // Delete existing assignment for this guest
    await supabase.from('seating_assignments').delete().eq('guest_id', guest_id);

    // Insert new assignment
    const { data: seating, error: seatErr } = await supabase
      .from('seating_assignments')
      .insert({ guest_id, table_id })
      .select()
      .single();

    if (seatErr) return NextResponse.json({ ok: false, error: seatErr.message }, { status: 500 });

    // Sync guest helper column
    await supabase.from('wedding_guests').update({ table_id, last_dashboard_update_at: new Date().toISOString() }).eq('id', guest_id);

    await supabase.from('audit_log').insert({
      entity_type: 'seating_assignments',
      entity_id: seating.id,
      action: 'ASSIGN_SEATING',
      after_data: body,
      actor: user.email,
      origin: 'dashboard'
    });

    await supabase.from('sync_outbox').insert({
      entity_type: 'seating_assignments',
      entity_id: seating.id,
      operation: 'INSERT',
      payload: seating
    });

    return NextResponse.json({ ok: true, seating });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
    if (!profile || !profile.active) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    if (profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const guest_id = searchParams.get('guest_id');

    if (!guest_id) return NextResponse.json({ ok: false, error: 'Missing guest_id' }, { status: 400 });

    await supabase.from('seating_assignments').delete().eq('guest_id', guest_id);
    await supabase.from('wedding_guests').update({ table_id: null, last_dashboard_update_at: new Date().toISOString() }).eq('id', guest_id);

    await supabase.from('audit_log').insert({
      entity_type: 'seating_assignments',
      entity_id: guest_id,
      action: 'UNASSIGN_SEATING',
      actor: user.email,
      origin: 'dashboard'
    });

    return NextResponse.json({ ok: true, unassigned: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
