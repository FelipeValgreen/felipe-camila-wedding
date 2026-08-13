import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { deleteSheetRow, insertSheetRow, operationalSheetMode, readSheetRange, writeSheetRange } from '@/lib/google-sheets-server';

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

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replace(',', '.').replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function budgetRow(body: any) {
  const projectedQuantity = numeric(body.projectedQuantity);
  const unitNet = numeric(body.unitNet);
  const vat = numeric(body.vat);
  const explicitGross = numeric(body.projectedGross);
  const calculatedGross = projectedQuantity !== null && unitNet !== null
    ? Math.round(projectedQuantity * unitNet * (1 + (vat || 0)))
    : null;
  const projectedGross = explicitGross ?? calculatedGross ?? '';
  return [
    String(body.item || '').trim(),
    body.projectedQuantity ?? '',
    body.confirmedQuantity ?? '',
    unitNet ?? '',
    body.vat ?? '',
    projectedGross,
    String(body.category || '').trim(),
    String(body.responsible || '').trim(),
    String(body.status || 'Pendiente').trim(),
    String(body.notes || '').trim(),
    numeric(body.advance) ?? '',
  ];
}

async function readBudget() {
  const rows = await readSheetRange('PRESUPUESTO_IGLESIA!A1:K120');
  const paidRowNumber = rows.findIndex((row) => String(row?.[0] || '').trim().toLowerCase() === 'pagados o prepagados') + 1;
  const remainingRowNumber = rows.findIndex((row) => String(row?.[0] || '').trim().toLowerCase() === 'faltante x pagar') + 1;
  const totalRowNumber = rows.findIndex((row) => String(row?.[0] || '').trim().toLowerCase() === 'total presupuesto iglesia') + 1;
  const itemEnd = paidRowNumber > 1 ? paidRowNumber - 1 : 200;
  const items = rows.slice(1, itemEnd).map((row, index) => ({
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
  })).filter((item) => item.item);

  const valueAt = (rowNumber: number) => rowNumber > 0 ? clp(rows[rowNumber - 1]?.[5]) : null;
  return {
    rows,
    items,
    paidRowNumber,
    remainingRowNumber,
    totalRowNumber,
    summary: {
      paidOrPrepaid: valueAt(paidRowNumber),
      remaining: valueAt(remainingRowNumber),
      totalBudget: valueAt(totalRowNumber),
    },
  };
}

async function refreshBudgetTotals() {
  const budget = await readBudget();
  const total = budget.items.reduce((sum, item) => sum + Number(item.projectedGross || 0), 0);
  if (budget.totalRowNumber > 0) await writeSheetRange(`PRESUPUESTO_IGLESIA!F${budget.totalRowNumber}`, [[total]]);
  if (budget.remainingRowNumber > 0 && budget.summary.paidOrPrepaid !== null) {
    await writeSheetRange(`PRESUPUESTO_IGLESIA!F${budget.remainingRowNumber}`, [[Math.max(0, total - budget.summary.paidOrPrepaid)]]);
  }
}

export async function GET() {
  try {
    const auth = await authorize(false);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const budget = await readBudget();
    return NextResponse.json({
      ok: true,
      source: `F&C Centro Comandos${operationalSheetMode() === 'staging' ? ' — STAGING' : ''} · PRESUPUESTO_IGLESIA`,
      mode: operationalSheetMode(),
      items: budget.items,
      summary: budget.summary,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible leer el presupuesto operativo.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const body = await request.json();
    if (!String(body.item || '').trim()) return NextResponse.json({ ok: false, error: 'El nombre del ítem es obligatorio.' }, { status: 400 });
    const budget = await readBudget();
    if (budget.paidRowNumber < 2) throw new Error('BUDGET_SUMMARY_ROW_NOT_FOUND');
    await insertSheetRow('PRESUPUESTO_IGLESIA', budget.paidRowNumber, budgetRow(body));
    await refreshBudgetTotals();
    return NextResponse.json({ ok: true, mode: operationalSheetMode() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible crear el ítem.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const body = await request.json();
    const rowNumber = Number(body.rowNumber);
    if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > 200) return NextResponse.json({ ok: false, error: 'Fila de presupuesto inválida.' }, { status: 400 });
    if (!String(body.item || '').trim()) return NextResponse.json({ ok: false, error: 'El nombre del ítem es obligatorio.' }, { status: 400 });
    const budget = await readBudget();
    if (budget.paidRowNumber > 0 && rowNumber >= budget.paidRowNumber) return NextResponse.json({ ok: false, error: 'No se pueden editar filas de resumen como ítems.' }, { status: 409 });
    await writeSheetRange(`PRESUPUESTO_IGLESIA!A${rowNumber}:K${rowNumber}`, [budgetRow(body)]);
    await refreshBudgetTotals();
    return NextResponse.json({ ok: true, rowNumber, mode: operationalSheetMode() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible actualizar el ítem.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorize(true);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    const rowNumber = Number(new URL(request.url).searchParams.get('rowNumber'));
    if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > 200) return NextResponse.json({ ok: false, error: 'Fila de presupuesto inválida.' }, { status: 400 });
    const budget = await readBudget();
    if (budget.paidRowNumber > 0 && rowNumber >= budget.paidRowNumber) return NextResponse.json({ ok: false, error: 'No se pueden eliminar filas de resumen.' }, { status: 409 });
    await deleteSheetRow('PRESUPUESTO_IGLESIA', rowNumber);
    await refreshBudgetTotals();
    return NextResponse.json({ ok: true, mode: operationalSheetMode() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible eliminar el ítem.' }, { status: 500 });
  }
}
