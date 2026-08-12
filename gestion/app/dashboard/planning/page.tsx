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
    dietary: number;
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
  const [guestCount, setGuestCount] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [openIssues, setOpenIssues] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const supabase = createClient();
      const [confirmedResponse, budgetResponse, timelineResponse, guestsResult, seatingResult, issuesResult] = await Promise.all([
        fetch('/api/confirmed-source', { cache: 'no-store' }),
        fetch('/api/budget-source', { cache: 'no-store' }),
        fetch('/api/timeline-source', { cache: 'no-store' }),
        supabase.from('wedding_guests').select('id').eq('attendance_status', 'attending').eq('guest_status', 'active'),
        supabase.from('seating_assignments').select('guest_id'),
        supabase.from('management_issues').select('id').eq('status', 'open'),
      ]);

      const [confirmedPayload, budgetPayload, timelinePayload] = await Promise.all([
        confirmedResponse.json(), budgetResponse.json(), timelineResponse.json(),
      ]);
      const dbErrors = [guestsResult.error, seatingResult.error, issuesResult.error].filter(Boolean);
      if (dbErrors.length) throw new Error(dbErrors.map((item) => item?.message).join(' · '));
      if (!confirmedResponse.ok || !confirmedPayload?.ok) throw new Error(confirmedPayload?.error || 'No fue posible leer confirmados.');
      if (!budgetResponse.ok || !budgetPayload?.ok) throw new Error(budgetPayload?.error || 'No fue posible leer presupuesto.');
      if (!timelineResponse.ok || !timelinePayload?.ok) throw new Error(timelinePayload?.error || 'No fue posible leer cronograma.');

      setConfirmed(confirmedPayload);
      setBudget(budgetPayload);
      setTimeline(timelinePayload);
      setGuestCount((guestsResult.data || []).length);
      setAssignedCount(new Set((seatingResult.data || []).map((item: any) => item.guest_id)).size);
      setOpenIssues((issuesResult.data || []).length);
    } catch (err: any) {
      setError(err?.message || 'No fue posible construir el plan de trabajo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const tasks = useMemo<PlanningTask[]>(() => {
    const known = confirmed?.summary.currentKnownAttending || 0;
    const missingMaster = Math.max(0, known - guestCount);
    const unassigned = Math.max(0, guestCount - assignedCount);
    const timelinePending = timeline?.summary.pending || 0;
    const missingBudget = (budget?.items || []).filter((item) => item.projectedGross === null || (item.projectedGross === 0 && item.unitNet === null)).length;
    const remaining = budget?.summary.remaining || 0;
    const incoming = confirmed?.summary.incomingAttending || 0;

    const nextTasks: PlanningTask[] = [
      {
        id: 'confirmados', area: 'Invitados', href: '/dashboard/guests', priority: 1,
        title: missingMaster ? `Conciliar ${missingMaster} asistentes con su ficha maestra` : 'Confirmados conciliados con ficha maestra',
        detail: missingMaster ? `${known} asistentes conocidos; ${guestCount} ya están disponibles para operación.` : `${known} asistentes conocidos disponibles para operación.`,
        state: missingMaster ? 'attention' : 'done',
      },
      {
        id: 'incoming', area: 'Datos', href: '/dashboard/guests', priority: 2,
        title: incoming ? `Consolidar ${incoming} RSVP nuevo(s) en CONFIRMADOS_ACTUALES` : 'CONFIRMADOS_ACTUALES al día con Supabase',
        detail: incoming ? 'El sistema ya los cuenta en vivo, pero todavía existe delta entre la hoja curada y Supabase.' : 'No hay delta detectado entre las fuentes de confirmación.',
        state: incoming ? 'pending' : 'done',
      },
      {
        id: 'seating', area: 'Mesas', href: '/dashboard/tables', priority: 3,
        title: unassigned ? `Ubicar ${unassigned} invitado(s) operativos sin mesa` : 'Todos los invitados operativos tienen mesa',
        detail: `${assignedCount} de ${guestCount} fichas asistentes tienen una asignación persistida.`,
        state: unassigned ? 'attention' : 'done',
      },
      {
        id: 'timeline', area: 'Cronograma', href: '/dashboard/timeline', priority: 4,
        title: timelinePending ? `Cerrar ${timelinePending} bloque(s) pendientes del cronograma` : 'Cronograma operativo confirmado',
        detail: `${timeline?.summary.confirmed || 0} de ${timeline?.summary.total || 0} bloques están confirmados.`,
        state: timelinePending ? 'pending' : 'done',
      },
      {
        id: 'budget', area: 'Presupuesto', href: '/dashboard/finance', priority: 5,
        title: missingBudget ? `Completar monto de ${missingBudget} ítem(s) presupuestarios` : 'Ítems presupuestarios con monto definido',
        detail: `Presupuesto total ${money(budget?.summary.totalBudget)} · faltante ${money(remaining)}.`,
        state: missingBudget ? 'pending' : 'done',
      },
      {
        id: 'payments', area: 'Presupuesto', href: '/dashboard/finance', priority: 6,
        title: remaining > 0 ? `Gestionar saldo pendiente de ${money(remaining)}` : 'Presupuesto sin saldo pendiente',
        detail: `Pagado o prepagado: ${money(budget?.summary.paidOrPrepaid)}.`,
        state: remaining > 0 ? 'pending' : 'done',
      },
      {
        id: 'issues', area: 'Control', href: '/dashboard/issues', priority: 7,
        title: openIssues ? `Resolver ${openIssues} incidencia(s) abiertas` : 'Sin incidencias abiertas',
        detail: openIssues ? 'Hay excepciones operativas que requieren revisión antes del cierre.' : 'No hay excepciones operativas activas.',
        state: openIssues ? 'attention' : 'done',
      },
    ];

    const order: Record<PlanningTask['state'], number> = { attention: 0, pending: 1, done: 2 };
    return nextTasks.sort((a, b) => order[a.state] - order[b.state] || a.priority - b.priority);
  }, [confirmed, budget, timeline, guestCount, assignedCount, openIssues]);

  const metrics = useMemo(() => {
    const done = tasks.filter((task) => task.state === 'done').length;
    const attention = tasks.filter((task) => task.state === 'attention').length;
    const pending = tasks.filter((task) => task.state === 'pending').length;
    const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return { done, attention, pending, progress };
  }, [tasks]);

  return <DashboardLayout><div className="planning-v2">
    <section className="planning-v2__hero"><div><span className="planning-v2__eyebrow">Plan de cierre</span><h1>Planificación</h1><p>No es una checklist genérica. El sistema genera prioridades a partir del estado real de confirmados, conciliación, mesas, presupuesto, cronograma e incidencias.</p></div><button type="button" onClick={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Actualizando…' : 'Recalcular plan'}</button></section>

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
