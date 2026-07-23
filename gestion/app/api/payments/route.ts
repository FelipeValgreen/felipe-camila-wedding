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
    const { data: payment, error } = await supabase.from('expense_payments').insert(body).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabase.from('audit_log').insert({
      entity_type: 'expense_payments',
      entity_id: payment.id,
      action: 'CREATE_PAYMENT',
      after_data: body,
      actor: user.email,
      origin: 'dashboard'
    });

    await supabase.from('sync_outbox').insert({
      entity_type: 'expense_payments',
      entity_id: payment.id,
      operation: 'INSERT',
      payload: payment
    });

    return NextResponse.json({ ok: true, payment });
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

    const { data: payment, error } = await supabase.from('expense_payments').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabase.from('audit_log').insert({
      entity_type: 'expense_payments',
      entity_id: id,
      action: 'UPDATE_PAYMENT',
      after_data: updates,
      actor: user.email,
      origin: 'dashboard'
    });

    await supabase.from('sync_outbox').insert({
      entity_type: 'expense_payments',
      entity_id: id,
      operation: 'UPDATE',
      payload: payment
    });

    return NextResponse.json({ ok: true, payment });
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
    if (profile.role !== 'owner') return NextResponse.json({ ok: false, error: 'ONLY_OWNER_CAN_DELETE_PAYMENTS' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ ok: false, error: 'Missing payment id' }, { status: 400 });

    const { data: beforePayment } = await supabase.from('expense_payments').select('*').eq('id', id).single();

    const { error } = await supabase.from('expense_payments').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabase.from('audit_log').insert({
      entity_type: 'expense_payments',
      entity_id: id,
      action: 'DELETE_PAYMENT',
      before_data: beforePayment,
      actor: user.email,
      origin: 'dashboard'
    });

    await supabase.from('sync_outbox').insert({
      entity_type: 'expense_payments',
      entity_id: id,
      operation: 'DELETE',
      payload: beforePayment
    });

    return NextResponse.json({ ok: true, deleted: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
