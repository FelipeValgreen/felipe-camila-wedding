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

function clampDimension(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
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
    const posX = Number(body.position_x ?? 50);
    const posY = Number(body.position_y ?? 50);

    if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
      return NextResponse.json({ ok: false, error: 'El número de mesa debe ser un entero positivo.' }, { status: 400 });
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 30) {
      return NextResponse.json({ ok: false, error: 'La capacidad debe estar entre 1 y 30 personas.' }, { status: 400 });
    }
    if (!Number.isFinite(posX) || !Number.isFinite(posY)) {
      return NextResponse.json({ ok: false, error: 'Las coordenadas de la mesa no son válidas.' }, { status: 400 });
    }

    const { data: existingNumber } = await supabase
      .from('wedding_tables')
      .select('id')
      .eq('table_number', tableNumber)
      .maybeSingle();

    if (existingNumber) {
      return NextResponse.json({ ok: false, error: `Ya existe la Mesa ${tableNumber}.` }, { status: 400 });
    }

    const tableType = String(body.table_type || 'round_guest');
    const insertData = {
      table_number: tableNumber,
      name: String(body.name || `Mesa ${tableNumber}`).trim(),
      capacity,
      table_type: tableType,
      zone: String(body.zone || 'Principal').trim(),
      position_x: Math.max(4, Math.min(96, posX)),
      position_y: Math.max(6, Math.min(94, posY)),
      width: clampDimension(body.width, tableType === 'rectangular_guest' ? 18 : 10, 6, 36),
      height: clampDimension(body.height, tableType === 'rectangular_guest' ? 8 : 10, 6, 24),
      rotation: clampDimension(body.rotation, 0, -180, 180),
      locked: Boolean(body.locked)
    };

    const { data: table, error } = await supabase
      .from('wedding_tables')
      .insert(insertData)
      .select()
      .single();

    if (error || !table) {
      return NextResponse.json({ ok: false, error: error?.message || 'No fue posible crear la mesa.' }, { status: 400 });
    }

    const warnings: string[] = [];
    const { error: auditError } = await supabase.from('audit_log').insert({
      entity_type: 'wedding_tables',
      entity_id: table.id,
      action: 'CREATE_TABLE',
      after_data: insertData,
      actor: auth.user.email,
      origin: 'dashboard'
    });
    if (auditError) warnings.push('AUDIT_INSERT_FAILED');

    const { error: outboxError } = await supabase.from('sync_outbox').insert({
      entity_type: 'wedding_tables',
      entity_id: table.id,
      operation: 'INSERT',
      payload: table
    });
    if (outboxError) warnings.push('OUTBOX_INSERT_FAILED');

    return NextResponse.json({ ok: true, table, warnings });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error interno.' }, { status: 500 });
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
      return NextResponse.json({ ok: false, error: 'ID de mesa inválido.' }, { status: 400 });
    }

    const { data: beforeTable } = await supabase
      .from('wedding_tables')
      .select('*')
      .eq('id', id)
      .single();

    if (!beforeTable) {
      return NextResponse.json({ ok: false, error: 'Mesa no encontrada.' }, { status: 404 });
    }

    const allowedKeys = [
      'table_number', 'name', 'capacity', 'table_type', 'zone',
      'position_x', 'position_y', 'width', 'height', 'rotation', 'locked', 'notes'
    ];
    const updates: Record<string, any> = {};
    for (const key of allowedKeys) {
      if (key in rawUpdates) updates[key] = rawUpdates[key];
    }

    if ('table_number' in updates) {
      const tableNumber = Number(updates.table_number);
      if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
        return NextResponse.json({ ok: false, error: 'El número de mesa debe ser un entero positivo.' }, { status: 400 });
      }
      if (tableNumber !== beforeTable.table_number) {
        const { data: duplicate } = await supabase
          .from('wedding_tables')
          .select('id')
          .eq('table_number', tableNumber)
          .neq('id', id)
          .maybeSingle();
        if (duplicate) {
          return NextResponse.json({ ok: false, error: `Ya existe la Mesa ${tableNumber}.` }, { status: 400 });
        }
      }
      updates.table_number = tableNumber;
    }

    if ('capacity' in updates) {
      const capacity = Number(updates.capacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 30) {
        return NextResponse.json({ ok: false, error: 'La capacidad debe estar entre 1 y 30 personas.' }, { status: 400 });
      }

      const { count } = await supabase
        .from('seating_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('table_id', id);
      if ((count || 0) > capacity) {
        return NextResponse.json({
          ok: false,
          error: `No puedes reducir la capacidad a ${capacity}: actualmente hay ${count} personas asignadas.`
        }, { status: 409 });
      }
      updates.capacity = capacity;
    }

    if ('position_x' in updates) {
      const positionX = Number(updates.position_x);
      if (!Number.isFinite(positionX)) {
        return NextResponse.json({ ok: false, error: 'La posición X no es válida.' }, { status: 400 });
      }
      updates.position_x = Math.max(4, Math.min(96, positionX));
    }
    if ('position_y' in updates) {
      const positionY = Number(updates.position_y);
      if (!Number.isFinite(positionY)) {
        return NextResponse.json({ ok: false, error: 'La posición Y no es válida.' }, { status: 400 });
      }
      updates.position_y = Math.max(6, Math.min(94, positionY));
    }
    if ('width' in updates) updates.width = clampDimension(updates.width, Number(beforeTable.width || 10), 6, 36);
    if ('height' in updates) updates.height = clampDimension(updates.height, Number(beforeTable.height || 10), 6, 24);
    if ('rotation' in updates) updates.rotation = clampDimension(updates.rotation, Number(beforeTable.rotation || 0), -180, 180);
    if ('name' in updates) updates.name = String(updates.name || '').trim() || beforeTable.name;
    if ('zone' in updates) updates.zone = String(updates.zone || '').trim() || 'Principal';
    if ('table_type' in updates) updates.table_type = String(updates.table_type || beforeTable.table_type || 'round_guest');
    if ('locked' in updates) updates.locked = Boolean(updates.locked);

    const { data: table, error } = await supabase
      .from('wedding_tables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !table) {
      return NextResponse.json({ ok: false, error: error?.message || 'No fue posible actualizar la mesa.' }, { status: 400 });
    }

    const warnings: string[] = [];
    const { error: auditError } = await supabase.from('audit_log').insert({
      entity_type: 'wedding_tables',
      entity_id: id,
      action: 'UPDATE_TABLE',
      before_data: beforeTable,
      after_data: updates,
      actor: auth.user.email,
      origin: 'dashboard'
    });
    if (auditError) warnings.push('AUDIT_INSERT_FAILED');

    const { error: outboxError } = await supabase.from('sync_outbox').insert({
      entity_type: 'wedding_tables',
      entity_id: id,
      operation: 'UPDATE',
      payload: table
    });
    if (outboxError) warnings.push('OUTBOX_INSERT_FAILED');

    return NextResponse.json({ ok: true, table, warnings });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error interno.' }, { status: 500 });
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

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID de mesa faltante.' }, { status: 400 });

    const { data: beforeTable } = await supabase
      .from('wedding_tables')
      .select('*')
      .eq('id', id)
      .single();
    if (!beforeTable) return NextResponse.json({ ok: false, error: 'Mesa no encontrada.' }, { status: 404 });

    const { count } = await supabase
      .from('seating_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('table_id', id);
    if ((count || 0) > 0) {
      return NextResponse.json({
        ok: false,
        error: `La mesa tiene ${count} persona(s). Debes reasignarlas antes de eliminarla.`
      }, { status: 409 });
    }

    const { error: deleteError } = await supabase.from('wedding_tables').delete().eq('id', id);
    if (deleteError) {
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 400 });
    }

    const warnings: string[] = [];
    const { error: auditError } = await supabase.from('audit_log').insert({
      entity_type: 'wedding_tables',
      entity_id: id,
      action: 'DELETE_TABLE',
      before_data: beforeTable,
      actor: auth.user.email,
      origin: 'dashboard'
    });
    if (auditError) warnings.push('AUDIT_INSERT_FAILED');

    const { error: outboxError } = await supabase.from('sync_outbox').insert({
      entity_type: 'wedding_tables',
      entity_id: id,
      operation: 'DELETE',
      payload: beforeTable
    });
    if (outboxError) warnings.push('OUTBOX_INSERT_FAILED');

    return NextResponse.json({ ok: true, deleted: true, warnings });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error interno.' }, { status: 500 });
  }
}
