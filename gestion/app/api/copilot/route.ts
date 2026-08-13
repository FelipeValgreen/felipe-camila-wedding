import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type ChatMessage = { role: 'user' | 'assistant'; text: string };

function responseText(payload: any) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const parts: string[] = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content?.text) parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

async function fetchJson(origin: string, path: string, cookie: string) {
  const response = await fetch(`${origin}${path}`, { headers: { cookie }, cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw new Error(`${path}: ${payload?.error || response.status}`);
  return payload;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    const { data: profile } = await supabase.from('admin_profiles').select('role, active').eq('id', user.id).single();
    if (!profile?.active) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const body = await request.json();
    const question = String(body?.question || '').trim();
    const currentPath = String(body?.currentPath || '/dashboard');
    const history = (Array.isArray(body?.history) ? body.history : []).slice(-8) as ChatMessage[];
    if (!question) return NextResponse.json({ ok: false, error: 'QUESTION_REQUIRED' }, { status: 400 });

    const cookie = request.headers.get('cookie') || '';
    const origin = new URL(request.url).origin;
    const [confirmed, budget, timeline, music, documents, tablesResult, guestsResult, seatingResult, issuesResult, vendorsResult, expensesResult, paymentsResult] = await Promise.all([
      fetchJson(origin, '/api/confirmed-source', cookie),
      fetchJson(origin, '/api/budget-source', cookie),
      fetchJson(origin, '/api/timeline-source', cookie),
      fetchJson(origin, '/api/music-source', cookie),
      fetchJson(origin, '/api/documents-source', cookie),
      supabase.from('wedding_tables').select('id, table_number, name, capacity, table_type, zone, position_x, position_y, rotation, locked').order('table_number'),
      supabase.from('wedding_guests').select('id, first_name, last_name, group_name, family_side, attendance_status, dietary_type, dietary_detail, table_id, guest_status').eq('guest_status', 'active').order('first_name'),
      supabase.from('seating_assignments').select('guest_id, table_id, seat_number'),
      supabase.from('management_issues').select('id, issue_type, severity, title, description, status').eq('status', 'open'),
      supabase.from('vendors').select('id, name, category, status, contact_name'),
      supabase.from('expenses').select('id, vendor_id, concept, category, currency, total_amount, payment_status, due_date, responsible'),
      supabase.from('expense_payments').select('id, expense_id, amount, currency, payment_date, payment_type, status'),
    ]);

    const dbErrors = [tablesResult.error, guestsResult.error, seatingResult.error, issuesResult.error, vendorsResult.error, expensesResult.error, paymentsResult.error].filter(Boolean);
    if (dbErrors.length) throw new Error(dbErrors.map((item) => item?.message).join(' · '));

    const tables = tablesResult.data || [];
    const guests = guestsResult.data || [];
    const seating = seatingResult.data || [];
    const tableById = new Map(tables.map((table: any) => [table.id, table]));
    const seatingByGuest = new Map(seating.map((item: any) => [item.guest_id, item.table_id]));
    const operationalGuests = guests.filter((guest: any) => guest.attendance_status === 'attending');
    const seatingState = operationalGuests.map((guest: any) => {
      const tableId = seatingByGuest.get(guest.id) || guest.table_id || null;
      const table: any = tableId ? tableById.get(tableId) : null;
      return {
        name: `${guest.first_name} ${guest.last_name || ''}`.trim(),
        group: guest.group_name,
        familySide: guest.family_side,
        dietaryType: guest.dietary_type || 'Ninguna',
        dietaryDetail: guest.dietary_detail || '',
        table: table ? { number: table.table_number, name: table.name } : null,
      };
    });

    const snapshot = {
      generatedAt: new Date().toISOString(),
      page: currentPath,
      confirmed: {
        summary: confirmed.summary,
        people: [...(confirmed.people || []), ...(confirmed.incomingAttending || []), ...(confirmed.incomingDeclined || [])].map((person: any) => ({
          name: person.name,
          attendance: person.attendance || (person.source === 'supabase_pending_sheet' ? 'Asiste' : undefined),
          recordStatus: person.recordStatus || (person.guestId ? 'Ficha asociada' : 'Sin ficha maestra'),
          dietaryType: person.dietaryType || '',
          confirmedAt: person.confirmedAt || person.updatedAt || null,
          source: person.source,
        })),
        groups: confirmed.groups,
        dataQuality: confirmed.dataQuality || [],
      },
      seating: {
        tables,
        assignments: seatingState,
        operationalGuests: operationalGuests.length,
        assigned: seatingState.filter((item: any) => item.table).length,
        unassigned: seatingState.filter((item: any) => !item.table).length,
        capacity: tables.reduce((sum: number, table: any) => sum + Number(table.capacity || 0), 0),
      },
      budget: { summary: budget.summary, items: budget.items },
      timeline: { summary: timeline.summary, items: timeline.items },
      music: { summary: music.summary, moments: music.moments, budgetItems: music.budgetItems },
      documents: { summary: documents.summary, items: documents.items },
      issues: issuesResult.data || [],
      vendors: vendorsResult.data || [],
      expenses: expensesResult.data || [],
      payments: paymentsResult.data || [],
    };

    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        error: 'COPILOT_NOT_CONFIGURED',
        message: 'El Copiloto real está implementado, pero falta configurar OPENAI_API_KEY en Vercel.',
      }, { status: 503 });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-5.1';
    const instructions = `Eres el Copiloto Operacional de la boda de Felipe y Camila. Tu función es ayudar a gestionar el evento con precisión.

REGLAS OBLIGATORIAS:
1. Responde SÓLO con hechos respaldados por SNAPSHOT. Nunca completes huecos con conocimiento general o memoria.
2. Si un dato no está en SNAPSHOT, dilo explícitamente: “No está registrado en las fuentes conectadas”.
3. Distingue claramente Hecho, Inferencia y Recomendación cuando corresponda.
4. Nunca afirmes haber modificado datos, enviado mensajes, movido invitados, registrado pagos o ejecutado acciones. Este endpoint es de SOLO LECTURA.
5. Para cambios, explica exactamente qué propones cambiar y termina con “Requiere confirmación en la interfaz”.
6. Si existen dataQuality issues, adviértelos cuando afecten la respuesta.
7. No expongas IDs internos, teléfonos ni datos sensibles salvo que el usuario lo pida y sea necesario para la gestión.
8. Para mesas, respeta capacidad y relaciones de GRUPOS_MESA; las relaciones confirmadas son restricciones fuertes y “Por validar” son sugerencias.
9. Cuando te pregunten por confirmados, usa currentKnownAttending como cifra operacional actual y explica consolidado/delta si es relevante.
10. Sé conciso, accionable y en español de Chile. No inventes canciones, costos, responsables, horarios ni parentescos.

SNAPSHOT ACTUAL:\n${JSON.stringify(snapshot)}`;

    const input = [
      ...history.map((message) => ({ role: message.role, content: [{ type: 'input_text', text: message.text }] })),
      { role: 'user', content: [{ type: 'input_text', text: question }] },
    ];

    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, instructions, input, store: false, reasoning: { effort: 'low' }, text: { verbosity: 'medium' } }),
      cache: 'no-store',
    });
    const aiPayload = await aiResponse.json().catch(() => null);
    if (!aiResponse.ok) throw new Error(`OPENAI_${aiResponse.status}: ${aiPayload?.error?.message || 'request failed'}`);
    const answer = responseText(aiPayload);
    if (!answer) throw new Error('OPENAI_EMPTY_RESPONSE');

    return NextResponse.json({ ok: true, answer, model, groundedAt: snapshot.generatedAt, readOnly: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible responder con el Copiloto.' }, { status: 500 });
  }
}
