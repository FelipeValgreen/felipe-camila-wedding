import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

async function checkAdminAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authorized: false, status: 401, error: 'UNAUTHORIZED' };
  const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
  if (!profile || !profile.active) return { authorized: false, status: 403, error: 'FORBIDDEN' };
  return { authorized: true, user, profile };
}

function seatingError(message: string): { status: number; text: string } {
  if (message.includes('TABLE_FULL')) return { status: 409, text: 'La mesa ya alcanzó su capacidad máxima.' };
  if (message.includes('ONLY_ATTENDING_GUESTS_CAN_BE_SEATED')) return { status: 409, text: 'Solo se pueden asignar a mesa personas confirmadas como asistentes.' };
  if (message.includes('GUEST_NOT_FOUND_OR_INACTIVE')) return { status: 404, text: 'El invitado no existe o está inactivo.' };
  if (message.includes('TABLE_NOT_FOUND')) return { status: 404, text: 'La mesa seleccionada no existe.' };
  if (message.includes('FORBIDDEN')) return { status: 403, text: 'No tienes permisos para modificar las mesas.' };
  return { status: 500, text: message || 'No fue posible guardar la asignación.' };
}

function writeBlockResponse() {
  const block = getDatabaseWriteBlock();
  return block ? NextResponse.json(block, { status: 409 }) : null;
}

export async function POST(request: Request) {
  try {
    const blocked = writeBlockResponse();
    if (blocked) return blocked;
    const supabase = createClient();
    const auth = await checkAdminAuth(supabase);
    if (!auth.authorized) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    if (auth.profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });

    const body = await request.json();
    const guestId = body.guest_id;
    const tableId = body.table_id;
    if (!guestId || !tableId) return NextResponse.json({ ok: false, error: 'Debes indicar invitado y mesa.' }, { status: 400 });

    const { data, error } = await supabase.rpc('assign_guest_to_table', { p_guest_id: guestId, p_table_id: tableId });
    if (error) { const parsed = seatingError(error.message); return NextResponse.json({ ok: false, error: parsed.text }, { status: parsed.status }); }
    return NextResponse.json(data);
  } catch (error: any) {
    const parsed = seatingError(error?.message || '');
    return NextResponse.json({ ok: false, error: parsed.text }, { status: parsed.status });
  }
}

export async function DELETE(request: Request) {
  try {
    const blocked = writeBlockResponse();
    if (blocked) return blocked;
    const supabase = createClient();
    const auth = await checkAdminAuth(supabase);
    if (!auth.authorized) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    if (auth.profile.role === 'viewer') return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });

    const guestId = new URL(request.url).searchParams.get('guest_id');
    if (!guestId) return NextResponse.json({ ok: false, error: 'Falta el invitado que deseas quitar de la mesa.' }, { status: 400 });
    const { data, error } = await supabase.rpc('unassign_guest_from_table', { p_guest_id: guestId });
    if (error) { const parsed = seatingError(error.message); return NextResponse.json({ ok: false, error: parsed.text }, { status: parsed.status }); }
    return NextResponse.json(data);
  } catch (error: any) {
    const parsed = seatingError(error?.message || '');
    return NextResponse.json({ ok: false, error: parsed.text }, { status: parsed.status });
  }
}
