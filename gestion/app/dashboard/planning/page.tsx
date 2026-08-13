'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Clock3, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import './planning-v2.css';

interface ConfirmedSource {
  summary: {
    currentKnownAttending: number;
    currentKnownDeclined: number;
    incomingAttending: number;
    attending: number;
    currentKnownWithoutMaster: number;
    currentKnownAssociated: number;
    currentKnownDietary: number;
  };
}

interface BudgetSource {
  items: Array<{ item: string; status: string; projectedGross: number | null; unitNet: number | null }>;
  summary: { totalBudget: number | null; paidOrPrepaid: number | null; remaining: number | null };
}

interface TimelineSource {
  summary: { total: number; confirmed: number; pending: number };
  items: Array<{ block: string; status: string; dependencies: string; notes: string }>;
}

interface MusicSource {
  summary: { moments: number; confirmedMoments: number; pendingMoments: number; pendingBudget: number; hasDetailedPlaylist: boolean };
}

interface DocumentsSource {
  summary: { total: number; active: number; reference: number; categories: number };
}

interface TableRow {
  id: string;
  table_number: number;
  capacity: number;
  position_x: number | string;
  position_y: number | string;
}

interface GuestRow { id: string; table_id: string | null; }
interface SeatingRow { guest_id: string; table_id: string; }

interface PlanningTask {
  id: string;
  area: string;
  title: string;
  detail: string;
  href: string;
  state: 'done' | 'attention' | 'pending';
  priority: number;
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return 'por confirmar';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

export default function PlanningPage() {
  const [confirmed, setConfirmed] = useState<ConfirmedSource | null>(null);
  const [budget, setBudget] = useState<BudgetSource | null>(null);
  const [timeline, setTimeline] = useState<TimelineSource | null>(null);
  const [music, setMusic] = useState<MusicSource | null>(null);
  const [documents, setDocuments] = useState<DocumentsSource | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [seating, setSeating] = useState<SeatingRow[]>([]);
  const [openIssues, setOpenIssues] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const supabase = createClient();
      const [confirmedResponse, budgetResponse, timelineResponse, musicResponse, documentsResponse, tablesResult, guestsResult, seatingResult, issuesResult] = await Promise.all([
        fetch('/api/confirmed-source', { cache: 'no-store' }),
        fetch('/api/budget-source', { cache: 'no-store' }),
        fetch('/api/timeline-source', { cache: 'no-store' }),
        fetch('/api/music-source', { cache: 'no-store' }),
        fetch('/api/documents-source', { cache: 'no-store' }),
        supabase.from('wedding_tables').select('id, table_number, capacity, position_x, position_y'),
        supabase.from('wedding_guests').select('id, table_id').eq('attendance_status', 'attending').eq('guest_status', 'active'),
        supabase.from('seating_assignments').select('guest_id, table_id'),
        supabase.from('management_issues').select('id').eq('status', 'open'),
      ]);

      const [confirmedPayload, budgetPayload, timelinePayload, musicPayload, documentsPayload] = await Promise.all([
        confirmedResponse.json(), budgetResponse.json(), timelineResponse.json(), musicResponse.json(), documentsResponse.json(),
      ]);
      const dbErrors = [tablesResult.error, guestsResult.error, seatingResult.error, issuesResult.error].filter(Boolean);
      if (dbErrors.length) throw new Error(dbErrors.map((item) => item?.message).join(' · '));
      if (!confirmedResponse.ok || !confirmedPayload?.ok) throw new Error(confirmedPayload?.error || 'No fue posible leer confirmados.');
      if (!budgetResponse.ok || !budgetPayload?.ok) throw new Error(budgetPayload?.error || 'No fue posible leer presupuesto.');
      if (!timelineResponse.ok || !timelinePayload?.ok) throw new Error(timelinePayload?.error || 'No fue posible leer cronograma.');
      if (!musicResponse.ok || !musicPayload?.ok) throw new Error(musicPayload?.error || 'No fue posible leer música.');
      if (!documentsResponse.ok || !documentsPayload?.ok) throw new Error(documentsPayload?.error || 'No fue posible leer documentos.');

      setConfirmed(confirmedPayload);
      setBudget(budgetPayload);
      setTimeline(timelinePayload);
      setMusic(musicPayload);
      setDocuments(documentsPayload);
      setTables((tablesResult.data || []) as TableRow[]);
      setGuests((guestsResult.data || []) as GuestRow[]);
      setSeating((seatingResult.data || []) as SeatingRow[]);
      setOpenIssues((issuesResult.data || []).length);
    } catch (err: any) {
      setError(err?.message || 'No fue posible construir el plan de trabajo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const derived = useMemo(() => {
    const known = confirmed?.summary.currentKnownAttending || 0;
    const missingMaster = confirmed?.summary.currentKnownWithoutMaster ?? Math.max(0, known - guests.length);
    const assignedIds = new Set(seating.map((item) => item.guest_id));
    guests.forEach((guest) => { if (guest.table_id) assignedIds.add(guest.id); });
    const assigned = assignedIds.size;
    const unassigned = Math.max(0, guests.length - assigned);
    const capacity = tables.reduce((sum, table) => sum + Number(table.capacity || 0), 0);
    const capacityGap = Math.max(0, known - capacity);

    const numberCounts = new Map<number, number>();
    tables.forEach((table) => numberCounts.set(Number(table.table_number), (numberCounts.get(Number(table.table_number)) || 0) + 1));
    const duplicateNumbers = Array.from(numberCounts.values()).filter((count) => count > 1).length;
    let collisions = 0;
    for (let i = 0; i < tables.length; i += 1) {
      for (let j = i + 1; j < tables.length; j += 1) {
        if (Math.abs(Number(tables[i].position_x) - Number(tables[j].position_x)) < 3 && Math.abs(Number(tables[i].position_y) - Number(tables[j].position_y)) < 3) collisions += 1;
      }
    }

    return { known, missingMaster, assigned, unassigned, capacity, capacityGap, duplicateNumbers, collisions };
  }, [confirmed, guests, seating, tables]);

  const tasks = useMemo<PlanningTask[]>(() => {
    const timelinePending = timeline?.summary.pending || 0;
    const missingBudget = (budget?.items || []).filter((item) => item.projectedGross === null || (item.projectedGross === 0 && item.unitNet === null)).length;
    const remaining = budget?.summary.remaining || 0;
    const incoming = confirmed?.summary.incomingAttending || 0;
    const venueIntegrity = derived.duplicateNumbers + derived.collisions;
    const musicPending = (music?.summary.pendingMoments || 0) + (music?.summary.pendingBudget || 0);

    const nextTasks: PlanningTask[] = [
      {
        id: 'confirmados', area: 'Invitados', href: '/dashboard/guests', priority: 1,
        title: derived.missingMaster ? `Conciliar ${derived.missingMaster} asistentes con su ficha maestra` : 'Confirmados conciliados con ficha maestra',
        detail: derived.missingMaster ? `${derived.known} asistentes conocidos; ${guests.length} fichas asistentes están disponibles para operación.` : `${derived.known} asistentes conocidos disponibles para operación.`,
        state: derived.missingMaster ? 'attention' : 'done',
      },
      {
        id: 'incoming', area: 'Datos', href: '/dashboard/guests', priority: 2,
        title: incoming ? `Consolidar ${incoming} RSVP nuevo(s) en CONFIRMADOS_ACTUALES` : 'CONFIRMADOS_ACTUALES al día con Supabase',
        detail: incoming ? 'El Centro ya los cuenta en vivo, pero la hoja curada todavía tiene un delta.' : 'No hay delta detectado entre las fuentes de confirmación.',
        state: incoming ? 'pending' : 'done',
      },
      {
        id: 'capacity', area: 'Salón', href: '/dashboard/venue', priority: 3,
        title: derived.capacityGap ? `Agregar o ajustar ${derived.capacityGap} cupos de capacidad` : 'Capacidad del salón cubre a los asistentes conocidos',
        detail: `${tables.length} mesas suman ${derived.capacity} cupos para ${derived.known} asistentes conocidos.`,
        state: derived.capacityGap ? 'attention' : 'done',
      },
      {
        id: 'venue-integrity', area: 'Salón', href: '/dashboard/venue', priority: 4,
        title: venueIntegrity ? `Corregir ${venueIntegrity} inconsistencia(s) del plano` : 'Plano sin duplicidades o colisiones detectadas',
        detail: `${derived.duplicateNumbers} numeración(es) duplicada(s) · ${derived.collisions} superposición(es) detectada(s).`,
        state: venueIntegrity ? 'attention' : 'done',
      },
      {
        id: 'seating', area: 'Mesas', href: '/dashboard/tables', priority: 5,
        title: derived.unassigned ? `Ubicar ${derived.unassigned} invitado(s) operativos sin mesa` : 'Todos los invitados operativos tienen mesa',
        detail: `${derived.assigned} de ${guests.length} fichas asistentes tienen una asignación persistida o vinculada.`,
        state: derived.unassigned ? 'attention' : 'done',
      },
      {
        id: 'timeline', area: 'Cronograma', href: '/dashboard/timeline', priority: 6,
        title: timelinePending ? `Cerrar ${timelinePending} bloque(s) pendientes del cronograma` : 'Cronograma operativo confirmado',
        detail: `${timeline?.summary.confirmed || 0} de ${timeline?.summary.total || 0} bloques están confirmados.`,
        state: timelinePending ? 'pending' : 'done',
      },
      {
        id: 'music', area: 'Música', href: '/dashboard/music', priority: 7,
        title: musicPending ? `Cerrar ${musicPending} decisión(es) operativas de música` : 'Momentos y servicios musicales cerrados',
        detail: `${music?.summary.pendingMoments || 0} momentos pendientes · ${music?.summary.pendingBudget || 0} servicios pendientes.${music?.summary.hasDetailedPlaylist ? '' : ' Repertorio canción por canción aún no documentado.'}`,
        state: musicPending || !music?.summary.hasDetailedPlaylist ? 'pending' : 'done',
      },
      {
        id: 'budget', area: 'Presupuesto', href: '/dashboard/finance', priority: 8,
        title: missingBudget ? `Completar monto de ${missingBudget} ítem(s) presupuestarios` : 'Ítems presupuestarios con monto definido',
        detail: `Presupuesto total ${money(budget?.summary.totalBudget)} · faltante ${money(remaining)}.`,
        state: missingBudget ? 'pending' : 'done',
      },
      {
        id: 'payments', area: 'Presupuesto', href: '/dashboard/finance', priority: 9,
        title: remaining > 0 ? `Gestionar saldo pendiente de ${money(remaining)}` : 'Presupuesto sin saldo pendiente',
        detail: `Pagado o prepagado: ${money(budget?.summary.paidOrPrepaid)}.`,
        state: remaining > 0 ? 'pending' : 'done',
      },
      {
        id: 'documents', area: 'Documentos', href: '/dashboard/documents', priority: 10,
        title: (documents?.summary.active || 0) ? `${documents?.summary.active || 0} fuentes activas registradas` : 'Registrar fuentes documentales activas',
        detail: `${documents?.summary.total || 0} documentos indexados · ${documents?.summary.reference || 0} marcados como referencia.`,
        state: (documents?.summary.active || 0) ? 'done' : 'pending',
      },
      {
        id: 'issues', area: 'Control', href: '/dashboard/issues', priority: 11,
        title: openIssues ? `Resolver ${openIssues} incidencia(s) abiertas` : 'Sin incidencias abiertas',
        detail: openIssues ? 'Hay excepciones operativas que requieren revisión antes del cierre.' : 'No hay excepciones operativas activas.',
        state: openIssues ? 'attention' : 'done',
      },
    ];

    const order: Record<PlanningTask['state'], number> = { attention: 0, pending: 1, done: 2 };
    return nextTasks.sort((a, b) => order[a.state] - order[b.state] || a.priority - b.priority);
  }, [confirmed, budget, timeline, music, documents, derived, guests.length, tables.length, openIssues]);

  const metrics = useMemo(() => {
    const done = tasks.filter((task) => task.state === 'done').length;
    const attention = tasks.filter((task) => task.state === 'attention').length;
    const pending = tasks.filter((task) => task.state === 'pending').length;
    const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return { done, attention, pending, progress };
  }, [tasks]);

  return <DashboardLayout><div className="planning-v2">
    <section className="planning-v2__hero"><div><span className="planning-v2__eyebrow">Plan de cierre</span><h1>Planificación</h1><p>No es una checklist genérica. El sistema recalcula prioridades usando confirmados, calidad de datos, capacidad, mesas, cronograma, música, presupuesto, documentos e incidencias.</p></div><button type="button" onClick={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Actualizando…' : 'Recalcular plan'}</button></section>

    {error && <div className="planning-v2__error"><AlertTriangle size={16}/><span>{error}</span></div>}

    {loading ? <div className="planning-v2__loading"><Loader2 className="animate-spin" size={21}/>Construyendo plan desde datos reales…</div> : <>
      <section className="planning-v2__progress"><div><span className="planning-v2__eyebrow">Avance operativo</span><strong>{metrics.progress}%</strong><p>{metrics.done} señales resueltas · {metrics.attention} requieren atención · {metrics.pending} pendientes.</p></div><div className="planning-v2__progress-track"><span style={{ width: `${metrics.progress}%` }}/></div></section>

      <section className="planning-v2__focus"><div><Sparkles size={16}/><div><strong>Prioridad sugerida</strong><span>{tasks.find((task) => task.state !== 'done')?.title || 'El plan derivado está completamente resuelto.'}</span></div></div></section>

      <section className="planning-v2__tasks"><header><div><span className="planning-v2__eyebrow">Trabajo pendiente</span><h2>Qué hacer ahora</h2></div><small>Ordenado por impacto operativo</small></header><div className="planning-v2__task-list">{tasks.map((task) => {
        const Icon = task.state === 'done' ? CheckCircle2 : task.state === 'attention' ? AlertTriangle : Clock3;
        return <Link href={task.href} key={task.id} className={`planning-v2__task is-${task.state}`}><span className="planning-v2__task-icon"><Icon size={17}/></span><div><span>{task.area}</span><strong>{task.title}</strong><p>{task.detail}</p></div><ArrowRight size={15}/></Link>;
      })}</div></section>

      <section className="planning-v2__legend"><div><CheckCircle2 size={14}/><span>Resuelto automáticamente por estado de datos</span></div><div><AlertTriangle size={14}/><span>Bloqueo o inconsistencia que afecta operación</span></div><div><Circle size={14}/><span>Pendiente que todavía debe cerrarse</span></div></section>
    </>}
  </div></DashboardLayout>;
}
