import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type ChatMessage = { role: 'user' | 'assistant'; text: string };
type CopilotAction = {
  id: string;
  type: 'music.create' | 'timeline.create';
  label: string;
  description: string;
  payload: Record<string, any>;
  requiresConfirmation: true;
};

async function fetchJsonSafe(origin: string, path: string, cookie: string) {
  try {
    const response = await fetch(`${origin}${path}`, { headers: { cookie }, cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) return { ok: false as const, error: payload?.message || payload?.error || `${path}: ${response.status}` };
    return { ok: true as const, data: payload };
  } catch (error: any) {
    return { ok: false as const, error: error?.message || `No fue posible consultar ${path}` };
  }
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseAction(question: string): CopilotAction | null {
  const text = question.trim();
  const normalized = normalize(text);
  const mutationVerb = /(agrega|agregar|anota|anotar|añade|añadir|incorpora|incorporar|pon|poner|registra|registrar)/;
  if (!mutationVerb.test(normalized)) return null;

  // Explicit song form: “agrega Dancing Queen de ABBA para la fiesta”.
  const songMatch = text.match(/(?:agrega(?:r)?|anota(?:r)?|añade|añadir|incorpora(?:r)?|pon(?:er)?|registra(?:r)?)\s+(?:la\s+)?(?:canci[oó]n\s+)?[“\"]?(.+?)[”\"]?\s+de\s+(.+?)(?:\s+para\s+(?:el\s+|la\s+)?(.+?))?[.!?]?$/i);
  if (songMatch && /(cancion|musica|dj|fiesta|baile|playlist|tema)/.test(normalized)) {
    const song = songMatch[1].trim();
    const artist = songMatch[2].trim();
    const destination = (songMatch[3] || 'Fiesta / DJ').trim();
    return {
      id: `music-${Date.now()}`,
      type: 'music.create',
      label: `Agregar “${song}”`,
      description: `${artist} · ${destination}`,
      payload: { block: destination, song, artist, provider: 'DJ', status: 'Pendiente', priority: 'Normal', notes: 'Agregada desde Copiloto; revisar momento, versión y cue.' },
      requiresConfirmation: true,
    };
  }

  // Explicit timeline form: “agrega bloque prueba de sonido para 2026-10-23 15:00”.
  const timelineMatch = text.match(/(?:agrega(?:r)?|anota(?:r)?|añade|añadir|incorpora(?:r)?|registra(?:r)?)\s+(?:un\s+)?(?:bloque|hito|tarea\s+del\s+cronograma)\s+(.+?)(?:\s+para\s+(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}))?[.!?]?$/i);
  if (timelineMatch) {
    const block = timelineMatch[1].trim();
    const dateTime = timelineMatch[2]?.replace(' ', 'T') || '';
    return {
      id: `timeline-${Date.now()}`,
      type: 'timeline.create',
      label: `Agregar bloque “${block}”`,
      description: dateTime ? `Programado ${dateTime}` : 'Fecha/hora por completar',
      payload: { block, dateTime, status: 'Pendiente', category: 'General', notes: 'Creado desde Copiloto; revisar responsable, ubicación y dependencias.' },
      requiresConfirmation: true,
    };
  }

  return null;
}

function groundedFallback(question: string, snapshot: any, unavailable: string[]) {
  const q = normalize(question);
  const confirmed = snapshot.confirmed?.summary || {};
  const seating = snapshot.seating || {};
  const budget = snapshot.budget?.summary || {};
  const timeline = snapshot.timeline?.summary || {};
  const music = snapshot.music?.summary || {};
  const docs = snapshot.documents?.summary || {};
  const issues = snapshot.issues || [];

  let answer = '';
  if (/(confirmad|asisten|invitad)/.test(q) && /(cuant|total|numero|número)/.test(q)) {
    answer = `Hecho: hoy hay ${confirmed.currentKnownAttending ?? '—'} asistentes conocidos. ${confirmed.attending ?? 0} están consolidados en CONFIRMADOS_ACTUALES y ${confirmed.incomingAttending ?? 0} corresponden al delta vivo detectado en Supabase. ${confirmed.currentKnownWithoutMaster ?? 0} todavía están pendientes de ficha maestra.`;
  } else if (/(mesa|seating|sentar|salon|salón)/.test(q)) {
    answer = `Hecho: hay ${seating.tables?.length ?? 0} mesas, capacidad total ${seating.capacity ?? 0}, ${seating.assigned ?? 0} personas asignadas y ${seating.unassigned ?? 0} fichas operativas asistentes sin mesa. Recomendación: resolver primero fichas pendientes y después revisar la propuesta de IA de mesas antes de aplicar cambios.`;
  } else if (/(presupuesto|pagar|pagado|saldo|costo)/.test(q)) {
    answer = `Hecho: el presupuesto canónico registra ${formatMoney(budget.totalBudget)} proyectados, ${formatMoney(budget.paidOrPrepaid)} pagados/prepagados y ${formatMoney(budget.remaining)} pendientes.`;
  } else if (/(cronograma|timeline|horario|hito)/.test(q)) {
    answer = `Hecho: el cronograma contiene ${timeline.total ?? 0} bloques; ${timeline.confirmed ?? 0} confirmados y ${timeline.pending ?? 0} pendientes. Recomendación: cerrar primero responsables, horarios y dependencias de los bloques pendientes.`;
  } else if (/(musica|música|cancion|canción|dj|playlist)/.test(q)) {
    answer = `Hecho: Música registra ${music.moments ?? 0} momentos, ${music.confirmedMoments ?? 0} confirmados y ${music.pendingMoments ?? 0} pendientes. Sí: puedes ir dictándome canciones para el DJ; cuando indiques título y artista prepararé una acción para que la confirmes antes de incorporarla.`;
  } else if (/(document|archivo|contrato)/.test(q)) {
    answer = `Hecho: el registro documental contiene ${docs.total ?? docs.items ?? 0} elementos según las fuentes disponibles. Puedo ayudarte a localizar pendientes, pero no afirmaré que un archivo existe si no está registrado.`;
  } else if (/(atencion|atención|pendiente|falta|prioridad)/.test(q)) {
    const high = issues.filter((issue: any) => ['critical', 'high', 'alta', 'critica', 'crítica'].includes(normalize(String(issue.severity || ''))));
    answer = `Hecho: existen ${issues.length} incidencias abiertas${high.length ? `, de las cuales ${high.length} son de prioridad alta/crítica` : ''}. También conviene revisar ${confirmed.currentKnownWithoutMaster ?? 0} asistentes pendientes de ficha y ${timeline.pending ?? 0} bloques pendientes del cronograma.`;
  } else if (/(puedes|podemos|sirve|funciona|agregar|editar|organizar)/.test(q)) {
    answer = 'Sí. El Copiloto puede consultar el estado real del evento y preparar acciones para Música y Cronograma. Las acciones nunca se ejecutan silenciosamente: primero verás exactamente qué se propone y deberás confirmarlo en la interfaz.';
  } else {
    answer = 'Puedo responder sobre confirmados, invitados, mesas, salón, presupuesto, proveedores, cronograma, música, documentos e incidencias usando las fuentes conectadas. Pregúntame por un dato o dime una acción concreta que quieras preparar.';
  }

  if (unavailable.length) answer += ` Nota de fuentes: ${unavailable.length} fuente(s) no respondieron en esta consulta; la respuesta usa únicamente lo que sí estaba disponible.`;
  return answer;
}

function formatMoney(value: unknown) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
}

async function askGateway(token: string, model: string, messages: Array<{ role: string; content: string }>) {
  const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, reasoning: { effort: 'low' }, temperature: 0.2 }),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`AI_GATEWAY_${response.status}: ${payload?.error?.message || 'request failed'}`);
  const answer = String(payload?.choices?.[0]?.message?.content || '').trim();
  if (!answer) throw new Error('AI_GATEWAY_EMPTY_RESPONSE');
  return { answer, model: payload?.model || model };
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
    const [confirmedResult, budgetResult, timelineResult, musicResult, documentsResult, tablesResult, guestsResult, seatingResult, issuesResult, vendorsResult, expensesResult, paymentsResult] = await Promise.all([
      fetchJsonSafe(origin, '/api/confirmed-source', cookie),
      fetchJsonSafe(origin, '/api/budget-source', cookie),
      fetchJsonSafe(origin, '/api/timeline-source', cookie),
      fetchJsonSafe(origin, '/api/music-source', cookie),
      fetchJsonSafe(origin, '/api/documents-source', cookie),
      supabase.from('wedding_tables').select('id, table_number, name, capacity, table_type, zone, position_x, position_y, rotation, locked').order('table_number'),
      supabase.from('wedding_guests').select('id, first_name, last_name, group_name, family_side, attendance_status, dietary_type, dietary_detail, table_id, guest_status').eq('guest_status', 'active').order('first_name'),
      supabase.from('seating_assignments').select('guest_id, table_id, seat_number'),
      supabase.from('management_issues').select('id, issue_type, severity, title, description, status').eq('status', 'open'),
      supabase.from('vendors').select('id, name, category, status, contact_name'),
      supabase.from('expenses').select('id, vendor_id, concept, category, currency, total_amount, payment_status, due_date, responsible'),
      supabase.from('expense_payments').select('id, expense_id, amount, currency, payment_date, payment_type, status'),
    ]);

    const unavailable: string[] = [];
    const read = (result: any, name: string, fallback: any) => {
      if (result?.ok) return result.data;
      unavailable.push(name);
      return fallback;
    };
    const confirmed = read(confirmedResult, 'Confirmados/GRUPOS_MESA', { summary: {}, people: [], incomingAttending: [], incomingDeclined: [], groups: [], dataQuality: [] });
    const budget = read(budgetResult, 'Presupuesto', { summary: {}, items: [] });
    const timeline = read(timelineResult, 'Cronograma', { summary: {}, items: [] });
    const music = read(musicResult, 'Música', { summary: {}, moments: [], budgetItems: [] });
    const documents = read(documentsResult, 'Documentos', { summary: {}, items: [] });

    const dbPairs = [
      ['Mesas', tablesResult], ['Invitados', guestsResult], ['Asignaciones', seatingResult], ['Incidencias', issuesResult], ['Proveedores', vendorsResult], ['Gastos', expensesResult], ['Pagos', paymentsResult],
    ] as const;
    dbPairs.forEach(([name, result]) => { if (result.error) unavailable.push(name); });

    const tables = tablesResult.data || [];
    const guests = guestsResult.data || [];
    const seating = seatingResult.data || [];
    const tableById = new Map(tables.map((table: any) => [table.id, table]));
    const seatingByGuest = new Map(seating.map((item: any) => [item.guest_id, item.table_id]));
    const operationalGuests = guests.filter((guest: any) => guest.attendance_status === 'attending');
    const seatingState = operationalGuests.map((guest: any) => {
      const tableId = seatingByGuest.get(guest.id) || guest.table_id || null;
      const table: any = tableId ? tableById.get(tableId) : null;
      return { name: `${guest.first_name} ${guest.last_name || ''}`.trim(), group: guest.group_name, familySide: guest.family_side, dietaryType: guest.dietary_type || 'Ninguna', dietaryDetail: guest.dietary_detail || '', table: table ? { number: table.table_number, name: table.name } : null };
    });

    const snapshot = {
      generatedAt: new Date().toISOString(), page: currentPath,
      confirmed: { summary: confirmed.summary || {}, people: [...(confirmed.people || []), ...(confirmed.incomingAttending || []), ...(confirmed.incomingDeclined || [])].map((person: any) => ({ name: person.name, attendance: person.attendance || (person.source === 'supabase_pending_sheet' ? 'Asiste' : undefined), recordStatus: person.recordStatus || (person.guestId ? 'Ficha asociada' : 'Sin ficha maestra'), dietaryType: person.dietaryType || '', confirmedAt: person.confirmedAt || person.updatedAt || null, source: person.source, masterGroup: person.masterGroup || '', masterCategory: person.masterCategory || '' })), groups: confirmed.groups || [], dataQuality: confirmed.dataQuality || [] },
      seating: { tables, assignments: seatingState, operationalGuests: operationalGuests.length, assigned: seatingState.filter((item: any) => item.table).length, unassigned: seatingState.filter((item: any) => !item.table).length, capacity: tables.reduce((sum: number, table: any) => sum + Number(table.capacity || 0), 0) },
      budget: { summary: budget.summary || {}, items: budget.items || [] },
      timeline: { summary: timeline.summary || {}, items: timeline.items || [] },
      music: { summary: music.summary || {}, moments: music.moments || [], budgetItems: music.budgetItems || [] },
      documents: { summary: documents.summary || {}, items: documents.items || [] },
      issues: issuesResult.data || [], vendors: vendorsResult.data || [], expenses: expensesResult.data || [], payments: paymentsResult.data || [], unavailableSources: unavailable,
    };

    const proposedAction = parseAction(question);
    const capabilityQuestion = /(puedes|podemos|seria posible|sirve para|funciona para)/.test(normalize(question)) && /(agregar|anotar|organizar|editar|cancion|canción|musica|música|cronograma)/.test(normalize(question));

    const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || '';
    const preferredModel = process.env.AI_GATEWAY_MODEL || 'openai/gpt-5.6-sol';
    const system = `Eres el Copiloto Operacional de la boda de Felipe y Camila. Tu función es ayudar a gestionar el evento con precisión usando exclusivamente el SNAPSHOT actual.

REGLAS OBLIGATORIAS:
1. Responde SÓLO con hechos respaldados por SNAPSHOT. No rellenes huecos con memoria ni conocimiento general.
2. Si un dato no está disponible, dilo de forma explícita.
3. Distingue Hecho, Inferencia y Recomendación cuando corresponda.
4. No afirmes haber ejecutado cambios. Las mutaciones se preparan como propuestas y requieren confirmación separada en la interfaz.
5. Si dataQuality o unavailableSources afectan la respuesta, menciónalo brevemente.
6. Nunca inventes parentescos: GRUPOS_MESA confirmados son hechos; “Por validar” son sugerencias; masterGroup/familySide son clasificación operativa, no parentesco exacto.
7. En mesas respeta capacidad y grupos confirmados.
8. Para confirmados usa currentKnownAttending como cifra operacional actual.
9. No inventes canciones, costos, responsables, horarios ni documentos.
10. Responde en español de Chile, concreto, natural y orientado a decisiones.
11. Si el usuario pregunta si puede ir dictando canciones, confirma que sí: el Copiloto puede preparar cada canción para Música y la interfaz pedirá confirmación antes de incorporarla.

SNAPSHOT ACTUAL:\n${JSON.stringify(snapshot)}`;
    const messages = [{ role: 'system', content: system }, ...history.map((message) => ({ role: message.role, content: message.text })), { role: 'user', content: question }];

    let answer = '';
    let model = 'grounded-fallback';
    let mode: 'ai' | 'grounded-fallback' = 'grounded-fallback';
    let gatewayError: string | null = null;

    if (gatewayToken) {
      const candidates = Array.from(new Set([preferredModel, 'openai/gpt-5.6-sol', 'anthropic/claude-sonnet-5', 'google/gemini-3.1-pro-preview']));
      for (const candidate of candidates) {
        try {
          const result = await askGateway(gatewayToken, candidate, messages);
          answer = result.answer; model = result.model; mode = 'ai'; break;
        } catch (error: any) {
          gatewayError = error?.message || 'AI Gateway no disponible';
        }
      }
    }

    if (!answer) answer = groundedFallback(question, snapshot, unavailable);
    if (capabilityQuestion && proposedAction === null && !answer.includes('confirm')) {
      answer += ' Cuando me des una canción concreta (título y artista), prepararé una tarjeta de acción para que la confirmes.';
    }

    return NextResponse.json({ ok: true, answer, model, mode, groundedAt: snapshot.generatedAt, readOnly: !proposedAction, action: proposedAction, unavailableSources: unavailable, gatewayError: mode === 'ai' ? null : gatewayError });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible responder con el Copiloto.' }, { status: 500 });
  }
}
