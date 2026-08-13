import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

async function authorize(write = false, ownerOnly = false) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'UNAUTHORIZED', supabase };
  const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
  if (!profile?.active) return { ok: false as const, status: 403, error: 'FORBIDDEN', supabase };
  if (write && profile.role === 'viewer') return { ok: false as const, status: 403, error: 'VIEWER_MUTATION_DENIED', supabase };
  if (ownerOnly && profile.role !== 'owner') return { ok: false as const, status: 403, error: 'ONLY_OWNER_CAN_DELETE_VENDORS', supabase };
  return { ok: true as const, user, profile, supabase };
}

export async function POST(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const body = await request.json();
    const { data: vendor, error } = await auth.supabase.from('vendors').insert(body).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await auth.supabase.from('audit_log').insert({ entity_type: 'vendors', entity_id: vendor.id, action: 'CREATE_VENDOR', after_data: body, actor: auth.user.email, origin: 'dashboard' });
    await auth.supabase.from('sync_outbox').insert({ entity_type: 'vendors', entity_id: vendor.id, operation: 'INSERT', payload: vendor });
    return NextResponse.json({ ok: true, vendor });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'No fue posible crear el proveedor.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'VENDOR_ID_REQUIRED' }, { status: 400 });
    const { data: beforeVendor } = await auth.supabase.from('vendors').select('*').eq('id', id).single();
    const { data: vendor, error } = await auth.supabase.from('vendors').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await auth.supabase.from('audit_log').insert({ entity_type: 'vendors', entity_id: id, action: 'UPDATE_VENDOR', before_data: beforeVendor, after_data: updates, actor: auth.user.email, origin: 'dashboard' });
    await auth.supabase.from('sync_outbox').insert({ entity_type: 'vendors', entity_id: id, operation: 'UPDATE', payload: vendor });
    return NextResponse.json({ ok: true, vendor });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'No fue posible actualizar el proveedor.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorize(true, true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'VENDOR_ID_REQUIRED' }, { status: 400 });
    const { data: beforeVendor, error: beforeError } = await auth.supabase.from('vendors').select('*').eq('id', id).single();
    if (beforeError || !beforeVendor) return NextResponse.json({ ok: false, error: 'VENDOR_NOT_FOUND' }, { status: 404 });
    const { error } = await auth.supabase.from('vendors').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await auth.supabase.from('audit_log').insert({ entity_type: 'vendors', entity_id: id, action: 'DELETE_VENDOR', before_data: beforeVendor, actor: auth.user.email, origin: 'dashboard' });
    await auth.supabase.from('sync_outbox').insert({ entity_type: 'vendors', entity_id: id, operation: 'DELETE', payload: beforeVendor });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'No fue posible eliminar el proveedor.' }, { status: 500 });
  }
}
