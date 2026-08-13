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

function clp(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[^0-9-]/g, '');
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function containsMusicSignal(values: string[]) {
  const haystack = values.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return ['musica', 'dj', 'banda', 'sonido', 'playlist', 'disociados', 'fiesta', 'cocktail', 'violin'].some((term) => haystack.includes(term));
}

function playlistRow(body: any) {
  return [
    String(body.moment || '').trim(),
    String(body.song || '').trim(),
    String(body.artist || '').trim(),
    String(body.version || '').trim(),
    String(body.link || '').trim(),
    String(body.cue || '').trim(),
    String(body.owner || '').trim(),
    String(body.status || 'Pendiente').trim(),
    String(body.type || 'Normal').trim(),
    String(body.notes || '').trim(),
  ];
}

async function readMusic() {
  const [playlistRows, timelineRows, budgetRows] = await Promise.all([
    readSheetRange('MUSICA!A1:J300'),
    readSheetRange('TIMELINE!A1:G200'),
    readSheetRange('PRESUPUESTO_IGLESIA!A1:K120'),
  ]);

  const playlist = playlistRows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    moment: row[0] || '',
    song: row[1] || '',
    artist: row[2] || '',
    version: row[3] || '',
    link: row[4] || '',
    cue: row[5] || '',
    owner: row[6] || '',
    status: row[7] || '',
    type: row[8] || '',
    notes: row[9] || '',
  })).filter((item) => item.moment || item.song || item.artist || item.notes);

  const moments = timelineRows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    dateTime: row[0] || '',
    block: row[1] || '',
    owner: row[2] || '',
    duration: row[3] || '',
    status: row[4] || '',
    dependencies: row[5] || '',
    notes: row[6] || '',
  })).filter((item) => (item.dateTime || item.block) && containsMusicSignal([item.block, item.owner, item.dependencies, item.notes]));

  const budgetItems = budgetRows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    item: row[0] || '',
    projectedQuantity: row[1] || '',
    confirmedQuantity: row[2] || '',
    unitNet: clp(row[3]),
    vat: row[4] || '',
    projectedGross: clp(row[5]),
    category: row[6] || '',
    responsible: row[7] || '',
    status: row[8] || '',
    notes: row[9] || '',
    advance: clp(row[10]),
  })).filter((item) => item.item && containsMusicSignal([item.item, item.category, item.responsible, item.status, item.notes]));

  const confirmedMoments = moments.filter((item) => item.status.toLowerCase() === 'confirmado').length;
  const confirmedBudget = budgetItems.filter((item) => item.status.toLowerCase() === 'confirmado').length;
  const confirmedPlaylist = playlist.filter((item) => item.status.toLowerCase() === 'confirmado').length;
  const mustPlay = playlist.filter((item) => item.type.toLowerCase().includes('obligatoria') || item.type.toLowerCase().includes('must')).length;
  const doNotPlay = playlist.filter((item) => item.type.toLowerCase().includes('no tocar') || item.type.toLowerCase().includes('prohib')).length;

  return {
    playlist,
    moments,
    budgetItems,
    summary: {
      moments: moments.length,
      confirmedMoments,
      pendingMoments: moments.length - confirmedMoments,
      budgetItems: budgetItems.length,
      confirmedBudget,
      pendingBudget: budgetItems.length - confirmedBudget,
      budgetTotal: budgetItems.reduce((sum, item) => sum + Number(item.projectedGross || 0), 0),
      playlistItems: playlist.length,
      confirmedPlaylist,
      pendingPlaylist: playlist.length - confirmedPlaylist,
      mustPlay,
      doNotPlay,
      hasDetailedPlaylist: playlist.length > 0,
    },
  };
}

export async function GET() {
  try {
    const auth = await authorize(false);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const data = await readMusic();
    const suffix = operationalSheetMode() === 'staging' ? ' — STAGING' : '';
    return NextResponse.json({
      ok: true,
      mode: operationalSheetMode(),
      sources: [`F&C Centro Comandos${suffix} · MUSICA`, `F&C Centro Comandos${suffix} · TIMELINE`, `F&C Centro Comandos${suffix} · PRESUPUESTO_IGLESIA`],
      ...data,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer la operación musical.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const body = await request.json();
    if (!String(body.moment || '').trim() && !String(body.song || '').trim()) {
      return NextResponse.json({ ok: false, error: 'Indica al menos el momento o la canción.' }, { status: 400 });
    }
    const data = await readMusic();
    const rowNumber = data.playlist.length ? Math.max(...data.playlist.map((item) => item.rowNumber)) + 1 : 2;
    await writeSheetRange(`MUSICA!A${rowNumber}:J${rowNumber}`, [playlistRow(body)]);
    return NextResponse.json({ ok: true, rowNumber, mode: operationalSheetMode() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible agregar la canción.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const body = await request.json();
    const rowNumber = Number(body.rowNumber);
    if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > 300) return NextResponse.json({ ok: false, error: 'Fila musical inválida.' }, { status: 400 });
    if (!String(body.moment || '').trim() && !String(body.song || '').trim()) return NextResponse.json({ ok: false, error: 'Indica al menos el momento o la canción.' }, { status: 400 });
    await writeSheetRange(`MUSICA!A${rowNumber}:J${rowNumber}`, [playlistRow(body)]);
    return NextResponse.json({ ok: true, rowNumber, mode: operationalSheetMode() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible actualizar la canción.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const rowNumber = Number(new URL(request.url).searchParams.get('rowNumber'));
    if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > 300) return NextResponse.json({ ok: false, error: 'Fila musical inválida.' }, { status: 400 });
    await deleteSheetRow('MUSICA', rowNumber);
    return NextResponse.json({ ok: true, mode: operationalSheetMode() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible eliminar la canción.' }, { status: 500 });
  }
}
