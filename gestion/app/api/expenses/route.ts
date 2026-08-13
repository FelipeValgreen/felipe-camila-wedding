import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

async function session() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 }) };
  const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
  if (!profile?.active) return { ok: false as const, response: NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 }) };
  return { ok: true as const, supabase, user, profile };
}

function writeBlock() {
  const block = getDatabaseWriteBlock();
  return block ? NextResponse.json(block, { status: 409 }) : null;
}

export async function POST(request: Request) {
  const blocked = writeBlock();
  if (blocked) return blocked;
  try {
    const s = await session();
    if (!s.ok) return s.response;
    if (s.profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });

    const body = await request.json();
    const { data: expense, error } = await s.supabase.from('expenses').insert(body).select().single();
    if (error) throw error;

    await s.supabase.from('audit_log').insert({
      entity_type: 'expenses', entity_id: expense.id, action: 'CREATE_EXPENSE', after_data: body,
      actor: s.user.email, origin: 'dashboard'
    });
    await s.supabase.from('sync_outbox').insert({ entity_type: 'expenses', entity_id: expense.id, operation: 'INSERT', payload: expense });
    return NextResponse.json({ ok: true, expense });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'No fue posible crear el gasto.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const blocked = writeBlock();
  if (blocked) return blocked;
  try {
    const s = await session();
    if (!s.ok) return s.response;
    if (s.profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'ID_REQUIRED' }, { status: 400 });
    const { data: before } = await s.supabase.from('expenses').select('*').eq('id', id).single();
    if (!before) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });

    const { data: expense, error } = await s.supabase.from('expenses').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await s.supabase.from('audit_log').insert({
      entity_type: 'expenses', entity_id: id, action: 'UPDATE_EXPENSE', before_data: before, after_data: updates,
      actor: s.user.email, origin: 'dashboard'
    });
    await s.supabase.from('sync_outbox').insert({ entity_type: 'expenses', entity_id: id, operation: 'UPDATE', payload: expense });
    return NextResponse.json({ ok: true, expense });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'No fue posible actualizar el gasto.' }, { status: 500 });
  }
}
