import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { deleteSheetRow, operationalSheetMode, readSheetRange, writeSheetRange } from '@/lib/google-sheets-server';

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

function documentRow(body: any) {
  const url = String(body.url || '').trim();
  if (url && !/^https?:\/\//i.test(url)) throw new Error('INVALID_URL');
  return [
    String(body.category || 'General').trim(),
    String(body.title || '').trim(),
    url,
    String(body.type || 'Documento').trim(),
    String(body.status || 'Activo').trim(),
    String(body.source || 'Drive').trim(),
    String(body.notes || '').trim(),
    String(body.updated || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })).trim(),
  ];
}

async function readDocuments() {
  const rows = await readSheetRange('DOCUMENTOS!A1:H200');
  const items = rows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    category: row[0] || 'General',
    title: row[1] || '',
    url: row[2] || '',
    type: row[3] || 'Documento',
    status: row[4] || 'Referencia',
    source: row[5] || 'Drive',
    notes: row[6] || '',
    updated: row[7] || '',
  })).filter((item) => item.title || item.url);
  return items;
}

export async function GET() {
  try {
    const auth = await authorize(false);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const items = await readDocuments();
    const suffix = operationalSheetMode() === 'staging' ? ' — STAGING' : '';
    return NextResponse.json({
      ok: true,
      mode: operationalSheetMode(),
      source: `F&C Centro Comandos${suffix} · DOCUMENTOS`,
      items,
      summary: {
        total: items.length,
        active: items.filter((item) => item.status.toLowerCase() === 'activo').length,
        reference: items.filter((item) => item.status.toLowerCase() === 'referencia').length,
        categories: new Set(items.map((item) => item.category)).size,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer el registro documental.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const body = await request.json();
    if (!String(body.title || '').trim()) return NextResponse.json({ ok: false, error: 'TITLE_REQUIRED' }, { status: 400 });
    const items = await readDocuments();
    const rowNumber = items.length ? Math.max(...items.map((item) => item.rowNumber)) + 1 : 2;
    await writeSheetRange(`DOCUMENTOS!A${rowNumber}:H${rowNumber}`, [documentRow(body)]);
    return NextResponse.json({ ok: true, rowNumber, mode: operationalSheetMode() });
  } catch (error: any) {
    const status = error?.message === 'INVALID_URL' ? 400 : 500;
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible agregar el documento.' }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const body = await request.json();
    const rowNumber = Number(body.rowNumber);
    if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > 200) return NextResponse.json({ ok: false, error: 'DOCUMENT_ROW_INVALID' }, { status: 400 });
    if (!String(body.title || '').trim()) return NextResponse.json({ ok: false, error: 'TITLE_REQUIRED' }, { status: 400 });
    await writeSheetRange(`DOCUMENTOS!A${rowNumber}:H${rowNumber}`, [documentRow(body)]);
    return NextResponse.json({ ok: true, rowNumber, mode: operationalSheetMode() });
  } catch (error: any) {
    const status = error?.message === 'INVALID_URL' ? 400 : 500;
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible actualizar el documento.' }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const rowNumber = Number(new URL(request.url).searchParams.get('rowNumber'));
    if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > 200) return NextResponse.json({ ok: false, error: 'DOCUMENT_ROW_INVALID' }, { status: 400 });
    await deleteSheetRow('DOCUMENTOS', rowNumber);
    return NextResponse.json({ ok: true, mode: operationalSheetMode() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible eliminar el documento.' }, { status: 500 });
  }
}
