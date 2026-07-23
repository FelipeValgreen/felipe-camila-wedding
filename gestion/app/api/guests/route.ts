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

    const { data: guest, error: insertErr } = await supabase
      .from('wedding_guests')
      .insert({
        ...body,
        last_dashboard_update_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertErr || !guest) {
      return NextResponse.json({ ok: false, error: `Insert guest failed: ${insertErr?.message || 'Unknown error'}` }, { status: 500 });
    }

    const { error: auditErr } = await supabase.from('audit_log').insert({
      entity_type: 'wedding_guests',
      entity_id: guest.id,
      action: 'CREATE_GUEST',
      after_data: body,
      actor: user.email,
      origin: 'dashboard'
    });

    if (auditErr) {
      return NextResponse.json({ ok: false, error: `Audit log failed: ${auditErr.message}` }, { status: 500 });
    }

    const { error: outboxErr } = await supabase.from('sync_outbox').insert({
      entity_type: 'wedding_guests',
      entity_id: guest.id,
      operation: 'INSERT',
      payload: guest
    });

    if (outboxErr) {
      return NextResponse.json({ ok: false, error: `Sync outbox failed: ${outboxErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, guest });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
    if (!profile || !profile.active) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    if (profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ ok: false, error: 'Missing guest id' }, { status: 400 });

    const { data: beforeGuest } = await supabase.from('wedding_guests').select('*').eq('id', id).single();

    const { data: guest, error: updateErr } = await supabase
      .from('wedding_guests')
      .update({
        ...updates,
        last_dashboard_update_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr || !guest) {
      return NextResponse.json({ ok: false, error: `Update guest failed: ${updateErr?.message || 'Unknown error'}` }, { status: 500 });
    }

    const { error: auditErr } = await supabase.from('audit_log').insert({
      entity_type: 'wedding_guests',
      entity_id: id,
      action: 'UPDATE_GUEST',
      before_data: beforeGuest,
      after_data: updates,
      actor: user.email,
      origin: 'dashboard'
    });

    if (auditErr) {
      return NextResponse.json({ ok: false, error: `Audit log failed: ${auditErr.message}` }, { status: 500 });
    }

    const { error: outboxErr } = await supabase.from('sync_outbox').insert({
      entity_type: 'wedding_guests',
      entity_id: id,
      operation: 'UPDATE',
      payload: guest
    });

    if (outboxErr) {
      return NextResponse.json({ ok: false, error: `Sync outbox failed: ${outboxErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, guest });
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
    if (profile.role !== 'owner') return NextResponse.json({ ok: false, error: 'ONLY_OWNER_CAN_DELETE_GUESTS' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ ok: false, error: 'Missing guest id' }, { status: 400 });

    const { data: beforeGuest } = await supabase.from('wedding_guests').select('*').eq('id', id).single();

    const { error: deleteErr } = await supabase.from('wedding_guests').delete().eq('id', id);
    if (deleteErr) {
      return NextResponse.json({ ok: false, error: `Delete guest failed: ${deleteErr.message}` }, { status: 500 });
    }

    const { error: auditErr } = await supabase.from('audit_log').insert({
      entity_type: 'wedding_guests',
      entity_id: id,
      action: 'DELETE_GUEST',
      before_data: beforeGuest,
      actor: user.email,
      origin: 'dashboard'
    });

    if (auditErr) {
      return NextResponse.json({ ok: false, error: `Audit log failed: ${auditErr.message}` }, { status: 500 });
    }

    const { error: outboxErr } = await supabase.from('sync_outbox').insert({
      entity_type: 'wedding_guests',
      entity_id: id,
      operation: 'DELETE',
      payload: beforeGuest
    });

    if (outboxErr) {
      return NextResponse.json({ ok: false, error: `Sync outbox failed: ${outboxErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
