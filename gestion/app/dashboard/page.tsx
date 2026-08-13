'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import {
  AlertCircle,
  Armchair,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  Grid3X3,
  Loader2,
  Music,
  RefreshCw,
  Sparkles,
  Users,
  Utensils,
  WalletCards,
} from 'lucide-react';
import './home-v2.css';

interface ManagementSummary {
  reconciliationPending: number;
  rsvpResponses: number;
  sheetSynced: number;
  sheetPending: number;
  openIssues: number;
  lastRsvpUpdateAt: string | null;
}

interface ConfirmedSource {
  ok: boolean;
  summary: {
    attending: number;
    declined: number;
    currentKnownAttending: number;
    currentKnownDeclined: number;
    incomingAttending: number;
    incomingDeclined: number;
    currentKnownAssociated: number;
    currentKnownWithoutMaster: number;
    currentKnownDietary: number;
    latestConfirmationName: string | null;
    latestConfirmationAt: string | null;
  };
}

interface BudgetSource {
  ok: boolean;
  items: Array<{ projectedGross: number | null; unitNet: number | null }>;
  summary: { paidOrPrepaid: number | null; remaining: number | null; totalBudget: number | null };
}

interface TimelineSource {
  ok: boolean;
  summary: { total: number; confirmed: number; pending: number };
}

interface MusicSource {
  ok: boolean;
  summary: { moments: number; pendingMoments: number; pendingBudget: number; hasDetailedPlaylist: boolean };
}

interface DocumentsSource {
  ok: boolean;
  summary: { total: number; active: number; reference: number; categories: number };
}

interface TableRow {
  id: string;
  capacity: number;
  table_number: number;
  position_x: number | string;
  position_y: number | string;
}

interface SeatingRow { guest_id: string; table_id: string; }
interface GuestRow { id: string; attendance_status: string; guest_status: string; dietary_type: string | null; table_id: string | null; }
interface IssueRow { id: string; severity: string; issue_type: string; title: string | null; created_at: string; resolved_at: string | null; }

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Por confirmar';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

function shortMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })}M`;
  return money(value);
}

function formatSourceDate(value: string | null) {
  if (!value) return 'Sin dato';
  if (/^\d{4}-\d{2}-\d{2}[ T]/.test(value) && !value.endsWith('Z') && !/[+-]\d\d:\d\d$/.test(value)) return value.replace('T', ' ');
  try {
    return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }).format(new Date(value));
  } catch { return value; }
}

export default function DashboardHome() {
  const [summary, setSummary] = useState<ManagementSummary | null>(null);
  const [official, setOfficial] = useState<ConfirmedSource | null>(null);
  const [budget, setBudget] = useState<BudgetSource | null>(null);
  const [timeline, setTimeline] = useState<TimelineSource | null>(null);
  const [music, setMusic] = useState<MusicSource | null>(null);
  const [documents, setDocuments] = useState<DocumentsSource | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [seating, setSeating] = useState<SeatingRow[]>([]);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const supabase = createClient();
      const [summaryResponse, officialResponse, budgetResponse, timelineResponse, musicResponse, documentsResponse, tablesResult, seatingResult, guestsResult, issuesResult] = await Promise.all([
        fetch('/api/management-summary', { cache: 'no-store' }),
        fetch('/api/confirmed-source', { cache: 'no-store' }),
        fetch('/api/budget-source', { cache: 'no-store' }),
        fetch('/api/timeline-source', { cache: 'no-store' }),
        fetch('/api/music-source', { cache: 'no-store' }),
        fetch('/api/documents-source', { cache: 'no-store' }),
        supabase.from('wedding_tables').select('id, capacity, table_number, position_x, position_y'),
        supabase.from('seating_assignments').select('guest_id, table_id'),
        supabase.from('wedding_guests').select('id, attendance_status, guest_status, dietary_type, table_id'),
        supabase.from('management_issues').select('id, severity, issue_type, title, created_at, resolved_at').is('resolved_at', null).order('created_at', { ascending: false }).limit(8),
      ]);

      const dbErrors = [tablesResult.error, seatingResult.error, guestsResult.error, issuesResult.error].filter(Boolean);
      if (dbErrors.length) throw new Error(dbErrors.map((item) => item?.message).join(' · '));

      const [summaryPayload, officialPayload, budgetPayload, timelinePayload, musicPayload, documentsPayload] = await Promise.all([
        summaryResponse.json().catch(() => null),
        officialResponse.json().catch(() => null),
        budgetResponse.json().catch(() => null),
        timelineResponse.json().catch(() => null),
        musicResponse.json().catch(() => null),
        documentsResponse.json().catch(() => null),
      ]);

      if (!summaryResponse.ok || !summaryPayload?.ok) throw new Error(summaryPayload?.error || 'No fue posible cargar el resumen RSVP.');
      if (!officialResponse.ok || !officialPayload?.ok) throw new Error(officialPayload?.error || 'No fue posible cargar confirmados.');

      setSummary(summaryPayload.summary);
      setOfficial(officialPayload as ConfirmedSource);
      if (budgetResponse.ok && budgetPayload?.ok) setBudget(budgetPayload as BudgetSource);
      if (timelineResponse.ok && timelinePayload?.ok) setTimeline(timelinePayload as TimelineSource);
      if (musicResponse.ok && musicPayload?.ok) setMusic(musicPayload as MusicSource);
      if (documentsResponse.ok && documentsPayload?.ok) setDocuments(documentsPayload as DocumentsSource);
      setTables((tablesResult.data || []) as TableRow[]);
      setSeating((seatingResult.data || []) as SeatingRow[]);
      setGuests((guestsResult.data || []) as GuestRow[]);
      setIssues((issuesResult.data || []) as IssueRow[]);
    } catch (err: any) {
      setError(err?.message || 'No fue posible actualizar el Centro de Gestión.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = window.setInterval(() => loadData(), 60_000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const operational = useMemo(() => {
    const activeGuests = guests.filter((guest) => guest.guest_status === 'active');
    const attending = activeGuests.filter((guest) => guest.attendance_status === 'attending');
    const capacity = tables.reduce((sum, table) => sum + Number(table.capacity || 0), 0);
    const dietary = attending.filter((guest) => guest.dietary_type && guest.dietary_type !== 'Ninguna').length;
    const assignedIds = new Set(seating.map((item) => item.guest_id));
    attending.forEach((guest) => { if (guest.table_id) assignedIds.add(guest.id); });
    const tableNumbers = new Map<number, number>();
    tables.forEach((table) => tableNumbers.set(Number(table.table_number), (tableNumbers.get(Number(table.table_number)) || 0) + 1));
    const duplicateNumbers = Array.from(tableNumbers.values()).filter((count) => count > 1).length;
    let collisions = 0;
    for (let i = 0; i < tables.length; i += 1) {
      for (let j = i + 1; j < tables.length; j += 1) {
        if (Math.abs(Number(tables[i].position_x) - Number(tables[j].position_x)) < 3 && Math.abs(Number(tables[i].position_y) - Number(tables[j].position_y)) < 3) collisions += 1;
      }
    }
    return {
      active: activeGuests.length,
      attending: attending.length,
      capacity,
      dietary,
      assigned: assignedIds.size,
      unassigned: Math.max(0, attending.length - assignedIds.size),
      duplicateNumbers,
      collisions,
    };
  }, [guests, tables, seating]);

  const highPriority = issues.filter((issue) => ['critical', 'high'].includes(issue.severity)).slice(0, 4);
  const sourceHealthy = summary ? summary.sheetPending === 0 : false;
  const curatedAttending = official?.summary.attending ?? 0;
  const currentKnownAttending = official?.summary.currentKnownAttending ?? curatedAttending;
  const currentKnownDeclined = official?.summary.currentKnownDeclined ?? official?.summary.declined ?? 0;
  const incomingAttending = official?.summary.incomingAttending ?? 0;
  const unresolvedMaster = official?.summary.currentKnownWithoutMaster ?? 0;
  const capacityGap = Math.max(0, currentKnownAttending - operational.capacity);
  const missingBudget = (budget?.items || []).filter((item) => item.projectedGross === null || (item.projectedGross === 0 && item.unitNet === null)).length;
  const venueIssues = operational.duplicateNumbers + operational.collisions + (capacityGap > 0 ? 1 : 0);

  return <DashboardLayout><div className="home-v2">
    <section className="home-v2__hero">
      <div><span className="home-v2__eyebrow">Centro de comando</span><h1>Todo lo importante, en una sola vista.</h1><p>Invitados, espacio, cronograma, música, presupuesto y documentos conectados al estado operativo real.</p></div>
      <button type="button" className="home-v2__refresh" onClick={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Actualizando…' : 'Actualizar datos'}</button>
    </section>

    {error && <div className="home-v2__error"><AlertCircle size={17}/><div><strong>No se pudo actualizar</strong><span>{error}</span></div></div>}

    {loading ? <div className="home-v2__loading"><Loader2 className="animate-spin" size={22}/><span>Cargando estado real…</span></div> : <>
      <section className="home-v2__truth">
        <div className="home-v2__truth-main"><span className="home-v2__label">Asistentes conocidos ahora</span><div className="home-v2__truth-number">{currentKnownAttending || '—'}</div><strong>personas confirmadas que asistirán</strong><p><b>{curatedAttending}</b> consolidadas en CONFIRMADOS_ACTUALES{incomingAttending ? ` + ${incomingAttending} RSVP nuevos detectados en Supabase.` : '. Supabase y la hoja curada están alineados.'}</p></div>
        <div className="home-v2__truth-grid">
          <div><span>No asisten</span><strong>{currentKnownDeclined}</strong><small>estado conocido más reciente</small></div>
          <div className={unresolvedMaster > 0 ? 'is-attention' : ''}><span>Sin ficha maestra</span><strong>{unresolvedMaster}</strong><small>no están listos para toda la operación</small></div>
          <div><span>Última confirmación</span><strong className="home-v2__date">{official?.summary.latestConfirmationName || '—'}</strong><small>{formatSourceDate(official?.summary.latestConfirmationAt || null)}</small></div>
          <div><span>Consolidación</span><strong>{incomingAttending ? `${incomingAttending} nueva${incomingAttending === 1 ? '' : 's'}` : 'Al día'}</strong><small>{incomingAttending ? 'pendientes de CONFIRMADOS_ACTUALES' : 'sin delta detectado'}</small></div>
        </div>
      </section>

      <section className="home-v2__section">
        <div className="home-v2__section-head"><div><span className="home-v2__label">Necesita atención</span><h2>Qué resolver ahora</h2></div><Link href="/dashboard/planning">Abrir planificación <ArrowRight size={13}/></Link></div>
        <div className="home-v2__attention-grid">
          <Link href="/dashboard/guests" className="home-v2__attention-card is-primary"><span className="home-v2__attention-icon"><Users size={18}/></span><div><strong>{unresolvedMaster} asistentes sin ficha maestra</strong><p>Son confirmados conocidos que todavía no pueden operar plenamente en mesas, restricciones y automatizaciones.</p></div><ArrowRight size={16}/></Link>
          <Link href="/dashboard/venue" className="home-v2__attention-card"><span className="home-v2__attention-icon"><Grid3X3 size={18}/></span><div><strong>{capacityGap ? `Faltan ${capacityGap} cupos en el salón` : `${operational.capacity - currentKnownAttending} cupos de holgura`}</strong><p>{tables.length} mesas · {operational.capacity} cupos · {venueIssues} observación(es) espaciales detectadas.</p></div><ArrowRight size={16}/></Link>
          <Link href="/dashboard/tables" className="home-v2__attention-card"><span className="home-v2__attention-icon"><Armchair size={18}/></span><div><strong>{operational.unassigned} fichas operativas todavía sin mesa</strong><p>{operational.assigned} de {operational.attending} asistentes con ficha ya tienen asignación.</p></div><ArrowRight size={16}/></Link>
        </div>
      </section>

      <section className="home-v2__section">
        <div className="home-v2__section-head"><div><span className="home-v2__label">Operación</span><h2>Estado de todos los módulos</h2></div></div>
        <div className="home-v2__operation-grid">
          <Link href="/dashboard/guests" className="home-v2__module-card"><div className="home-v2__module-top"><span><Users size={17}/></span><small>Invitados</small></div><strong>{currentKnownAttending}</strong><p>asistentes conocidos</p><div className="home-v2__module-row"><span>{official?.summary.currentKnownAssociated || 0} con ficha</span><span>{official?.summary.currentKnownDietary || 0} restricciones</span></div></Link>
          <Link href="/dashboard/tables" className="home-v2__module-card"><div className="home-v2__module-top"><span><Armchair size={17}/></span><small>Mesas</small></div><strong>{operational.assigned}</strong><p>personas asignadas</p><div className="home-v2__module-row"><span>{operational.unassigned} sin mesa</span><span>{tables.length} mesas</span></div></Link>
          <Link href="/dashboard/venue" className="home-v2__module-card"><div className="home-v2__module-top"><span><Grid3X3 size={17}/></span><small>Salón</small></div><strong>{operational.capacity}</strong><p>cupos configurados</p><div className="home-v2__module-row"><span>{capacityGap ? `${capacityGap} faltan` : 'capacidad suficiente'}</span><span>{venueIssues} alertas</span></div></Link>
          <Link href="/dashboard/planning" className="home-v2__module-card"><div className="home-v2__module-top"><span><Sparkles size={17}/></span><small>Planificación</small></div><strong>{(summary?.openIssues || 0) + (timeline?.summary.pending || 0) + missingBudget}</strong><p>señales abiertas</p><div className="home-v2__module-row"><span>{summary?.openIssues || 0} incidencias</span><span>{timeline?.summary.pending || 0} cronograma</span></div></Link>
          <Link href="/dashboard/timeline" className="home-v2__module-card"><div className="home-v2__module-top"><span><CalendarDays size={17}/></span><small>Cronograma</small></div><strong>{timeline?.summary.confirmed || 0}/{timeline?.summary.total || 0}</strong><p>bloques confirmados</p><div className="home-v2__module-row"><span>{timeline?.summary.pending || 0} pendientes</span><span>día del evento</span></div></Link>
          <Link href="/dashboard/music" className="home-v2__module-card"><div className="home-v2__module-top"><span><Music size={17}/></span><small>Música</small></div><strong>{music?.summary.moments || 0}</strong><p>momentos detectados</p><div className="home-v2__module-row"><span>{music?.summary.pendingMoments || 0} pendientes</span><span>{music?.summary.hasDetailedPlaylist ? 'repertorio cargado' : 'playlist por construir'}</span></div></Link>
          <Link href="/dashboard/finance" className="home-v2__module-card"><div className="home-v2__module-top"><span><DollarSign size={17}/></span><small>Presupuesto</small></div><strong className="home-v2__money">{shortMoney(budget?.summary.totalBudget)}</strong><p>presupuesto operativo</p><div className="home-v2__module-row"><span>{shortMoney(budget?.summary.remaining)} faltante</span><span>{missingBudget} montos incompletos</span></div></Link>
          <Link href="/dashboard/documents" className="home-v2__module-card"><div className="home-v2__module-top"><span><FileText size={17}/></span><small>Documentos</small></div><strong>{documents?.summary.total || 0}</strong><p>fuentes registradas</p><div className="home-v2__module-row"><span>{documents?.summary.active || 0} activas</span><span>{documents?.summary.reference || 0} referencia</span></div></Link>
        </div>
      </section>

      <section className="home-v2__bottom-grid">
        <div className="home-v2__panel">
          <div className="home-v2__panel-head"><div><span className="home-v2__label">Incidencias recientes</span><h3>Prioridad operativa</h3></div><Link href="/dashboard/issues">Abrir</Link></div>
          <div className="home-v2__issue-list">{(highPriority.length ? highPriority : issues.slice(0, 4)).map((issue) => <Link href="/dashboard/issues" key={issue.id} className="home-v2__issue"><span className={`home-v2__issue-dot is-${issue.severity}`}/><div><strong>{issue.title || issue.issue_type}</strong><small>{issue.issue_type}</small></div><ArrowRight size={13}/></Link>)}{!issues.length && <div className="home-v2__empty"><CheckCircle2 size={18}/><span>No hay incidencias abiertas.</span></div>}</div>
        </div>
        <div className="home-v2__panel">
          <div className="home-v2__panel-head"><div><span className="home-v2__label">Fuentes</span><h3>Salud del sistema</h3></div></div>
          <div className="home-v2__signals">
            <div><span><CheckCircle2 size={15}/></span><div><strong>Confirmados</strong><small>{curatedAttending} consolidados + {incomingAttending} live</small></div></div>
            <div><span><Clock3 size={15}/></span><div><strong>Conciliación</strong><small>{unresolvedMaster} asistentes sin ficha maestra</small></div></div>
            <div><span><Utensils size={15}/></span><div><strong>Restricciones</strong><small>{official?.summary.currentKnownDietary || 0} registradas entre asistentes conocidos</small></div></div>
            <div><span><WalletCards size={15}/></span><div><strong>RSVP → Sheets</strong><small>{sourceHealthy ? 'sincronización técnica al día' : `${summary?.sheetPending || 0} pendientes técnicos`}</small></div></div>
          </div>
        </div>
      </section>
    </>}
  </div></DashboardLayout>;
}
