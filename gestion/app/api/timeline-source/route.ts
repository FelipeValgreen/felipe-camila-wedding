import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { clearSheetRange, operationalSheetMode, readSheetRange, writeSheetRange } from '@/lib/google-sheets-server';

export const dynamic = 'force-dynamic';

async function authorize(write = false) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'UNAUTHORIZED' };
  const { data: profile } = await supabase.from('admin_profiles').select('active, role').eq('id', user.id).single();
  if (!profile?.active) return { ok: false as const, status: 403, error: 'FORBIDDEN' };
  if (write && profile.role === 'viewer') return { ok: false as const, status: 403, error: 'VIEWER_MUTATION_DENIED' };
  return { ok: true as const, user, profile };
}

function timelineRow(body: any) {
  return [
    String(body.dateTime || '').trim(),
    String(body.block || '').trim(),
    String(body.owner || '').trim(),
    String(body.duration || '').trim(),
    String(body.status || 'Pendiente').trim(),
    String(body.dependencies || '').trim(),
    String(body.notes || '').trim(),
  ];
}

async function readTimeline() {
  const rows = await readSheetRange('TIMELINE!A1:G200');
  const items = rows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    dateTime: row[0] || '',
    block: row[1] || '',
    owner: row[2] || '',
    duration: row[3] || '',
    status: row[4] || '',
    dependencies: row[5] || '',
    notes: row[6] || '',
  })).filter((item) => item.dateTime || item.block);
  const confirmed = items.filter((item) => item.status.toLowerCase() === 'confirmado').length;
  return { rows, items, summary: { total: items.length, confirmed, pending: items.length - confirmed } };
}

export async function GET() {
  try {
    const auth = await authorize(false);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const timeline = await readTimeline();
    return NextResponse.json({
      ok: true,
      source: `F&C Centro Comandos${operationalSheetMode() === 'staging' ? ' — STAGING' : ''} · TIMELINE`,
      mode: operationalSheetMode(),
      items: timeline.items,
      summary: timeline.summary,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer el cronograma.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const body = await request.json();
    if (!String(body.block || '').trim()) return NextResponse.json({ ok: false, error: 'El nombre del bloque es obligatorio.' }, { status: 400 });
    const timeline = await readTimeline();
    const usedRows = timeline.items.map((item) => item.rowNumber);
    const rowNumber = usedRows.length ? Math.max(...usedRows) + 1 : 2;
    await writeSheetRange(`TIMELINE!A${rowNumber}:G${rowNumber}`, [timelineRow(body)]);
    return NextResponse.json({ ok: true, rowNumber, mode: operationalSheetMode() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible crear el bloque.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const body = await request.json();
    const rowNumber = Number(body.rowNumber);
    if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > 200) return NextResponse.json({ ok: false, error: 'Fila de cronograma inválida.' }, { status: 400 });
    if (!String(body.block || '').trim()) return NextResponse.json({ ok: false, error: 'El nombre del bloque es obligatorio.' }, { status: 400 });
    await writeSheetRange(`TIMELINE!A${rowNumber}:G${rowNumber}`, [timelineRow(body)]);
    return NextResponse.json({ ok: true, rowNumber, mode: operationalSheetMode() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible actualizar el bloque.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const rowNumber = Number(new URL(request.url).searchParams.get('rowNumber'));
    if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > 200) return NextResponse.json({ ok: false, error: 'Fila de cronograma inválida.' }, { status: 400 });
    await clearSheetRange(`TIMELINE!A${rowNumber}:G${rowNumber}`);
    return NextResponse.json({ ok: true, rowNumber, mode: operationalSheetMode() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible eliminar el bloque.' }, { status: 500 });
  }
}
