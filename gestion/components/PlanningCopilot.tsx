'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import {
  ArrowRight,
  Bot,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import styles from './PlanningCopilot.module.css';

type CopilotProps = { currentPath: string };
type Message = { role: 'assistant' | 'user'; text: string };

type Snapshot = {
  knownAttending: number;
  consolidatedAttending: number;
  incomingAttending: number;
  withoutMaster: number;
  tables: number;
  capacity: number;
  operationalGuests: number;
  assignedGuests: number;
  openIssues: number;
  budgetTotal: number | null;
  budgetPaid: number | null;
  budgetRemaining: number | null;
  budgetMissing: number;
  timelineTotal: number;
  timelinePending: number;
  pendingTimelineBlocks: string[];
  musicPendingMoments: number;
  musicPendingBudget: number;
  hasDetailedPlaylist: boolean;
  documents: number;
  activeDocuments: number;
};

function money(value: number | null) {
  if (value === null) return 'por confirmar';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function PlanningCopilot({ currentPath }: CopilotProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const pageLabel = useMemo(() => {
    if (currentPath.includes('/guests')) return 'Invitados';
    if (currentPath.includes('/tables')) return 'Mesas';
    if (currentPath.includes('/venue')) return 'Salón';
    if (currentPath.includes('/finance')) return 'Presupuesto';
    if (currentPath.includes('/timeline')) return 'Cronograma';
    if (currentPath.includes('/music')) return 'Música';
    if (currentPath.includes('/documents')) return 'Documentos';
    if (currentPath.includes('/planning')) return 'Planificación';
    if (currentPath.includes('/issues')) return 'Necesita atención';
    return 'Inicio';
  }, [currentPath]);

  async function loadContext() {
    setLoading(true);
    try {
      const supabase = createClient();
      const [confirmedResponse, budgetResponse, timelineResponse, musicResponse, documentsResponse, tablesResult, guestsResult, seatingResult, issuesResult] = await Promise.all([
        fetch('/api/confirmed-source', { cache: 'no-store' }),
        fetch('/api/budget-source', { cache: 'no-store' }),
        fetch('/api/timeline-source', { cache: 'no-store' }),
        fetch('/api/music-source', { cache: 'no-store' }),
        fetch('/api/documents-source', { cache: 'no-store' }),
        supabase.from('wedding_tables').select('id, capacity, table_number'),
        supabase.from('wedding_guests').select('id').eq('attendance_status', 'attending').eq('guest_status', 'active'),
        supabase.from('seating_assignments').select('guest_id'),
        supabase.from('management_issues').select('id').eq('status', 'open'),
      ]);
      const [confirmed, budget, timeline, music, documents] = await Promise.all([
        confirmedResponse.json(), budgetResponse.json(), timelineResponse.json(), musicResponse.json(), documentsResponse.json(),
      ]);
      const failed = [confirmedResponse, budgetResponse, timelineResponse, musicResponse, documentsResponse].find((response) => !response.ok);
      if (failed) throw new Error('Una de las fuentes conectadas no respondió correctamente.');
      const capacity = (tablesResult.data || []).reduce((sum, table: any) => sum + Number(table.capacity || 0), 0);
      const snap: Snapshot = {
        knownAttending: confirmed.summary.currentKnownAttending || 0,
        consolidatedAttending: confirmed.summary.attending || 0,
        incomingAttending: confirmed.summary.incomingAttending || 0,
        withoutMaster: confirmed.summary.currentKnownWithoutMaster || 0,
        tables: (tablesResult.data || []).length,
        capacity,
        operationalGuests: (guestsResult.data || []).length,
        assignedGuests: new Set((seatingResult.data || []).map((item: any) => item.guest_id)).size,
        openIssues: (issuesResult.data || []).length,
        budgetTotal: budget.summary.totalBudget ?? null,
        budgetPaid: budget.summary.paidOrPrepaid ?? null,
        budgetRemaining: budget.summary.remaining ?? null,
        budgetMissing: (budget.items || []).filter((item: any) => item.projectedGross === null || (item.projectedGross === 0 && item.unitNet === null)).length,
        timelineTotal: timeline.summary.total || 0,
        timelinePending: timeline.summary.pending || 0,
        pendingTimelineBlocks: (timeline.items || []).filter((item: any) => String(item.status).toLowerCase() !== 'confirmado').slice(0, 4).map((item: any) => item.block),
        musicPendingMoments: music.summary.pendingMoments || 0,
        musicPendingBudget: music.summary.pendingBudget || 0,
        hasDetailedPlaylist: Boolean(music.summary.hasDetailedPlaylist),
        documents: documents.summary.total || 0,
        activeDocuments: documents.summary.active || 0,
      };
      setSnapshot(snap);
      if (!messages.length) {
        setMessages([{ role: 'assistant', text: `Tengo el estado conectado del evento y el contexto de ${pageLabel}. Puedo explicarte bloqueos, cambios y prioridades sin alterar datos.` }]);
      }
    } catch (error: any) {
      setMessages((current) => [...current, { role: 'assistant', text: error?.message || 'No pude cargar todas las fuentes del evento.' }]);
    } finally {
      setLoading(false);
    }
  }

  function answer(question: string) {
    if (!snapshot) return 'Primero necesito cargar el estado conectado del evento.';
    const q = normalize(question);
    const capacityGap = Math.max(0, snapshot.knownAttending - snapshot.capacity);
    const unassigned = Math.max(0, snapshot.operationalGuests - snapshot.assignedGuests);

    if (q.includes('confirm') || q.includes('invitad') || q.includes('rsvp')) {
      return `Hoy reconozco ${snapshot.knownAttending} asistentes: ${snapshot.consolidatedAttending} están consolidados y ${snapshot.incomingAttending} llegaron por Supabase después del último consolidado. ${snapshot.withoutMaster} asistentes conocidos todavía no tienen ficha maestra operativa.`;
    }
    if (q.includes('mesa') || q.includes('capacidad') || q.includes('salon') || q.includes('sentar')) {
      return `Hay ${snapshot.tables} mesas con capacidad total para ${snapshot.capacity} personas. Frente a ${snapshot.knownAttending} asistentes conocidos, ${capacityGap ? `faltan ${capacityGap} cupos` : 'la capacidad alcanza'}. De las ${snapshot.operationalGuests} fichas asistentes operativas, ${snapshot.assignedGuests} están asignadas y ${unassigned} siguen sin mesa.`;
    }
    if (q.includes('presupuesto') || q.includes('pago') || q.includes('costo') || q.includes('saldo')) {
      return `El presupuesto operativo registra ${money(snapshot.budgetTotal)}. Pagado o prepagado: ${money(snapshot.budgetPaid)}. Saldo: ${money(snapshot.budgetRemaining)}. Además, ${snapshot.budgetMissing} ítem(s) todavía requieren completar monto.`;
    }
    if (q.includes('cronograma') || q.includes('timeline') || q.includes('hora') || q.includes('programa')) {
      const blocks = snapshot.pendingTimelineBlocks.length ? ` Los próximos pendientes detectados son: ${snapshot.pendingTimelineBlocks.join(', ')}.` : '';
      return `El cronograma tiene ${snapshot.timelineTotal} bloques y ${snapshot.timelinePending} siguen pendientes de cierre.${blocks}`;
    }
    if (q.includes('musica') || q.includes('dj') || q.includes('banda') || q.includes('playlist')) {
      return `En Música quedan ${snapshot.musicPendingMoments} momento(s) operativos y ${snapshot.musicPendingBudget} ítem(s) presupuestarios pendientes. ${snapshot.hasDetailedPlaylist ? 'Ya existe repertorio detallado.' : 'Todavía no existe una playlist canción por canción en las fuentes conectadas, así que no voy a inventarla.'}`;
    }
    if (q.includes('document') || q.includes('archivo') || q.includes('drive')) {
      return `El registro documental tiene ${snapshot.documents} entradas, de las cuales ${snapshot.activeDocuments} están marcadas como fuentes activas. Las demás se muestran como referencia para evitar trabajar sobre archivos históricos por error.`;
    }
    if (q.includes('atencion') || q.includes('pendiente') || q.includes('prioridad') || q.includes('ahora') || q.includes('siguiente')) {
      const priorities: string[] = [];
      if (snapshot.withoutMaster) priorities.push(`conciliar ${snapshot.withoutMaster} asistentes sin ficha maestra`);
      if (capacityGap) priorities.push(`resolver una brecha de ${capacityGap} cupos en mesas`);
      if (unassigned) priorities.push(`ubicar ${unassigned} fichas asistentes todavía sin mesa`);
      if (snapshot.timelinePending) priorities.push(`cerrar ${snapshot.timelinePending} bloques del cronograma`);
      if (snapshot.budgetMissing) priorities.push(`completar ${snapshot.budgetMissing} ítems presupuestarios`);
      if (snapshot.openIssues) priorities.push(`resolver ${snapshot.openIssues} incidencias abiertas`);
      return priorities.length ? `Priorizaría: ${priorities.slice(0, 4).join('; ')}. Después revisaría Música y Documentos para cerrar dependencias.` : 'No detecto bloqueos operativos principales en las fuentes conectadas.';
    }
    return `Resumen conectado: ${snapshot.knownAttending} asistentes conocidos, ${snapshot.capacity} cupos configurados, ${snapshot.timelinePending} bloques pendientes, saldo presupuestario ${money(snapshot.budgetRemaining)} y ${snapshot.openIssues} incidencias abiertas. Pregúntame por invitados, mesas, presupuesto, cronograma, música o documentos.`;
  }

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !snapshot && !loading) await loadContext();
  }

  function submit(question = input) {
    const text = question.trim();
    if (!text) return;
    setMessages((current) => [...current, { role: 'user', text }, { role: 'assistant', text: answer(text) }]);
    setInput('');
  }

  const quickActions = ['Qué requiere atención', 'Confirmados', 'Mesas y capacidad', 'Presupuesto', 'Cronograma', 'Música'];

  return <>
    <button type="button" className={styles.fab} onClick={toggleOpen} aria-label={open ? 'Cerrar copiloto' : 'Abrir copiloto'}>
      {open ? <X size={19}/> : <><Sparkles size={17}/><span>Copiloto</span></>}
    </button>
    {open && <aside className={styles.panel} aria-label="Copiloto operacional">
      <header className={styles.header}>
        <div className={styles.identity}><span><Bot size={18}/></span><div><strong>Copiloto operacional</strong><small>Datos conectados · solo lectura</small></div></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={17}/></button>
      </header>
      <div className={styles.context}><MessageCircle size={13}/><span>Contexto actual: <strong>{pageLabel}</strong></span>{snapshot && <button type="button" onClick={loadContext} disabled={loading}>{loading ? <Loader2 size={12} className="animate-spin"/> : 'Actualizar'}</button>}</div>
      <div className={styles.messages}>
        {loading && !snapshot && <div className={styles.loading}><Loader2 size={18} className="animate-spin"/><span>Leyendo RSVP, mesas, presupuesto y operación…</span></div>}
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`${styles.message} ${message.role === 'user' ? styles.user : styles.assistant}`}>{message.text}</div>)}
      </div>
      {snapshot && <div className={styles.quick}>{quickActions.map((action) => <button type="button" key={action} onClick={() => submit(action)}>{action}</button>)}</div>}
      <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pregunta por el estado de la boda…" disabled={!snapshot}/>
        <button type="submit" disabled={!snapshot || !input.trim()} aria-label="Enviar"><Send size={15}/></button>
      </form>
      <footer className={styles.footer}><span>No ejecuta cambios ni envía mensajes.</span><Link href="/dashboard/planning" onClick={() => setOpen(false)}>Abrir Planificación <ArrowRight size={12}/></Link></footer>
    </aside>}
  </>;
}
