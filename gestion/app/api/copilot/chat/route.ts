import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_MODEL = process.env.AI_COPILOT_MODEL || 'openai/gpt-5.6-sol';
const MAX_TOOL_STEPS = 6;

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_guest_summary',
      description: 'Obtiene el conteo oficial y en vivo de asistentes, no asistentes, conciliación y última confirmación. Usar siempre antes de responder cifras de invitados o RSVP.',
      strict: true,
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_guests',
      description: 'Busca una persona por nombre en fichas operativas y miembros RSVP. Usar antes de afirmar datos de una persona específica.',
      strict: true,
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Nombre o fragmento de nombre.' } },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_seating_state',
      description: 'Obtiene mesas, capacidad, personas operativas, asignaciones, duplicados y posibles conflictos de distribución.',
      strict: true,
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_budget_summary',
      description: 'Obtiene presupuesto, pagado/prepagado, saldo e ítems de presupuesto desde la fuente operacional.',
      strict: true,
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_timeline',
      description: 'Obtiene el cronograma del evento, estados, responsables y bloques pendientes.',
      strict: true,
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_music_plan',
      description: 'Obtiene momentos musicales y servicios musicales detectados en las fuentes operativas.',
      strict: true,
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_documents',
      description: 'Obtiene el registro de documentos operativos y referencias.',
      strict: true,
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_open_issues',
      description: 'Obtiene incidencias abiertas y su severidad. Útil para prioridades y bloqueos.',
      strict: true,
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
] as const;

function safeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSearch(value: string) {
  return value.replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

async function readInternal(request: Request, path: string) {
  const url = new URL(path, request.url);
  const response = await fetch(url, {
    headers: { cookie: request.headers.get('cookie') || '' },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || `SOURCE_FAILED_${path}`);
  return payload;
}

async function executeTool(request: Request, name: string, args: Record<string, unknown>) {
  const supabase = createClient();

  if (name === 'get_guest_summary') {
    const data = await readInternal(request, '/api/confirmed-source');
    return {
      source: data.source,
      liveSource: data.liveSource,
      summary: data.summary,
      newestIncoming: (data.incomingAttending || []).slice(0, 10),
      fetchedAt: data.fetchedAt || new Date().toISOString(),
    };
  }

  if (name === 'search_guests') {
    const query = normalizeSearch(String(args.query || ''));
    if (!query) return { source: 'Supabase', results: [] };
    const [guestResult, memberResult] = await Promise.all([
      supabase
        .from('wedding_guests')
        .select('id, first_name, last_name, group_name, family_side, attendance_status, dietary_type, dietary_detail, table_id, guest_status, notes')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(12),
      supabase
        .from('rsvp_response_members')
        .select('id, display_name, attendance_status, dietary_type, dietary_detail, guest_id, resolution_status, rsvp_id, updated_at')
        .ilike('display_name', `%${query}%`)
        .limit(12),
    ]);
    if (guestResult.error || memberResult.error) throw new Error(guestResult.error?.message || memberResult.error?.message || 'SEARCH_FAILED');
    return {
      source: 'Supabase',
      operationalGuests: guestResult.data || [],
      rsvpMembers: memberResult.data || [],
      fetchedAt: new Date().toISOString(),
    };
  }

  if (name === 'get_seating_state') {
    const [tablesResult, guestsResult, assignmentsResult] = await Promise.all([
      supabase.from('wedding_tables').select('id, table_number, name, capacity, table_type, zone, position_x, position_y, locked').order('table_number'),
      supabase.from('wedding_guests').select('id, first_name, last_name, group_name, dietary_type, table_id').eq('attendance_status', 'attending').eq('guest_status', 'active'),
      supabase.from('seating_assignments').select('id, guest_id, table_id, seat_number'),
    ]);
    const error = tablesResult.error || guestsResult.error || assignmentsResult.error;
    if (error) throw new Error(error.message);
    const tables = tablesResult.data || [];
    const guests = guestsResult.data || [];
    const assignments = assignmentsResult.data || [];
    const capacity = tables.reduce((sum, table) => sum + Number(table.capacity || 0), 0);
    const numbers = new Map<number, number>();
    tables.forEach((table) => numbers.set(Number(table.table_number), (numbers.get(Number(table.table_number)) || 0) + 1));
    const duplicates = Array.from(numbers.entries()).filter(([, count]) => count > 1).map(([number]) => number);
    return {
      source: 'Supabase',
      tables,
      summary: {
        tables: tables.length,
        capacity,
        operationalAttendingGuests: guests.length,
        assignedGuests: new Set(assignments.map((item) => item.guest_id)).size,
        unassignedOperationalGuests: Math.max(0, guests.length - new Set(assignments.map((item) => item.guest_id)).size),
        duplicateTableNumbers: duplicates,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  if (name === 'get_budget_summary') {
    const data = await readInternal(request, '/api/budget-source');
    return { source: data.source, summary: data.summary, items: data.items, fetchedAt: data.fetchedAt };
  }

  if (name === 'get_timeline') {
    const data = await readInternal(request, '/api/timeline-source');
    return { source: data.source, summary: data.summary, items: data.items, fetchedAt: data.fetchedAt };
  }

  if (name === 'get_music_plan') {
    const data = await readInternal(request, '/api/music-source');
    return { sources: data.sources, summary: data.summary, moments: data.moments, budgetItems: data.budgetItems, fetchedAt: data.fetchedAt };
  }

  if (name === 'get_documents') {
    const data = await readInternal(request, '/api/documents-source');
    return { source: data.source, summary: data.summary, items: data.items, fetchedAt: data.fetchedAt };
  }

  if (name === 'get_open_issues') {
    const { data, error } = await supabase
      .from('management_issues')
      .select('id, issue_type, entity_type, entity_id, severity, title, description, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    return {
      source: 'Supabase',
      count: data?.length || 0,
      critical: (data || []).filter((item) => item.severity === 'critical').length,
      issues: data || [],
      fetchedAt: new Date().toISOString(),
    };
  }

  throw new Error(`UNKNOWN_TOOL_${name}`);
}

function systemPrompt(currentPath: string) {
  return `Eres el Copiloto Operacional del Centro de Gestión de la boda de Felipe y Camila.

Tu misión es ayudar a gestionar el evento con precisión operacional. No eres un chatbot decorativo ni una copia de otro producto.

REGLAS OBLIGATORIAS:
1. Para cualquier dato factual del evento (cantidades, nombres, mesas, presupuesto, cronograma, música, documentos, pendientes) DEBES usar las herramientas disponibles antes de responder. Nunca respondas cifras desde memoria del chat.
2. Nunca inventes datos ausentes. Si una fuente no contiene la información, di exactamente que no está registrada.
3. Distingue explícitamente cuando corresponda entre HECHO, INFERENCIA y RECOMENDACIÓN.
4. Esta versión es SOLO LECTURA. No digas que moviste, editaste, pagaste, eliminaste, enviaste ni modificaste nada. Si el usuario pide una acción, explica qué propondrías y que requiere confirmación/flujo de escritura habilitado.
5. Las relaciones de invitados sólo son hechos si la fuente las confirma. No conviertas proximidad temporal, apellido o teléfono compartido en parentesco confirmado.
6. Prioriza integridad de datos, capacidad de mesas, restricciones alimentarias, dependencias del cronograma y compromisos financieros.
7. Responde en español claro, conciso y útil. Evita tecnicismos innecesarios salvo que te los pidan.
8. Cuando entregues una cifra importante, menciona brevemente la fuente consultada y, si está disponible, el momento de actualización.
9. Si hay contradicciones entre fuentes, señálalas; no elijas silenciosamente una.
10. No expongas IDs técnicos, teléfonos, datos sensibles ni detalles alimentarios salvo que la pregunta los requiera específicamente.

Contexto de interfaz actual: ${currentPath || '/dashboard'}.
Fecha operacional: 2026-08-12, zona America/Santiago.`;
}

async function gatewayCompletion(messages: any[]) {
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!token) throw new Error('AI_GATEWAY_NOT_CONFIGURED');

  const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      stream: false,
      reasoning: { effort: 'low' },
    }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || payload?.error || `AI_GATEWAY_FAILED_${response.status}`);
  const choice = payload?.choices?.[0];
  if (!choice?.message) throw new Error('AI_GATEWAY_EMPTY_RESPONSE');
  return { message: choice.message, model: payload.model || DEFAULT_MODEL, usage: payload.usage || null };
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    const { data: profile } = await supabase.from('admin_profiles').select('active, role').eq('id', user.id).single();
    if (!profile?.active) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const body = await request.json();
    const currentPath = safeText(body.currentPath) || '/dashboard';
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const history: ChatMessage[] = incoming
      .filter((item: any) => item && ['user', 'assistant'].includes(item.role) && safeText(item.content || item.text))
      .slice(-12)
      .map((item: any) => ({ role: item.role, content: safeText(item.content || item.text).slice(0, 4000) }));
    if (!history.length || history[history.length - 1].role !== 'user') {
      return NextResponse.json({ ok: false, error: 'USER_MESSAGE_REQUIRED' }, { status: 400 });
    }

    const messages: any[] = [{ role: 'system', content: systemPrompt(currentPath) }, ...history];
    const usedTools: string[] = [];
    let model = DEFAULT_MODEL;
    let usage: any = null;

    for (let step = 0; step < MAX_TOOL_STEPS; step += 1) {
      const completion = await gatewayCompletion(messages);
      model = completion.model;
      usage = completion.usage;
      const assistantMessage = completion.message;
      const toolCalls = (assistantMessage.tool_calls || []) as ToolCall[];

      if (!toolCalls.length) {
        const content = safeText(assistantMessage.content);
        if (!content) throw new Error('AI_EMPTY_TEXT');
        return NextResponse.json({ ok: true, message: content, model, toolsUsed: Array.from(new Set(usedTools)), usage });
      }

      messages.push({ role: 'assistant', content: assistantMessage.content || null, tool_calls: toolCalls });

      for (const call of toolCalls) {
        let args: Record<string, unknown> = {};
        try { args = call.function.arguments ? JSON.parse(call.function.arguments) : {}; } catch { args = {}; }
        usedTools.push(call.function.name);
        try {
          const result = await executeTool(request, call.function.name, args);
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
        } catch (error: any) {
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ ok: false, error: error?.message || 'TOOL_FAILED' }) });
        }
      }
    }

    return NextResponse.json({ ok: false, error: 'AI_TOOL_LOOP_LIMIT' }, { status: 500 });
  } catch (error: any) {
    const message = error?.message || 'No fue posible responder con el Copiloto.';
    const status = message === 'AI_GATEWAY_NOT_CONFIGURED' ? 503 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
