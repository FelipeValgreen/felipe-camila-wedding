import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDatabaseWriteBlock } from '@/lib/environment-guard';

export const dynamic = 'force-dynamic';

type ChatMessage = { role: 'user' | 'assistant'; text: string };
type ActionType = 'guest.create' | 'music.create' | 'timeline.create' | 'task.create' | 'memory.create' | 'table.rename';
type CopilotAction = { id: string; type: ActionType; label: string; description: string; payload: Record<string, any>; requiresConfirmation: true };
type ReviewPerson = { name: string; attendance?: string; confirmedAt?: string | null; source?: string; guestId?: string | null };
type AiResult = { answer: string; model: string; action?: CopilotAction | null };

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
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function formatMoney(value: unknown) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
}
function action(id: string, type: ActionType, label: string, description: string, payload: Record<string, any>): CopilotAction {
  return { id: `${id}-${Date.now()}`, type, label, description, payload, requiresConfirmation: true };
}
function splitName(fullName: string) {
  const clean = fullName.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  const parts = clean.split(' ').filter(Boolean);
  const first_name = parts.shift() || clean;
  return { first_name, last_name: parts.join(' ') };
}
function looksLikePersonName(value: string) {
  const clean = value.trim().replace(/[.!?]+$/, '');
  const words = clean.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 7 && words.every((word) => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'-]+$/.test(word));
}
function attendanceFromText(q: string) {
  if (/(no asiste|no va|rechaz|declin)/.test(q)) return 'not_attending';
  if (/(asiste|confirmad|va a ir|si va|sí va)/.test(q)) return 'attending';
  return 'pending';
}

function parseAction(question: string, history: ChatMessage[]): CopilotAction | null {
  const text = question.trim();
  const q = normalize(text);

  const renameA = text.match(/(?:renombra|nombra|llama)\s+(?:la\s+)?mesa\s+(\d+)\s+(?:a|como)?\s*[“\"]?(.+?)[”\"]?[.!?]?$/i);
  if (renameA) return action('table', 'table.rename', `Renombrar Mesa ${renameA[1]}`, `Nuevo nombre: ${renameA[2].trim()}`, { tableNumber: Number(renameA[1]), name: renameA[2].trim() });
  const renameB = text.match(/ponle\s+[“\"]?(.+?)[”\"]?\s+a\s+(?:la\s+)?mesa\s+(\d+)[.!?]?$/i);
  if (renameB) return action('table', 'table.rename', `Renombrar Mesa ${renameB[2]}`, `Nuevo nombre: ${renameB[1].trim()}`, { tableNumber: Number(renameB[2]), name: renameB[1].trim() });

  const memory = text.match(/(?:recuerda(?:r)?|guarda(?:r)?\s+(?:esto\s+)?(?:en\s+memoria)?|anota(?:r)?\s+como\s+(preferencia|decisi[oó]n|hecho|restricci[oó]n|aprendizaje))\s*(?:que\s+)?[:,-]?\s*(.+)$/i);
  if (memory) {
    const requested = normalize(memory[1] || '');
    const memoryType = requested.includes('decision') ? 'decision' : requested.includes('hecho') ? 'fact' : requested.includes('restriccion') ? 'constraint' : requested.includes('aprendizaje') ? 'learning' : 'preference';
    const content = memory[2].trim();
    return action('memory', 'memory.create', 'Guardar en Memoria IA', content, { memoryType, subjectType: 'event', title: content.slice(0, 90), content: { text: content }, confidence: 'confirmed', source: 'Copiloto' });
  }

  const guestPatterns = [
    /(?:agrega|agregar|añade|añadir|crea|crear|incorpora|incorporar|registra|registrar)\s+(?:a\s+)?(.+?)\s+como\s+(?:nuevo\s+)?invitad[oa](?:\s+(?:y\s+)?(?:que\s+)?(.+))?$/i,
    /(?:agrega|agregar|añade|añadir|crea|crear|incorpora|incorporar|registra|registrar)\s+(?:un\s+)?invitad[oa]\s+(?:llamad[oa]\s+)?(.+?)(?:\s+(?:y\s+)?(?:que\s+)?(asiste|no asiste|pendiente))?[.!?]?$/i,
  ];
  for (const pattern of guestPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && !/^(un|una)$/i.test(match[1].trim())) {
      const person = splitName(match[1]);
      const attendance = attendanceFromText(normalize(`${match[2] || ''} ${text}`));
      return action('guest', 'guest.create', `Agregar a ${person.first_name}${person.last_name ? ` ${person.last_name}` : ''}`, attendance === 'attending' ? 'Se creará como asistente confirmado.' : attendance === 'not_attending' ? 'Se registrará como no asistente.' : 'Se creará con asistencia pendiente para revisión.', { ...person, group_name: 'Por clasificar', family_side: 'Por clasificar', guest_category: 'Adulto', attendance_status: attendance, dietary_type: 'Ninguna', notes: 'Ficha creada desde Copiloto; revisar grupo, teléfono y vínculo RSVP si corresponde.' });
    }
  }
  const recentGuestIntent = [...history].reverse().find((message) => message.role === 'user' && /(agrega|agregar|añade|crear|crea|nuevo).{0,18}invitad/.test(normalize(message.text)));
  if (recentGuestIntent && looksLikePersonName(text)) {
    const person = splitName(text);
    return action('guest', 'guest.create', `Agregar a ${text.trim()}`, 'Se creará con asistencia pendiente para que puedas completar su ficha.', { ...person, group_name: 'Por clasificar', family_side: 'Por clasificar', guest_category: 'Adulto', attendance_status: 'pending', dietary_type: 'Ninguna', notes: 'Ficha creada desde Copiloto; completar grupo, teléfono y estado de asistencia.' });
  }

  const mutationVerb = /(agrega|agregar|anota|anotar|añade|añadir|incorpora|incorporar|pon|poner|registra|registrar|crea|crear)/;
  if (!mutationVerb.test(q)) return null;
  const song = text.match(/(?:agrega(?:r)?|anota(?:r)?|añade|añadir|incorpora(?:r)?|pon(?:er)?|registra(?:r)?|crea(?:r)?)\s+(?:la\s+)?(?:canci[oó]n\s+)?[“\"]?(.+?)[”\"]?\s+de\s+(.+?)(?:\s+para\s+(?:el\s+|la\s+)?(.+?))?[.!?]?$/i);
  if (song && /(cancion|musica|dj|fiesta|baile|playlist|tema|violin|banda|grupo)/.test(q)) {
    const title = song[1].trim(); const artist = song[2].trim(); const destination = (song[3] || 'Fiesta / DJ').trim();
    const actType = destination.toLowerCase().includes('violin') ? 'Violinista / músicos' : destination.toLowerCase().includes('banda') || destination.toLowerCase().includes('grupo') ? 'Banda / grupo' : 'DJ';
    return action('music', 'music.create', `Agregar “${title}”`, `${artist} · ${destination}`, { block: destination, song: title, artist, provider: actType, actType, setName: destination, status: 'Pendiente', priority: 'Normal', notes: 'Agregada desde Copiloto; revisar versión y cue.' });
  }
  const timeline = text.match(/(?:agrega(?:r)?|anota(?:r)?|añade|añadir|incorpora(?:r)?|registra(?:r)?|crea(?:r)?)\s+(?:un\s+)?(?:bloque|hito|tarea\s+del\s+cronograma)\s+(.+?)(?:\s+para\s+(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}))?[.!?]?$/i);
  if (timeline) {
    const block = timeline[1].trim(); const dateTime = timeline[2]?.replace(' ', 'T') || '';
    return action('timeline', 'timeline.create', `Agregar bloque “${block}”`, dateTime ? `Programado ${dateTime}` : 'Fecha/hora por completar', { block, dateTime, status: 'Pendiente', category: 'General', notes: 'Creado desde Copiloto; revisar responsable, proveedor, ubicación y dependencias.' });
  }
  const task = text.match(/(?:agrega(?:r)?|anota(?:r)?|añade|añadir|incorpora(?:r)?|registra(?:r)?|crea(?:r)?)\s+(?:una\s+)?tarea\s+(.+?)(?:\s+para\s+(\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?))?[.!?]?$/i);
  if (task) {
    const title = task[1].trim(); const dueAt = task[2]?.replace(' ', 'T') || null;
    return action('task', 'task.create', `Crear tarea “${title}”`, dueAt ? `Fecha límite ${dueAt}` : 'Fecha límite por definir', { title, category: 'General', owner: 'Felipe & Camila', status: 'Pendiente', priority: 'Media', dueAt, source: 'copilot' });
  }
  return null;
}

const OPENAI_TOOLS = [
  { type: 'function', name: 'propose_guest', description: 'Propone crear una ficha de invitado. Nunca la crea directamente; requiere confirmación.', strict: true, parameters: { type: 'object', additionalProperties: false, properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, attendanceStatus: { type: 'string', enum: ['attending','pending','not_attending'] }, groupName: { type: 'string' } }, required: ['firstName','lastName','attendanceStatus','groupName'] } },
  { type: 'function', name: 'propose_table_rename', description: 'Propone renombrar una mesa. No ejecuta el cambio; requiere confirmación.', strict: true, parameters: { type: 'object', additionalProperties: false, properties: { tableNumber: { type: 'integer', minimum: 1 }, name: { type: 'string', minLength: 1 } }, required: ['tableNumber', 'name'] } },
  { type: 'function', name: 'propose_memory', description: 'Propone guardar un hecho, decisión, preferencia, restricción o aprendizaje en la memoria durable.', strict: true, parameters: { type: 'object', additionalProperties: false, properties: { memoryType: { type: 'string', enum: ['fact','decision','preference','relationship','constraint','rejected_option','learning'] }, title: { type: 'string' }, text: { type: 'string' }, confidence: { type: 'string', enum: ['confirmed','probable','inferred'] } }, required: ['memoryType','title','text','confidence'] } },
  { type: 'function', name: 'propose_music_item', description: 'Propone agregar una canción o momento musical.', strict: true, parameters: { type: 'object', additionalProperties: false, properties: { block: { type: 'string' }, song: { type: ['string','null'] }, artist: { type: ['string','null'] }, actType: { type: 'string' }, setName: { type: ['string','null'] }, provider: { type: ['string','null'] }, priority: { type: 'string', enum: ['Normal','Alta','Must play','No tocar'] }, cue: { type: ['string','null'] }, notes: { type: ['string','null'] } }, required: ['block','song','artist','actType','setName','provider','priority','cue','notes'] } },
  { type: 'function', name: 'propose_timeline_block', description: 'Propone un nuevo bloque del cronograma.', strict: true, parameters: { type: 'object', additionalProperties: false, properties: { block: { type: 'string' }, dateTime: { type: ['string','null'] }, endsAt: { type: ['string','null'] }, category: { type: 'string' }, owner: { type: ['string','null'] }, location: { type: ['string','null'] }, dependencies: { type: ['string','null'] }, notes: { type: ['string','null'] } }, required: ['block','dateTime','endsAt','category','owner','location','dependencies','notes'] } },
  { type: 'function', name: 'propose_task', description: 'Propone crear una tarea operativa.', strict: true, parameters: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, category: { type: 'string' }, owner: { type: 'string' }, priority: { type: 'string', enum: ['Baja','Media','Alta','Crítica'] }, dueAt: { type: ['string','null'] }, description: { type: ['string','null'] } }, required: ['title','category','owner','priority','dueAt','description'] } },
];

function actionFromToolCall(name: string, args: Record<string, any>): CopilotAction | null {
  if (name === 'propose_guest') return action('guest', 'guest.create', `Agregar a ${args.firstName}${args.lastName ? ` ${args.lastName}` : ''}`, `Estado inicial: ${args.attendanceStatus}`, { first_name: args.firstName, last_name: args.lastName || '', group_name: args.groupName || 'Por clasificar', family_side: 'Por clasificar', guest_category: 'Adulto', attendance_status: args.attendanceStatus || 'pending', dietary_type: 'Ninguna', notes: 'Ficha creada desde Copiloto; completar datos faltantes.' });
  if (name === 'propose_table_rename') return action('table', 'table.rename', `Renombrar Mesa ${args.tableNumber}`, `Nuevo nombre: ${args.name}`, { tableNumber: Number(args.tableNumber), name: String(args.name) });
  if (name === 'propose_memory') return action('memory', 'memory.create', 'Guardar en Memoria IA', String(args.title), { memoryType: args.memoryType, subjectType: 'event', title: args.title, content: { text: args.text }, confidence: args.confidence, source: 'Copiloto' });
  if (name === 'propose_music_item') return action('music', 'music.create', `Agregar ${args.song ? `“${args.song}”` : args.block}`, `${args.actType}${args.setName ? ` · ${args.setName}` : ''}`, { block: args.block, song: args.song || '', artist: args.artist || '', actType: args.actType, setName: args.setName || '', provider: args.provider || '', priority: args.priority, cue: args.cue || '', notes: args.notes || '', status: 'Pendiente' });
  if (name === 'propose_timeline_block') return action('timeline', 'timeline.create', `Agregar bloque “${args.block}”`, args.dateTime ? `Inicio ${args.dateTime}` : 'Fecha/hora por completar', { block: args.block, dateTime: args.dateTime || '', endsAt: args.endsAt || null, category: args.category || 'General', owner: args.owner || '', location: args.location || '', dependencies: args.dependencies || '', notes: args.notes || '', status: 'Pendiente' });
  if (name === 'propose_task') return action('task', 'task.create', `Crear tarea “${args.title}”`, args.dueAt ? `Fecha límite ${args.dueAt}` : 'Fecha límite por definir', { title: args.title, category: args.category || 'General', owner: args.owner || 'Felipe & Camila', priority: args.priority || 'Media', dueAt: args.dueAt || null, description: args.description || '', status: 'Pendiente', source: 'copilot' });
  return null;
}

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of payload?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item?.content || []) if (content?.type === 'output_text' && content?.text) return String(content.text).trim();
  }
  return '';
}

async function askOpenAI(token: string, model: string, messages: Array<{ role: string; content: string }>): Promise<AiResult> {
  const input = messages.map((message) => ({ role: message.role, content: [{ type: 'input_text', text: message.content }] }));
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, input, tools: OPENAI_TOOLS, tool_choice: 'auto', parallel_tool_calls: false, store: false, reasoning: { effort: 'low' }, text: { verbosity: 'low' } }), cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`OPENAI_${response.status}: ${payload?.error?.message || 'request failed'}`);
  const call = (payload?.output || []).find((item: any) => item?.type === 'function_call');
  let proposedAction: CopilotAction | null = null;
  if (call?.name) { try { proposedAction = actionFromToolCall(String(call.name), JSON.parse(String(call.arguments || '{}'))); } catch { proposedAction = null; } }
  const answer = extractResponseText(payload) || (proposedAction ? `Preparé una acción: ${proposedAction.label}. Revísala y confírmala si quieres aplicarla.` : 'Consulté el estado real del evento.');
  return { answer, model: payload?.model || model, action: proposedAction };
}
async function askGateway(token: string, model: string, messages: Array<{ role: string; content: string }>) {
  const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages, stream: false, reasoning: { effort: 'low' }, temperature: 0.2 }), cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`AI_GATEWAY_${response.status}: ${payload?.error?.message || 'request failed'}`);
  const answer = String(payload?.choices?.[0]?.message?.content || '').trim();
  if (!answer) throw new Error('AI_GATEWAY_EMPTY_RESPONSE');
  return { answer, model: payload?.model || model };
}

function currentPeople(confirmed: any): ReviewPerson[] {
  const combined = [...(confirmed.people || []), ...(confirmed.incomingAttending || []), ...(confirmed.incomingDeclined || [])] as any[];
  return combined.map((person): ReviewPerson => ({ name: String(person.name || '').trim(), attendance: person.attendance || (person.source === 'supabase_pending_sheet' ? 'Asiste' : undefined), confirmedAt: person.confirmedAt || person.updatedAt || null, source: person.source || '', guestId: person.guestId || null })).filter((person) => Boolean(person.name));
}
function guestDelta(previous: any, current: ReviewPerson[]) {
  const previousPeople = ((previous?.people || []) as ReviewPerson[]).filter((person) => person?.name);
  const previousByName = new Map<string, ReviewPerson>(previousPeople.map((person) => [normalize(person.name), person]));
  const currentByName = new Map<string, ReviewPerson>(current.map((person) => [normalize(person.name), person]));
  const added = current.filter((person) => !previousByName.has(normalize(person.name)));
  const removed = previousPeople.filter((person) => !currentByName.has(normalize(person.name)));
  const changed = current.filter((person) => { const old = previousByName.get(normalize(person.name)); return Boolean(old && normalize(String(old.attendance || '')) !== normalize(String(person.attendance || ''))); });
  return { added, removed, changed };
}
function reviewAnswer(summary: any, delta: ReturnType<typeof guestDelta>, firstReview: boolean, persisted: boolean) {
  let answer = '';
  if (firstReview) answer = `Primera revisión registrada. Estado actual: ${summary.currentKnownAttending ?? '—'} asistentes conocidos, ${summary.currentKnownWithoutMaster ?? 0} pendientes de ficha maestra y ${summary.currentKnownDietary ?? 0} con restricciones registradas. Desde este punto podré comparar cambios.`;
  else if (!delta.added.length && !delta.removed.length && !delta.changed.length) answer = `Revisé la lista contra tu última revisión y no detecté cambios nominales. Estado actual: ${summary.currentKnownAttending ?? '—'} asistentes conocidos y ${summary.currentKnownWithoutMaster ?? 0} pendientes de ficha.`;
  else {
    const parts: string[] = [];
    if (delta.added.length) parts.push(`Nuevos (${delta.added.length}): ${delta.added.map((person) => person.name).join(', ')}`);
    if (delta.changed.length) parts.push(`Cambios de asistencia (${delta.changed.length}): ${delta.changed.map((person) => `${person.name} → ${person.attendance || 'actualizado'}`).join(', ')}`);
    if (delta.removed.length) parts.push(`Ya no aparecen en la fuente actual (${delta.removed.length}): ${delta.removed.map((person) => person.name).join(', ')}`);
    answer = `Revisé la lista actualizada. ${parts.join('. ')}. Total actual: ${summary.currentKnownAttending ?? '—'} asistentes conocidos; ${summary.currentKnownWithoutMaster ?? 0} todavía pendientes de ficha.`;
  }
  if (!persisted) answer += ' En Preview no moví el punto de revisión persistente para proteger producción.';
  return answer;
}

function coordinationBrief(snapshot: any) {
  const confirmed = snapshot.confirmed?.summary || {}, seating = snapshot.seating || {}, timeline = snapshot.timeline?.summary || {}, music = snapshot.music?.summary || {}, budget = snapshot.budget?.summary || {}, issues = snapshot.issues || [], tasks = snapshot.tasks || [];
  const openTasks = tasks.filter((task: any) => !['Completada','Completado','Hecha','Done'].includes(String(task.status || '')));
  const priority: string[] = [];
  if (Number(confirmed.currentKnownWithoutMaster || 0) > 0) priority.push(`conciliar ${confirmed.currentKnownWithoutMaster} confirmados sin ficha maestra`);
  if (Number(seating.unassigned || 0) > 0) priority.push(`ubicar ${seating.unassigned} asistentes operativos que siguen sin mesa`);
  if (Number(seating.capacity || 0) < Number(confirmed.currentKnownAttending || 0)) priority.push(`resolver el déficit de ${Number(confirmed.currentKnownAttending || 0) - Number(seating.capacity || 0)} cupos de mesa`);
  if (Number(timeline.pending || 0) > 0) priority.push(`cerrar ${timeline.pending} bloques pendientes del cronograma`);
  if (Number(music.pendingMoments || 0) > 0) priority.push(`definir ${music.pendingMoments} decisiones musicales pendientes`);
  if (openTasks.length > 0) priority.push(`revisar ${openTasks.length} tareas abiertas`);
  const top = priority.slice(0, 4);
  return `Estado operativo ahora: ${confirmed.currentKnownAttending ?? '—'} asistentes conocidos, ${issues.length} incidencias abiertas, ${seating.assigned ?? 0} personas asignadas a mesa de ${seating.operationalGuests ?? 0} fichas asistentes, y ${openTasks.length} tareas abiertas. Presupuesto pendiente estimado: ${formatMoney(budget.remaining)}.\n\nPrioridad recomendada: ${top.length ? top.map((item, index) => `${index + 1}) ${item}`).join('; ') : 'no detecto bloqueos críticos en las fuentes disponibles'}.`;
}
function groundedFallback(question: string, snapshot: any, unavailable: string[], deterministicAction: CopilotAction | null) {
  const q = normalize(question), confirmed = snapshot.confirmed?.summary || {}, seating = snapshot.seating || {}, budget = snapshot.budget?.summary || {}, timeline = snapshot.timeline?.summary || {}, music = snapshot.music?.summary || {}, documents = snapshot.documents?.summary || {}, issues = snapshot.issues || [], tasks = snapshot.tasks || [];
  let answer = '';
  if (deterministicAction) answer = `Preparé la acción “${deterministicAction.label}”. Revisa el detalle y presiona Confirmar para aplicarla; no haré cambios antes de eso.`;
  else if (/(ayudame|ayúdame|coordina|coordinar|organiza|organizar|que hago ahora|qué hago ahora|prioriza|priorizar)/.test(q)) answer = coordinationBrief(snapshot);
  else if (/(agrega|agregar|añade|crear|crea|nuevo).{0,18}invitad/.test(q)) answer = 'Puedo hacerlo. Dime el nombre y apellido exactos del invitado. Si quieres, agrega también “asiste”, “no asiste” o “pendiente”; después te mostraré la acción para confirmar.';
  else if (/(confirmad|asisten|invitad)/.test(q) && /(cuant|total|numero|número)/.test(q)) answer = `Hecho: hay ${confirmed.currentKnownAttending ?? '—'} asistentes conocidos; ${confirmed.currentKnownWithoutMaster ?? 0} están pendientes de ficha maestra.`;
  else if (/(mesa|seating|sentar|salon|salón)/.test(q)) answer = `Hecho: hay ${seating.tables?.length ?? 0} mesas, capacidad ${seating.capacity ?? 0}, ${seating.assigned ?? 0} asignados y ${seating.unassigned ?? 0} fichas asistentes sin mesa.`;
  else if (/(presupuesto|pagar|pagado|saldo|costo)/.test(q)) answer = `Hecho: presupuesto ${formatMoney(budget.totalBudget)}, pagado/prepagado ${formatMoney(budget.paidOrPrepaid)} y pendiente ${formatMoney(budget.remaining)}.`;
  else if (/(cronograma|timeline|horario|hito)/.test(q)) answer = `Hecho: ${timeline.total ?? 0} bloques; ${timeline.confirmed ?? 0} confirmados y ${timeline.pending ?? 0} pendientes.`;
  else if (/(musica|música|cancion|canción|dj|playlist|violin|banda|grupo)/.test(q)) answer = `Hecho: Música registra ${music.moments ?? 0} ítems; ${music.confirmedMoments ?? 0} confirmados y ${music.pendingMoments ?? 0} pendientes. Puedes dictarme canciones para DJ, violinista o grupo y prepararé la incorporación para tu confirmación.`;
  else if (/(tarea|checklist|planificacion|planificación)/.test(q)) answer = `Hecho: ${tasks.filter((task: any) => task.status !== 'Completada').length} tareas manuales pendientes.`;
  else if (/(document|archivo|contrato)/.test(q)) answer = `Hecho: el registro documental contiene ${documents.total ?? documents.items ?? 0} elementos según las fuentes disponibles.`;
  else if (/(atencion|atención|pendiente|falta|prioridad)/.test(q)) answer = `Hecho: ${issues.length} incidencias abiertas; además ${confirmed.currentKnownWithoutMaster ?? 0} asistentes pendientes de ficha y ${timeline.pending ?? 0} bloques pendientes. ${coordinationBrief(snapshot)}`;
  else answer = 'Puedo ayudarte a operar la boda con datos reales: invitados, incidencias, mesas, presupuesto, cronograma, música, proveedores, tareas y memoria. También puedo preparar cambios para que tú los confirmes.';
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
    const history = (Array.isArray(body?.history) ? body.history : []).slice(-12) as ChatMessage[];
    if (!question) return NextResponse.json({ ok: false, error: 'QUESTION_REQUIRED' }, { status: 400 });

    const cookie = request.headers.get('cookie') || '';
    const origin = new URL(request.url).origin;
    const [confirmedResult, budgetResult, timelineResult, musicResult, documentsResult, tablesResult, guestsResult, seatingResult, issuesResult, vendorsResult, expensesResult, paymentsResult, tasksResult, memoryResult] = await Promise.all([
      fetchJsonSafe(origin, '/api/confirmed-source', cookie), fetchJsonSafe(origin, '/api/budget-source', cookie), fetchJsonSafe(origin, '/api/timeline-source', cookie), fetchJsonSafe(origin, '/api/music-source', cookie), fetchJsonSafe(origin, '/api/documents-source', cookie),
      supabase.from('wedding_tables').select('id,table_number,name,capacity,table_type,zone,position_x,position_y,rotation,locked').order('table_number'),
      supabase.from('wedding_guests').select('id,first_name,last_name,group_name,family_side,family_branch,attendance_status,dietary_type,dietary_detail,table_id,guest_status').eq('guest_status', 'active').order('first_name'),
      supabase.from('seating_assignments').select('guest_id,table_id,seat_number'),
      supabase.from('management_issues').select('id,issue_type,severity,title,description,status').eq('status', 'open'),
      supabase.from('vendors').select('*').order('name'), supabase.from('expenses').select('*'), supabase.from('expense_payments').select('*'),
      supabase.from('event_tasks').select('*').order('due_at', { ascending: true, nullsFirst: false }),
      supabase.from('event_memory').select('memory_type,subject_type,subject_id,title,content,confidence,source,updated_at').eq('status', 'active').order('updated_at', { ascending: false }).limit(100),
    ]);

    const unavailable: string[] = [];
    const read = (result: any, name: string, fallback: any) => { if (result?.ok) return result.data; unavailable.push(name); return fallback; };
    const confirmed = read(confirmedResult, 'Confirmados', { summary: {}, people: [], incomingAttending: [], incomingDeclined: [], groups: [], dataQuality: [] });
    const budget = read(budgetResult, 'Presupuesto', { summary: {}, items: [] });
    const timeline = read(timelineResult, 'Cronograma', { summary: {}, items: [] });
    const music = read(musicResult, 'Música', { summary: {}, moments: [] });
    const documents = read(documentsResult, 'Documentos', { summary: {}, items: [] });
    ([['Mesas', tablesResult], ['Invitados', guestsResult], ['Asignaciones', seatingResult], ['Incidencias', issuesResult], ['Proveedores', vendorsResult], ['Tareas', tasksResult], ['Memoria', memoryResult]] as Array<[string, any]>).forEach(([name, result]) => { if (result.error) unavailable.push(name); });

    const tables = tablesResult.data || [], guests = guestsResult.data || [], seating = seatingResult.data || [];
    const tableById = new Map<string, any>(tables.map((table: any) => [table.id, table]));
    const seatingByGuest = new Map<string, string>(seating.map((assignment: any) => [assignment.guest_id, assignment.table_id]));
    const operationalGuests = guests.filter((guest: any) => guest.attendance_status === 'attending');
    const seatingState = operationalGuests.map((guest: any) => { const tableId = seatingByGuest.get(guest.id) || guest.table_id || null; const table = tableId ? tableById.get(tableId) : null; return { name: `${guest.first_name} ${guest.last_name || ''}`.trim(), group: guest.group_name, familySide: guest.family_side, familyBranch: guest.family_branch || '', dietaryType: guest.dietary_type || 'Ninguna', table: table ? { number: table.table_number, name: table.name } : null }; });
    const people = currentPeople(confirmed);
    const snapshot = { generatedAt: new Date().toISOString(), page: currentPath, confirmed: { summary: confirmed.summary || {}, people, groups: confirmed.groups || [], dataQuality: confirmed.dataQuality || [] }, seating: { tables, assignments: seatingState, operationalGuests: operationalGuests.length, assigned: seatingState.filter((item: any) => item.table).length, unassigned: seatingState.filter((item: any) => !item.table).length, capacity: tables.reduce((sum: number, table: any) => sum + Number(table.capacity || 0), 0) }, budget: { summary: budget.summary || {}, items: budget.items || [] }, timeline: { summary: timeline.summary || {}, items: timeline.items || [] }, music: { summary: music.summary || {}, moments: music.moments || [] }, documents: { summary: documents.summary || {}, items: documents.items || [] }, tasks: tasksResult.data || [], issues: issuesResult.data || [], vendors: vendorsResult.data || [], expenses: expensesResult.data || [], payments: paymentsResult.data || [], memory: memoryResult.data || [], unavailableSources: unavailable };

    const reviewRequested = /(revis(a|ar|e)|actualizad|que cambio|qué cambió|cambios desde|novedades).*(lista|invitad|confirmad|rsvp)|^(revisar lista actualizada)$/i.test(question);
    if (reviewRequested) {
      const { data: state } = await supabase.from('copilot_review_state').select('last_snapshot,last_reviewed_at').eq('user_id', user.id).eq('domain', 'guest_list').maybeSingle();
      const delta = guestDelta(state?.last_snapshot, people);
      const writeBlocked = Boolean(getDatabaseWriteBlock());
      if (!writeBlocked) await supabase.from('copilot_review_state').upsert({ user_id: user.id, domain: 'guest_list', last_reviewed_at: new Date().toISOString(), last_snapshot: { people, summary: confirmed.summary || {} }, updated_at: new Date().toISOString() }, { onConflict: 'user_id,domain' });
      return NextResponse.json({ ok: true, answer: reviewAnswer(confirmed.summary || {}, delta, !state, !writeBlocked), model: 'deterministic-delta', mode: 'grounded-delta', groundedAt: snapshot.generatedAt, readOnly: true, action: null, unavailableSources: unavailable, reviewPersisted: !writeBlocked });
    }

    const deterministicAction = parseAction(question, history);
    const system = `Eres el Copiloto Operacional del matrimonio. Usa exclusivamente SNAPSHOT y MEMORIA ACTIVA como hechos. Distingue Hecho / Inferencia / Recomendación. Nunca inventes parentescos, canciones, costos, horarios, documentos o proveedores. Para confirmados usa currentKnownAttending. Cuando el usuario pida una modificación soportada, usa una herramienta propose_*; sólo prepara la acción y nunca afirmes que la ejecutaste. Si pide ayuda general para coordinar, prioriza bloqueos y siguientes acciones. Español de Chile, concreto y orientado a decisiones.\nSNAPSHOT:\n${JSON.stringify(snapshot)}`;
    const messages = [{ role: 'system', content: system }, ...history.map((message) => ({ role: message.role, content: message.text })), { role: 'user', content: question }];

    let answer = '', model = 'operational-engine', mode = 'operational-engine', aiError: string | null = null, aiAction: CopilotAction | null = null;
    const openAIKey = process.env.OPENAI_API_KEY || '';
    if (openAIKey) {
      try { const result = await askOpenAI(openAIKey, process.env.OPENAI_COPILOT_MODEL || 'gpt-5.6', messages); answer = result.answer; model = result.model; mode = 'openai-responses-tools'; aiAction = result.action || null; }
      catch (error: any) { aiError = error?.message || 'OpenAI no disponible'; }
    }
    if (!answer) {
      const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || '';
      if (gatewayToken) {
        for (const candidate of Array.from(new Set([process.env.AI_GATEWAY_MODEL || 'openai/gpt-5.6', 'openai/gpt-5.6', 'anthropic/claude-sonnet-5', 'google/gemini-3.1-pro-preview']))) {
          try { const result = await askGateway(gatewayToken, candidate, messages); answer = result.answer; model = result.model; mode = 'ai-gateway'; break; }
          catch (error: any) { aiError = error?.message || 'AI Gateway no disponible'; }
        }
      }
    }
    const proposedAction = aiAction || deterministicAction;
    if (!answer) answer = groundedFallback(question, snapshot, unavailable, proposedAction);
    return NextResponse.json({ ok: true, answer, model, mode, groundedAt: snapshot.generatedAt, readOnly: !proposedAction, action: proposedAction, unavailableSources: unavailable, aiError: mode === 'operational-engine' ? aiError : null });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'No fue posible responder con el Copiloto.' }, { status: 500 });
  }
}
