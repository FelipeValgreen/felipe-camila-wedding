import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type ChatMessage = { role: 'user' | 'assistant'; text: string };
type CopilotAction = {
  id: string;
  type: 'music.create' | 'timeline.create' | 'task.create';
  label: string;
  description: string;
  payload: Record<string, any>;
  requiresConfirmation: true;
};
type ReviewPerson = {
  name: string;
  attendance?: string;
  confirmedAt?: string | null;
  source?: string;
  guestId?: string | null;
};

async function fetchJsonSafe(origin: string, path: string, cookie: string) {
  try {
    const response = await fetch(`${origin}${path}`, { headers: { cookie }, cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      return { ok: false as const, error: payload?.message || payload?.error || `${path}: ${response.status}` };
    }
    return { ok: true as const, data: payload };
  } catch (error: any) {
    return { ok: false as const, error: error?.message || `No fue posible consultar ${path}` };
  }
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function parseAction(question: string): CopilotAction | null {
  const text = question.trim();
  const q = normalize(text);
  const mutationVerb = /(agrega|agregar|anota|anotar|añade|añadir|incorpora|incorporar|pon|poner|registra|registrar|crea|crear)/;
  if (!mutationVerb.test(q)) return null;

  const song = text.match(/(?:agrega(?:r)?|anota(?:r)?|añade|añadir|incorpora(?:r)?|pon(?:er)?|registra(?:r)?|crea(?:r)?)\s+(?:la\s+)?(?:canci[oó]n\s+)?[“\"]?(.+?)[”\"]?\s+de\s+(.+?)(?:\s+para\s+(?:el\s+|la\s+)?(.+?))?[.!?]?$/i);
  if (song && /(cancion|musica|dj|fiesta|baile|playlist|tema)/.test(q)) {
    const title = song[1].trim();
    const artist = song[2].trim();
    const destination = (song[3] || 'Fiesta / DJ').trim();
    return {
      id: `music-${Date.now()}`,
      type: 'music.create',
      label: `Agregar “${title}”`,
      description: `${artist} · ${destination}`,
      payload: {
        block: destination,
        song: title,
        artist,
        provider: 'DJ',
        actType: 'DJ',
        setName: destination,
        status: 'Pendiente',
        priority: 'Normal',
        notes: 'Agregada desde Copiloto; revisar versión y cue.',
      },
      requiresConfirmation: true,
    };
  }

  const timeline = text.match(/(?:agrega(?:r)?|anota(?:r)?|añade|añadir|incorpora(?:r)?|registra(?:r)?|crea(?:r)?)\s+(?:un\s+)?(?:bloque|hito|tarea\s+del\s+cronograma)\s+(.+?)(?:\s+para\s+(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}))?[.!?]?$/i);
  if (timeline) {
    const block = timeline[1].trim();
    const dateTime = timeline[2]?.replace(' ', 'T') || '';
    return {
      id: `timeline-${Date.now()}`,
      type: 'timeline.create',
      label: `Agregar bloque “${block}”`,
      description: dateTime ? `Programado ${dateTime}` : 'Fecha/hora por completar',
      payload: { block, dateTime, status: 'Pendiente', category: 'General', notes: 'Creado desde Copiloto; revisar responsable, ubicación y dependencias.' },
      requiresConfirmation: true,
    };
  }

  const task = text.match(/(?:agrega(?:r)?|anota(?:r)?|añade|añadir|incorpora(?:r)?|registra(?:r)?|crea(?:r)?)\s+(?:una\s+)?tarea\s+(.+?)(?:\s+para\s+(\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?))?[.!?]?$/i);
  if (task) {
    const title = task[1].trim();
    const dueAt = task[2]?.replace(' ', 'T') || null;
    return {
      id: `task-${Date.now()}`,
      type: 'task.create',
      label: `Crear tarea “${title}”`,
      description: dueAt ? `Fecha límite ${dueAt}` : 'Fecha límite por definir',
      payload: { title, category: 'General', owner: 'Felipe & Camila', status: 'Pendiente', priority: 'Media', dueAt, source: 'copilot' },
      requiresConfirmation: true,
    };
  }
  return null;
}

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of payload?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content?.text) return String(content.text).trim();
    }
  }
  return '';
}

async function askOpenAI(token: string, model: string, messages: Array<{ role: string; content: string }>) {
  const input = messages.map((message) => ({ role: message.role, content: [{ type: 'input_text', text: message.content }] }));
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input, store: false, reasoning: { effort: 'low' }, text: { verbosity: 'low' } }),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`OPENAI_${response.status}: ${payload?.error?.message || 'request failed'}`);
  const answer = extractResponseText(payload);
  if (!answer) throw new Error('OPENAI_EMPTY_RESPONSE');
  return { answer, model: payload?.model || model };
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

function currentPeople(confirmed: any): ReviewPerson[] {
  const combined = [...(confirmed.people || []), ...(confirmed.incomingAttending || []), ...(confirmed.incomingDeclined || [])] as any[];
  return combined
    .map((person): ReviewPerson => ({
      name: String(person.name || '').trim(),
      attendance: person.attendance || (person.source === 'supabase_pending_sheet' ? 'Asiste' : undefined),
      confirmedAt: person.confirmedAt || person.updatedAt || null,
      source: person.source || '',
      guestId: person.guestId || null,
    }))
    .filter((person) => Boolean(person.name));
}

function guestDelta(previous: any, current: ReviewPerson[]) {
  const previousPeople = ((previous?.people || []) as ReviewPerson[]).filter((person) => person?.name);
  const previousByName = new Map<string, ReviewPerson>(previousPeople.map((person) => [normalize(person.name), person]));
  const currentByName = new Map<string, ReviewPerson>(current.map((person) => [normalize(person.name), person]));
  const added = current.filter((person) => !previousByName.has(normalize(person.name)));
  const removed = previousPeople.filter((person) => !currentByName.has(normalize(person.name)));
  const changed = current.filter((person) => {
    const old = previousByName.get(normalize(person.name));
    return Boolean(old && normalize(String(old.attendance || '')) !== normalize(String(person.attendance || '')));
  });
  return { added, removed, changed };
}

function reviewAnswer(summary: any, delta: ReturnType<typeof guestDelta>, firstReview: boolean) {
  if (firstReview) {
    return `Primera revisión guardada. Estado actual: ${summary.currentKnownAttending ?? '—'} asistentes conocidos, ${summary.currentKnownWithoutMaster ?? 0} pendientes de ficha maestra y ${summary.currentKnownDietary ?? 0} con restricciones registradas. Desde ahora podré decirte qué cambió entre revisiones.`;
  }
  if (!delta.added.length && !delta.removed.length && !delta.changed.length) {
    return `Revisé la lista contra tu última revisión y no detecté cambios nominales. Estado actual: ${summary.currentKnownAttending ?? '—'} asistentes conocidos y ${summary.currentKnownWithoutMaster ?? 0} pendientes de ficha.`;
  }
  const parts: string[] = [];
  if (delta.added.length) parts.push(`Nuevos (${delta.added.length}): ${delta.added.map((person) => person.name).join(', ')}`);
  if (delta.changed.length) parts.push(`Cambios de asistencia (${delta.changed.length}): ${delta.changed.map((person) => `${person.name} → ${person.attendance || 'actualizado'}`).join(', ')}`);
  if (delta.removed.length) parts.push(`Ya no aparecen en la fuente actual (${delta.removed.length}): ${delta.removed.map((person) => person.name).join(', ')}`);
  return `Revisé la lista actualizada. ${parts.join('. ')}. Total actual: ${summary.currentKnownAttending ?? '—'} asistentes conocidos; ${summary.currentKnownWithoutMaster ?? 0} todavía pendientes de ficha.`;
}

function groundedFallback(question: string, snapshot: any, unavailable: string[]) {
  const q = normalize(question);
  const confirmed = snapshot.confirmed?.summary || {};
  const seating = snapshot.seating || {};
  const budget = snapshot.budget?.summary || {};
  const timeline = snapshot.timeline?.summary || {};
  const music = snapshot.music?.summary || {};
  const documents = snapshot.documents?.summary || {};
  const issues = snapshot.issues || [];
  const tasks = snapshot.tasks || [];
  let answer = '';
  if (/(confirmad|asisten|invitad)/.test(q) && /(cuant|total|numero|número)/.test(q)) answer = `Hecho: hay ${confirmed.currentKnownAttending ?? '—'} asistentes conocidos; ${confirmed.currentKnownWithoutMaster ?? 0} están pendientes de ficha maestra.`;
  else if (/(mesa|seating|sentar|salon|salón)/.test(q)) answer = `Hecho: hay ${seating.tables?.length ?? 0} mesas, capacidad ${seating.capacity ?? 0}, ${seating.assigned ?? 0} asignados y ${seating.unassigned ?? 0} fichas asistentes sin mesa.`;
  else if (/(presupuesto|pagar|pagado|saldo|costo)/.test(q)) answer = `Hecho: presupuesto ${formatMoney(budget.totalBudget)}, pagado/prepagado ${formatMoney(budget.paidOrPrepaid)} y pendiente ${formatMoney(budget.remaining)}.`;
  else if (/(cronograma|timeline|horario|hito)/.test(q)) answer = `Hecho: ${timeline.total ?? 0} bloques; ${timeline.confirmed ?? 0} confirmados y ${timeline.pending ?? 0} pendientes.`;
  else if (/(musica|música|cancion|canción|dj|playlist|violin|banda|grupo)/.test(q)) answer = `Hecho: Música registra ${music.moments ?? 0} ítems; ${music.confirmedMoments ?? 0} confirmados y ${music.pendingMoments ?? 0} pendientes. Puedes dictarme canciones para DJ, violinista o grupo y prepararé la incorporación para tu confirmación.`;
  else if (/(tarea|checklist|planificacion|planificación)/.test(q)) answer = `Hecho: ${tasks.filter((task: any) => task.status !== 'Completada').length} tareas manuales pendientes.`;
  else if (/(document|archivo|contrato)/.test(q)) answer = `Hecho: el registro documental contiene ${documents.total ?? documents.items ?? 0} elementos según las fuentes disponibles.`;
  else if (/(atencion|atención|pendiente|falta|prioridad)/.test(q)) answer = `Hecho: ${issues.length} incidencias abiertas; además ${confirmed.currentKnownWithoutMaster ?? 0} asistentes pendientes de ficha y ${timeline.pending ?? 0} bloques pendientes.`;
  else answer = 'Puedo revisar cambios, confirmados, invitados, mesas, salón, presupuesto, proveedores, cronograma, música, documentos, tareas e incidencias. También puedo preparar acciones que se aplican sólo después de tu confirmación.';
  if (unavailable.length) answer += ` Nota: ${unavailable.length} fuente(s) no respondieron; usé sólo las disponibles.`;
  return answer;
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
    const history = (Array.isArray(body?.history) ? body.history : []).slice(-10) as ChatMessage[];
    if (!question) return NextResponse.json({ ok: false, error: 'QUESTION_REQUIRED' }, { status: 400 });

    const cookie = request.headers.get('cookie') || '';
    const origin = new URL(request.url).origin;
    const [confirmedResult, budgetResult, timelineResult, musicResult, documentsResult, tablesResult, guestsResult, seatingResult, issuesResult, vendorsResult, expensesResult, paymentsResult, tasksResult, memoryResult] = await Promise.all([
      fetchJsonSafe(origin, '/api/confirmed-source', cookie),
      fetchJsonSafe(origin, '/api/budget-source', cookie),
      fetchJsonSafe(origin, '/api/timeline-source', cookie),
      fetchJsonSafe(origin, '/api/music-source', cookie),
      fetchJsonSafe(origin, '/api/documents-source', cookie),
      supabase.from('wedding_tables').select('id,table_number,name,capacity,table_type,zone,position_x,position_y,rotation,locked').order('table_number'),
      supabase.from('wedding_guests').select('id,first_name,last_name,group_name,family_side,family_branch,attendance_status,dietary_type,dietary_detail,table_id,guest_status').eq('guest_status', 'active').order('first_name'),
      supabase.from('seating_assignments').select('guest_id,table_id,seat_number'),
      supabase.from('management_issues').select('id,issue_type,severity,title,description,status').eq('status', 'open'),
      supabase.from('vendors').select('*').order('name'),
      supabase.from('expenses').select('*'),
      supabase.from('expense_payments').select('*'),
      supabase.from('event_tasks').select('*').order('due_at', { ascending: true, nullsFirst: false }),
      supabase.from('event_memory').select('memory_type,subject_type,subject_id,title,content,confidence,source,updated_at').eq('status', 'active').order('updated_at', { ascending: false }).limit(100),
    ]);

    const unavailable: string[] = [];
    const read = (result: any, name: string, fallback: any) => {
      if (result?.ok) return result.data;
      unavailable.push(name);
      return fallback;
    };
    const confirmed = read(confirmedResult, 'Confirmados', { summary: {}, people: [], incomingAttending: [], incomingDeclined: [], groups: [], dataQuality: [] });
    const budget = read(budgetResult, 'Presupuesto', { summary: {}, items: [] });
    const timeline = read(timelineResult, 'Cronograma', { summary: {}, items: [] });
    const music = read(musicResult, 'Música', { summary: {}, moments: [] });
    const documents = read(documentsResult, 'Documentos', { summary: {}, items: [] });
    const dbResults: Array<[string, any]> = [
      ['Mesas', tablesResult], ['Invitados', guestsResult], ['Asignaciones', seatingResult], ['Incidencias', issuesResult], ['Proveedores', vendorsResult], ['Tareas', tasksResult], ['Memoria', memoryResult],
    ];
    dbResults.forEach(([name, result]) => { if (result.error) unavailable.push(name); });

    const tables = tablesResult.data || [];
    const guests = guestsResult.data || [];
    const seating = seatingResult.data || [];
    const tableById = new Map<string, any>(tables.map((table: any) => [table.id, table]));
    const seatingByGuest = new Map<string, string>(seating.map((assignment: any) => [assignment.guest_id, assignment.table_id]));
    const operationalGuests = guests.filter((guest: any) => guest.attendance_status === 'attending');
    const seatingState = operationalGuests.map((guest: any) => {
      const tableId = seatingByGuest.get(guest.id) || guest.table_id || null;
      const table = tableId ? tableById.get(tableId) : null;
      return {
        name: `${guest.first_name} ${guest.last_name || ''}`.trim(),
        group: guest.group_name,
        familySide: guest.family_side,
        familyBranch: guest.family_branch || '',
        dietaryType: guest.dietary_type || 'Ninguna',
        table: table ? { number: table.table_number, name: table.name } : null,
      };
    });

    const people = currentPeople(confirmed);
    const snapshot = {
      generatedAt: new Date().toISOString(),
      page: currentPath,
      confirmed: { summary: confirmed.summary || {}, people, groups: confirmed.groups || [], dataQuality: confirmed.dataQuality || [] },
      seating: {
        tables,
        assignments: seatingState,
        operationalGuests: operationalGuests.length,
        assigned: seatingState.filter((item: any) => item.table).length,
        unassigned: seatingState.filter((item: any) => !item.table).length,
        capacity: tables.reduce((sum: number, table: any) => sum + Number(table.capacity || 0), 0),
      },
      budget: { summary: budget.summary || {}, items: budget.items || [] },
      timeline: { summary: timeline.summary || {}, items: timeline.items || [] },
      music: { summary: music.summary || {}, moments: music.moments || [] },
      documents: { summary: documents.summary || {}, items: documents.items || [] },
      tasks: tasksResult.data || [],
      issues: issuesResult.data || [],
      vendors: vendorsResult.data || [],
      expenses: expensesResult.data || [],
      payments: paymentsResult.data || [],
      memory: memoryResult.data || [],
      unavailableSources: unavailable,
    };

    const reviewRequested = /(revis(a|ar|e)|actualizad|que cambio|qué cambió|cambios desde|novedades).*(lista|invitad|confirmad|rsvp)|^(revisar lista actualizada)$/i.test(question);
    if (reviewRequested) {
      const { data: state } = await supabase.from('copilot_review_state').select('last_snapshot,last_reviewed_at').eq('user_id', user.id).eq('domain', 'guest_list').maybeSingle();
      const delta = guestDelta(state?.last_snapshot, people);
      const answer = reviewAnswer(confirmed.summary || {}, delta, !state);
      await supabase.from('copilot_review_state').upsert({
        user_id: user.id,
        domain: 'guest_list',
        last_reviewed_at: new Date().toISOString(),
        last_snapshot: { people, summary: confirmed.summary || {} },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,domain' });
      return NextResponse.json({ ok: true, answer, model: 'deterministic-delta', mode: 'grounded-delta', groundedAt: snapshot.generatedAt, readOnly: true, action: null, unavailableSources: unavailable });
    }

    const action = parseAction(question);
    const system = `Eres el Copiloto Operacional del matrimonio. Responde sólo usando SNAPSHOT y MEMORIA ACTIVA. Distingue Hecho / Inferencia / Recomendación. Nunca inventes parentescos, canciones, costos, horarios, documentos o proveedores. Si falta un dato, dilo. Para confirmados usa currentKnownAttending. Las relaciones probables nunca son hechos. Puedes preparar acciones, pero nunca afirmar que ejecutaste un cambio sin confirmación. Español de Chile, breve, preciso y orientado a decisiones.\nSNAPSHOT:\n${JSON.stringify(snapshot)}`;
    const messages = [
      { role: 'system', content: system },
      ...history.map((message) => ({ role: message.role, content: message.text })),
      { role: 'user', content: question },
    ];

    let answer = '';
    let model = 'grounded-fallback';
    let mode = 'grounded-fallback';
    let aiError: string | null = null;

    const openAIKey = process.env.OPENAI_API_KEY || '';
    const openAIModel = process.env.OPENAI_COPILOT_MODEL || 'gpt-5.6';
    if (openAIKey) {
      try {
        const result = await askOpenAI(openAIKey, openAIModel, messages);
        answer = result.answer;
        model = result.model;
        mode = 'openai-responses';
      } catch (error: any) {
        aiError = error?.message || 'OpenAI no disponible';
      }
    }

    if (!answer) {
      const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || '';
      if (gatewayToken) {
        const candidates = Array.from(new Set([process.env.AI_GATEWAY_MODEL || 'openai/gpt-5.6', 'openai/gpt-5.6', 'anthropic/claude-sonnet-5', 'google/gemini-3.1-pro-preview']));
        for (const candidate of candidates) {
          try {
            const result = await askGateway(gatewayToken, candidate, messages);
            answer = result.answer;
            model = result.model;
            mode = 'ai-gateway';
            break;
          } catch (error: any) {
            aiError = error?.message || 'AI Gateway no disponible';
          }
        }
      }
    }

    if (!answer) answer = groundedFallback(question, snapshot, unavailable);
    return NextResponse.json({ ok: true, answer, model, mode, groundedAt: snapshot.generatedAt, readOnly: !action, action, unavailableSources: unavailable, aiError: mode === 'grounded-fallback' ? aiError : null });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible responder con el Copiloto.' }, { status: 500 });
  }
}
