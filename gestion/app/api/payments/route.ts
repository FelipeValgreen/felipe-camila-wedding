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

export async function POST(request: Request) {
  const block = getDatabaseWriteBlock();
  if (block) return NextResponse.json(block, { status: 409 });
  try {
    const s = await session();
    if (!s.ok) return s.response;
    if (s.profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });
    const body = await request.json();
    if (!body?.expense_id || !Number.isFinite(Number(body?.amount)) || Number(body.amount) < 0) return NextResponse.json({ ok: false, error: 'EXPENSE_AND_VALID_AMOUNT_REQUIRED' }, { status: 400 });
    const payload = {
      expense_id: body.expense_id,
      amount: Number(body.amount),
      currency: String(body.currency || 'CLP'),
      payment_date: body.payment_date || new Date().toISOString().slice(0, 10),
      payment_type: body.payment_type || null,
      status: String(body.status || 'Pagado'),
      reference: body.reference || null,
      notes: body.notes || null,
    };
    const { data: payment, error } = await s.supabase.from('expense_payments').insert(payload).select().single();
    if (error) throw error;
    await s.supabase.from('audit_log').insert({ entity_type: 'expense_payments', entity_id: payment.id, action: 'CREATE_PAYMENT', after_data: payload, actor: s.user.email, origin: 'dashboard' });
    await s.supabase.from('sync_outbox').insert({ entity_type: 'expense_payments', entity_id: payment.id, operation: 'INSERT', payload: payment });
    return NextResponse.json({ ok: true, payment });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'No fue posible registrar el pago.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const block = getDatabaseWriteBlock();
  if (block) return NextResponse.json(block, { status: 409 });
  try {
    const s = await session();
    if (!s.ok) return s.response;
    if (s.profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });
    const body = await request.json();
    const { id, ...raw } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'ID_REQUIRED' }, { status: 400 });
    const { data: beforePayment } = await s.supabase.from('expense_payments').select('*').eq('id', id).single();
    if (!beforePayment) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    const allowed = ['expense_id', 'amount', 'currency', 'payment_date', 'payment_type', 'status', 'reference', 'notes'];
    const updates: Record<string, any> = {};
    for (const key of allowed) if (key in raw) updates[key] = raw[key] === '' ? null : raw[key];
    if ('amount' in updates) {
      const amount = Number(updates.amount);
      if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ ok: false, error: 'INVALID_AMOUNT' }, { status: 400 });
      updates.amount = amount;
    }
    const { data: payment, error } = await s.supabase.from('expense_payments').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await s.supabase.from('audit_log').insert({ entity_type: 'expense_payments', entity_id: id, action: 'UPDATE_PAYMENT', before_data: beforePayment, after_data: updates, actor: s.user.email, origin: 'dashboard' });
    await s.supabase.from('sync_outbox').insert({ entity_type: 'expense_payments', entity_id: id, operation: 'UPDATE', payload: payment });
    return NextResponse.json({ ok: true, payment });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'No fue posible actualizar el pago.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const block = getDatabaseWriteBlock();
  if (block) return NextResponse.json(block, { status: 409 });
  try {
    const s = await session();
    if (!s.ok) return s.response;
    if (s.profile.role !== 'owner') return NextResponse.json({ ok: false, error: 'ONLY_OWNER_CAN_DELETE_PAYMENTS' }, { status: 403 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID_REQUIRED' }, { status: 400 });
    const { data: beforePayment } = await s.supabase.from('expense_payments').select('*').eq('id', id).single();
    if (!beforePayment) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    const { error } = await s.supabase.from('expense_payments').delete().eq('id', id);
    if (error) throw error;
    await s.supabase.from('audit_log').insert({ entity_type: 'expense_payments', entity_id: id, action: 'DELETE_PAYMENT', before_data: beforePayment, actor: s.user.email, origin: 'dashboard' });
    await s.supabase.from('sync_outbox').insert({ entity_type: 'expense_payments', entity_id: id, operation: 'DELETE', payload: beforePayment });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'No fue posible eliminar el pago.' }, { status: 500 });
  }
}
