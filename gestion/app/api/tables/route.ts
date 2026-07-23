import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

async function checkAdminAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authorized: false, status: 401, error: 'UNAUTHORIZED' };

  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('role, active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.active) {
    return { authorized: false, status: 403, error: 'FORBIDDEN' };
  }

  return { authorized: true, user, profile };
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const auth = await checkAdminAuth(supabase);
    if (!auth.authorized) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }
    if (auth.profile.role === 'viewer') {
      return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });
    }

    const body = await request.json();

    const tableNumber = Number(body.table_number);
    const capacity = Number(body.capacity) || 10;
    const posX = Number.isFinite(Number(body.position_x)) ? Math.max(0, Math.min(100, Number(body.position_x))) : 50;
    const posY = Number.isFinite(Number(body.position_y)) ? Math.max(0, Math.min(100, Number(body.position_y))) : 50;

    if (!tableNumber || tableNumber <= 0) {
      return NextResponse.json({ ok: false, error: 'El número de mesa debe ser un entero positivo mayor a 0.' }, { status: 400 });
    }

    if (capacity < 1 || capacity > 30) {
      return NextResponse.json({ ok: false, error: 'La capacidad de la mesa debe estar entre 1 y 30 personas.' }, { status: 400 });
    }

    // Check unique table_number
    const { data: existingNum } = await supabase
      .from('wedding_tables')
      .select('id')
      .eq('table_number', tableNumber)
      .maybeSingle();

    if (existingNum) {
      return NextResponse.json({ ok: false, error: `Ya existe una mesa registrada con el número ${tableNumber}.` }, { status: 400 });
    }

    const insertData = {
      table_number: tableNumber,
      name: (body.name || `Mesa ${tableNumber}`).trim(),
      capacity,
      table_type: body.table_type || 'round_guest',
      zone: (body.zone || 'Principal').trim(),
      position_x: posX,
      position_y: posY,
      locked: Boolean(body.locked)
    };

    const { data: table, error } = await supabase
      .from('wedding_tables')
      .insert(insertData)
      .select()
      .single();

    if (error || !table) {
      return NextResponse.json({ ok: false, error: error?.message || 'Error al crear la mesa.' }, { status: 400 });
    }

    try {
      await supabase.from('audit_log').insert({
        entity_type: 'wedding_tables',
        entity_id: table.id,
        action: 'CREATE_TABLE',
        after_data: insertData,
        actor: auth.user.email,
        origin: 'dashboard'
      });
    } catch (auditErr) {
      console.warn('Audit log notice:', auditErr);
    }

    try {
      await supabase.from('sync_outbox').insert({
        entity_type: 'wedding_tables',
        entity_id: table.id,
        operation: 'INSERT',
        payload: table
      });
    } catch (outboxErr) {
      console.warn('Sync outbox notice:', outboxErr);
    }

    return NextResponse.json({ ok: true, table });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const auth = await checkAdminAuth(supabase);
    if (!auth.authorized) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }
    if (auth.profile.role === 'viewer') {
      return NextResponse.json({ ok: false, error: 'VIEWER_MUTATION_DENIED' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...rawUpdates } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ ok: false, error: 'ID de mesa faltante o inválido.' }, { status: 400 });
    }

    const { data: beforeTable } = await supabase.from('wedding_tables').select('*').eq('id', id).single();
    if (!beforeTable) {
      return NextResponse.json({ ok: false, error: 'Mesa no encontrada.' }, { status: 404 });
    }

    const ALLOWED_KEYS = ['table_number', 'name', 'capacity', 'table_type', 'zone', 'position_x', 'position_y', 'locked'];
    const updates: Record<string, any> = {};

    for (const key of ALLOWED_KEYS) {
      if (key in rawUpdates) {
        updates[key] = rawUpdates[key];
      }
    }

    // Validate table_number if present
    if ('table_number' in updates) {
      const num = Number(updates.table_number);
      if (!num || num <= 0) {
        return NextResponse.json({ ok: false, error: 'El número de mesa debe ser un entero positivo.' }, { status: 400 });
      }
      if (num !== beforeTable.table_number) {
        const { data: existingNum } = await supabase
          .from('wedding_tables')
          .select('id')
          .eq('table_number', num)
          .maybeSingle();

        if (existingNum && existingNum.id !== id) {
          return NextResponse.json({ ok: false, error: `Ya existe otra mesa registrada con el número ${num}.` }, { status: 400 });
        }
      }
      updates.table_number = num;
    }

    // Validate capacity
    if ('capacity' in updates) {
      const cap = Number(updates.capacity);
      if (!cap || cap < 1 || cap > 30) {
        return NextResponse.json({ ok: false, error: 'La capacidad debe estar entre 1 y 30 personas.' }, { status: 400 });
      }
      updates.capacity = cap;
    }

    // Validate positions
    if ('position_x' in updates) {
      updates.position_x = Math.max(0, Math.min(100, Number(updates.position_x)));
    }

    if ('position_y' in updates) {
      updates.position_y = Math.max(0, Math.min(100, Number(updates.position_y)));
    }

    if ('locked' in updates) {
      updates.locked = Boolean(updates.locked);
    }

    const { data: table, error } = await supabase
      .from('wedding_tables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !table) {
      return NextResponse.json({ ok: false, error: error?.message || 'Error actualizando mesa.' }, { status: 400 });
    }

    try {
      await supabase.from('audit_log').insert({
        entity_type: 'wedding_tables',
        entity_id: id,
        action: 'UPDATE_TABLE',
        before_data: beforeTable,
        after_data: updates,
        actor: auth.user.email,
        origin: 'dashboard'
      });
    } catch (auditErr) {
      console.warn('Audit log notice:', auditErr);
    }

    try {
      await supabase.from('sync_outbox').insert({
        entity_type: 'wedding_tables',
        entity_id: id,
        operation: 'UPDATE',
        payload: table
      });
    } catch (outboxErr) {
      console.warn('Sync outbox notice:', outboxErr);
    }

    return NextResponse.json({ ok: true, table });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const auth = await checkAdminAuth(supabase);
    if (!auth.authorized) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }
    if (auth.profile.role !== 'owner') {
      return NextResponse.json({ ok: false, error: 'ONLY_OWNER_CAN_DELETE_TABLES' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ ok: false, error: 'ID de mesa faltante.' }, { status: 400 });

    const { data: beforeTable } = await supabase.from('wedding_tables').select('*').eq('id', id).single();
    if (!beforeTable) return NextResponse.json({ ok: false, error: 'Mesa no encontrada.' }, { status: 404 });

    const { error: deleteErr } = await supabase.from('wedding_tables').delete().eq('id', id);
    if (deleteErr) {
      return NextResponse.json({ ok: false, error: `Error al eliminar mesa: ${deleteErr.message}` }, { status: 400 });
    }

    try {
      await supabase.from('audit_log').insert({
        entity_type: 'wedding_tables',
        entity_id: id,
        action: 'DELETE_TABLE',
        before_data: beforeTable,
        actor: auth.user.email,
        origin: 'dashboard'
      });
    } catch (auditErr) {
      console.warn('Audit log notice:', auditErr);
    }

    try {
      await supabase.from('sync_outbox').insert({
        entity_type: 'wedding_tables',
        entity_id: id,
        operation: 'DELETE',
        payload: beforeTable
      });
    } catch (outboxErr) {
      console.warn('Sync outbox notice:', outboxErr);
    }

    return NextResponse.json({ ok: true, deleted: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
