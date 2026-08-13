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

function toTask(row: any) {
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    category: row.category || 'General',
    owner: row.owner || '',
    status: row.status || 'Pendiente',
    priority: row.priority || 'Media',
    dueAt: row.due_at || null,
    source: row.source || 'manual',
    relatedEntityType: row.related_entity_type || null,
    relatedEntityId: row.related_entity_id || null,
    completedAt: row.completed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const session = await auth(); if (!session.ok) return session.response;
    const { data, error } = await session.supabase.from('event_tasks').select('*').order('status').order('due_at', { ascending: true, nullsFirst: false }).order('created_at');
    if (error) throw error;
    const tasks = (data || []).map(toTask);
    return NextResponse.json({ ok: true, tasks, summary: { total: tasks.length, completed: tasks.filter((task) => task.status === 'Completada').length, pending: tasks.filter((task) => task.status !== 'Completada').length }, fetchedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer las tareas.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const block = getDatabaseWriteBlock(); if (block) return NextResponse.json(block, { status: 409 });
  try {
    const session = await auth(); if (!session.ok) return session.response;
    if (session.profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });
    const body = await request.json();
    const title = String(body?.title || '').trim();
    if (!title) return NextResponse.json({ ok: false, error: 'El título es obligatorio.' }, { status: 400 });
    const status = String(body.status || 'Pendiente');
    const payload = {
      title,
      description: body.description || null,
      category: String(body.category || 'General'),
      owner: body.owner || null,
      status,
      priority: String(body.priority || 'Media'),
      due_at: body.dueAt || null,
      source: String(body.source || 'manual'),
      related_entity_type: body.relatedEntityType || null,
      related_entity_id: body.relatedEntityId || null,
      completed_at: status === 'Completada' ? new Date().toISOString() : null,
    };
    const { data, error } = await session.supabase.from('event_tasks').insert(payload).select().single();
    if (error) throw error;
    await session.supabase.from('audit_log').insert({ entity_type: 'event_tasks', entity_id: data.id, action: 'CREATE_TASK', after_data: payload, actor: session.user.email, origin: 'dashboard' });
    return NextResponse.json({ ok: true, task: toTask(data) });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible crear la tarea.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const block = getDatabaseWriteBlock(); if (block) return NextResponse.json(block, { status: 409 });
  try {
    const session = await auth(); if (!session.ok) return session.response;
    if (session.profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });
    const body = await request.json();
    if (!body?.id) return NextResponse.json({ ok: false, error: 'ID_REQUIRED' }, { status: 400 });
    const { data: before } = await session.supabase.from('event_tasks').select('*').eq('id', body.id).single();
    if (!before) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    const map: Record<string, string> = { title: 'title', description: 'description', category: 'category', owner: 'owner', status: 'status', priority: 'priority', dueAt: 'due_at', source: 'source', relatedEntityType: 'related_entity_type', relatedEntityId: 'related_entity_id' };
    const updates: Record<string, any> = {};
    for (const [key, db] of Object.entries(map)) if (key in body) updates[db] = body[key] === '' ? null : body[key];
    if ('status' in body) updates.completed_at = body.status === 'Completada' ? (before.completed_at || new Date().toISOString()) : null;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await session.supabase.from('event_tasks').update(updates).eq('id', body.id).select().single();
    if (error) throw error;
    await session.supabase.from('audit_log').insert({ entity_type: 'event_tasks', entity_id: body.id, action: 'UPDATE_TASK', before_data: before, after_data: updates, actor: session.user.email, origin: 'dashboard' });
    return NextResponse.json({ ok: true, task: toTask(data) });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible actualizar la tarea.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const block = getDatabaseWriteBlock(); if (block) return NextResponse.json(block, { status: 409 });
  try {
    const session = await auth(); if (!session.ok) return session.response;
    if (session.profile.role !== 'owner') return NextResponse.json({ ok: false, error: 'ONLY_OWNER_CAN_DELETE' }, { status: 403 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID_REQUIRED' }, { status: 400 });
    const { data: before } = await session.supabase.from('event_tasks').select('*').eq('id', id).single();
    if (!before) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    const { error } = await session.supabase.from('event_tasks').delete().eq('id', id);
    if (error) throw error;
    await session.supabase.from('audit_log').insert({ entity_type: 'event_tasks', entity_id: id, action: 'DELETE_TASK', before_data: before, actor: session.user.email, origin: 'dashboard' });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible eliminar la tarea.' }, { status: 500 });
  }
}
