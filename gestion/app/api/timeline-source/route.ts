import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

export const dynamic = 'force-dynamic';

async function auth() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 }) };
  const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
  if (!profile?.active) return { ok: false as const, response: NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 }) };
  return { ok: true as const, supabase, user, profile };
}

function toItem(row: any, index = 0) {
  const startsAt = row.starts_at ? new Date(row.starts_at) : null;
  const endsAt = row.ends_at ? new Date(row.ends_at) : null;
  const durationMinutes = startsAt && endsAt ? Math.max(0, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000)) : null;
  return {
    id: row.id,
    rowNumber: index + 1,
    dateTime: row.starts_at || '',
    endsAt: row.ends_at || null,
    block: row.title || '',
    category: row.category || 'General',
    owner: row.owner || '',
    location: row.location || '',
    duration: durationMinutes ? `${durationMinutes} min` : '',
    status: row.status || 'Pendiente',
    dependencies: row.dependencies || '',
    notes: row.notes || '',
    sortOrder: row.sort_order || 0,
    source: row.source || 'dashboard',
  };
}

export async function GET() {
  try {
    const session = await auth(); if (!session.ok) return session.response;
    const { data, error } = await session.supabase.from('event_timeline_items').select('*').order('sort_order').order('starts_at');
    if (error) throw error;
    const items = (data || []).map(toItem);
    const confirmed = items.filter((item) => item.status.toLowerCase() === 'confirmado').length;
    return NextResponse.json({ ok: true, source: 'Supabase · event_timeline_items', mirrorSource: 'F&C Centro Comandos · TIMELINE', canonical: true, items, summary: { total: items.length, confirmed, pending: items.length - confirmed }, fetchedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer el cronograma.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const writeBlock = getDatabaseWriteBlock(); if (writeBlock) return NextResponse.json(writeBlock, { status: 409 });
  try {
    const session = await auth(); if (!session.ok) return session.response;
    if (session.profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });
    const body = await request.json();
    if (!body?.block || !body?.dateTime) return NextResponse.json({ ok: false, error: 'Título y fecha/hora son obligatorios.' }, { status: 400 });
    const payload = { starts_at: body.dateTime, ends_at: body.endsAt || null, title: String(body.block).trim(), category: String(body.category || 'General'), owner: body.owner || null, location: body.location || null, status: String(body.status || 'Pendiente'), dependencies: body.dependencies || null, notes: body.notes || null, source: 'dashboard', sort_order: Number(body.sortOrder || Date.now() % 1000000) };
    const { data, error } = await session.supabase.from('event_timeline_items').insert(payload).select().single(); if (error) throw error;
    await session.supabase.from('audit_log').insert({ entity_type: 'event_timeline_items', entity_id: data.id, action: 'CREATE_TIMELINE_ITEM', after_data: payload, actor: session.user.email, origin: 'dashboard' });
    return NextResponse.json({ ok: true, item: toItem(data) });
  } catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || 'No fue posible crear el bloque.' }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const writeBlock = getDatabaseWriteBlock(); if (writeBlock) return NextResponse.json(writeBlock, { status: 409 });
  try {
    const session = await auth(); if (!session.ok) return session.response;
    if (session.profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });
    const body = await request.json(); if (!body?.id) return NextResponse.json({ ok: false, error: 'ID_REQUIRED' }, { status: 400 });
    const { data: before } = await session.supabase.from('event_timeline_items').select('*').eq('id', body.id).single(); if (!before) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    const updates: Record<string, any> = {};
    const map: Record<string,string> = { dateTime:'starts_at', endsAt:'ends_at', block:'title', category:'category', owner:'owner', location:'location', status:'status', dependencies:'dependencies', notes:'notes', sortOrder:'sort_order' };
    for (const [inputKey, dbKey] of Object.entries(map)) if (inputKey in body) updates[dbKey] = body[inputKey] === '' ? null : body[inputKey];
    updates.updated_at = new Date().toISOString();
    const { data, error } = await session.supabase.from('event_timeline_items').update(updates).eq('id', body.id).select().single(); if (error) throw error;
    await session.supabase.from('audit_log').insert({ entity_type: 'event_timeline_items', entity_id: body.id, action: 'UPDATE_TIMELINE_ITEM', before_data: before, after_data: updates, actor: session.user.email, origin: 'dashboard' });
    return NextResponse.json({ ok: true, item: toItem(data) });
  } catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || 'No fue posible actualizar el bloque.' }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const writeBlock = getDatabaseWriteBlock(); if (writeBlock) return NextResponse.json(writeBlock, { status: 409 });
  try {
    const session = await auth(); if (!session.ok) return session.response;
    if (session.profile.role !== 'owner') return NextResponse.json({ ok: false, error: 'ONLY_OWNER_CAN_DELETE' }, { status: 403 });
    const id = new URL(request.url).searchParams.get('id'); if (!id) return NextResponse.json({ ok: false, error: 'ID_REQUIRED' }, { status: 400 });
    const { data: before } = await session.supabase.from('event_timeline_items').select('*').eq('id', id).single(); if (!before) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    const { error } = await session.supabase.from('event_timeline_items').delete().eq('id', id); if (error) throw error;
    await session.supabase.from('audit_log').insert({ entity_type: 'event_timeline_items', entity_id: id, action: 'DELETE_TIMELINE_ITEM', before_data: before, actor: session.user.email, origin: 'dashboard' });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || 'No fue posible eliminar el bloque.' }, { status: 500 }); }
}
