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
    const { data: expense, error } = await supabase.from('expenses').insert(body).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabase.from('audit_log').insert({
      entity_type: 'expenses',
      entity_id: expense.id,
      action: 'CREATE_EXPENSE',
      after_data: body,
      actor: user.email,
      origin: 'dashboard'
    });

    await supabase.from('sync_outbox').insert({
      entity_type: 'expenses',
      entity_id: expense.id,
      operation: 'INSERT',
      payload: expense
    });

    return NextResponse.json({ ok: true, expense });
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

    const { data: expense, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabase.from('audit_log').insert({
      entity_type: 'expenses',
      entity_id: id,
      action: 'UPDATE_EXPENSE',
      after_data: updates,
      actor: user.email,
      origin: 'dashboard'
    });

    await supabase.from('sync_outbox').insert({
      entity_type: 'expenses',
      entity_id: id,
      operation: 'UPDATE',
      payload: expense
    });

    return NextResponse.json({ ok: true, expense });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
