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
  CheckCircle2,
  Clock3,
  DollarSign,
  Loader2,
  RefreshCw,
  Users,
  Utensils,
  WalletCards,
} from 'lucide-react';
import './home-v2.css';

interface ManagementSummary {
  rsvpAttending: number;
  rsvpDeclined: number;
  rsvpPending: number;
  rsvpPeopleIntegrated: number;
  rsvpMatched: number;
  rsvpNeedsReview: number;
  rsvpUnmatched: number;
  reconciliationPending: number;
  rsvpResponses: number;
  sheetSynced: number;
  sheetPending: number;
  activeGuests: number;
  activeAttendingGuests: number;
  activeDeclinedGuests: number;
  activePendingGuests: number;
  openIssues: number;
  lastRsvpUpdateAt: string | null;
  lastResponseAt: string | null;
  countSemantics: string;
}

interface ConfirmedSource {
  ok: boolean;
  source: string;
  summary: {
    attending: number;
    declined: number;
    totalResponsesPeople: number;
    associated: number;
    withoutMasterRecord: number;
    dietary: number;
    latestConfirmationName: string | null;
    latestConfirmationAt: string | null;
  };
}

interface BudgetSource {
  ok: boolean;
  source: string;
  summary: {
    paidOrPrepaid: number | null;
    remaining: number | null;
    totalBudget: number | null;
  };
}

interface TableRow { id: string; capacity: number; }
interface SeatingRow { id: string; }
interface GuestRow { attendance_status: string; guest_status: string; dietary_type: string | null; table_id: string | null; }
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
  if (/^\d{4}-\d{2}-\d{2}[ T]/.test(value) && !value.endsWith('Z') && !/[+-]\d\d:\d\d$/.test(value)) {
    return value.replace('T', ' ');
  }
  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function DashboardHome() {
  const [summary, setSummary] = useState<ManagementSummary | null>(null);
  const [official, setOfficial] = useState<ConfirmedSource | null>(null);
  const [budget, setBudget] = useState<BudgetSource | null>(null);
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
      const [summaryResponse, officialResponse, budgetResponse, tablesResult, seatingResult, guestsResult, issuesResult] = await Promise.all([
        fetch('/api/management-summary', { cache: 'no-store' }),
        fetch('/api/confirmed-source', { cache: 'no-store' }),
        fetch('/api/budget-source', { cache: 'no-store' }),
        supabase.from('wedding_tables').select('id, capacity'),
        supabase.from('seating_assignments').select('id'),
        supabase.from('wedding_guests').select('attendance_status, guest_status, dietary_type, table_id'),
        supabase.from('management_issues').select('id, severity, issue_type, title, created_at, resolved_at').is('resolved_at', null).order('created_at', { ascending: false }).limit(8),
      ]);

      const dbErrors = [tablesResult.error, seatingResult.error, guestsResult.error, issuesResult.error].filter(Boolean);
      if (dbErrors.length) throw new Error(dbErrors.map((item) => item?.message).join(' · '));

      const [summaryPayload, officialPayload, budgetPayload] = await Promise.all([
        summaryResponse.json().catch(() => null),
        officialResponse.json().catch(() => null),
        budgetResponse.json().catch(() => null),
      ]);

      if (!summaryResponse.ok || !summaryPayload?.ok) throw new Error(summaryPayload?.error || 'No fue posible cargar el resumen RSVP.');
      if (!officialResponse.ok || !officialPayload?.ok) throw new Error(officialPayload?.error || 'No fue posible cargar CONFIRMADOS_ACTUALES.');

      setSummary(summaryPayload.summary);
      setOfficial(officialPayload as ConfirmedSource);
      if (budgetResponse.ok && budgetPayload?.ok) setBudget(budgetPayload as BudgetSource);
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
    const noTable = attending.filter((guest) => !guest.table_id).length;
    return { active: activeGuests.length, attending: attending.length, capacity, dietary, noTable };
  }, [guests, tables]);

  const highPriority = issues.filter((issue) => ['critical', 'high'].includes(issue.severity)).slice(0, 4);
  const sourceHealthy = summary ? summary.sheetPending === 0 : false;
  const officialAttending = official?.summary.attending ?? 0;
  const officialDeclined = official?.summary.declined ?? 0;
  const unresolvedMaster = official?.summary.withoutMasterRecord ?? 0;
  const assignedOfficialGap = Math.max(0, officialAttending - seating.length);

  return (
    <DashboardLayout>
      <div className="home-v2">
        <section className="home-v2__hero">
          <div>
            <span className="home-v2__eyebrow">Centro de comando</span>
            <h1>Todo lo importante, en una sola vista.</h1>
            <p>Confirmados oficiales, conciliación, mesas y presupuesto conectados a las fuentes operativas actuales.</p>
          </div>
          <button type="button" className="home-v2__refresh" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Actualizando…' : 'Actualizar datos'}
          </button>
        </section>

        {error && <div className="home-v2__error"><AlertCircle size={17}/><div><strong>No se pudo actualizar</strong><span>{error}</span></div></div>}

        {loading ? <div className="home-v2__loading"><Loader2 className="animate-spin" size={22}/><span>Cargando estado real…</span></div> : <>
          <section className="home-v2__truth">
            <div className="home-v2__truth-main">
              <span className="home-v2__label">Confirmados oficiales</span>
              <div className="home-v2__truth-number">{officialAttending || '—'}</div>
              <strong>personas confirmadas que asistirán</strong>
              <p>Fuente oficial: <b>CONFIRMADOS_ACTUALES</b>. Los RSVP conjuntos ya están desdoblados por persona y este total se actualiza directamente desde la hoja operativa.</p>
            </div>
            <div className="home-v2__truth-grid">
              <div><span>No asisten</span><strong>{officialDeclined}</strong><small>personas informadas como baja</small></div>
              <div className={unresolvedMaster > 0 ? 'is-attention' : ''}><span>Sin ficha maestra</span><strong>{unresolvedMaster}</strong><small>confirmados oficiales todavía por conciliar</small></div>
              <div><span>Última confirmación</span><strong className="home-v2__date">{official?.summary.latestConfirmationName || '—'}</strong><small>{formatSourceDate(official?.summary.latestConfirmationAt || null)}</small></div>
              <div><span>RSVP → Sheets</span><strong>{summary ? `${summary.sheetSynced}/${summary.rsvpResponses}` : '—'}</strong><small>{sourceHealthy ? 'sincronización al día' : `${summary?.sheetPending || 0} pendientes`}</small></div>
            </div>
          </section>

          <section className="home-v2__section">
            <div className="home-v2__section-head"><div><span className="home-v2__label">Necesita atención</span><h2>Qué resolver ahora</h2></div><Link href="/dashboard/issues">Ver todo <ArrowRight size={13}/></Link></div>
            <div className="home-v2__attention-grid">
              <Link href="/dashboard/guests" className="home-v2__attention-card is-primary"><span className="home-v2__attention-icon"><Users size={18}/></span><div><strong>{unresolvedMaster} confirmados sin ficha maestra</strong><p>Son personas oficiales que todavía no pueden participar plenamente en mesas, restricciones y automatizaciones del sistema.</p></div><ArrowRight size={16}/></Link>
              <Link href="/dashboard/tables" className="home-v2__attention-card"><span className="home-v2__attention-icon"><Armchair size={18}/></span><div><strong>{assignedOfficialGap} confirmados aún sin asiento persistido</strong><p>{seating.length} asignaciones guardadas · {operational.capacity} cupos configurados.</p></div><ArrowRight size={16}/></Link>
              <Link href="/dashboard/finance" className="home-v2__attention-card"><span className="home-v2__attention-icon"><WalletCards size={18}/></span><div><strong>{shortMoney(budget?.summary.remaining)} por pagar</strong><p>Presupuesto oficial: {shortMoney(budget?.summary.totalBudget)} · pagado/prepagado {shortMoney(budget?.summary.paidOrPrepaid)}.</p></div><ArrowRight size={16}/></Link>
            </div>
          </section>

          <section className="home-v2__section">
            <div className="home-v2__section-head"><div><span className="home-v2__label">Operación</span><h2>Estado de la boda</h2></div></div>
            <div className="home-v2__operation-grid">
              <Link href="/dashboard/guests" className="home-v2__module-card"><div className="home-v2__module-top"><span><Users size={17}/></span><small>Invitados</small></div><strong>{officialAttending}</strong><p>confirmados oficiales</p><div className="home-v2__module-row"><span>{official?.summary.associated || 0} con ficha asociada</span><span>{official?.summary.dietary || 0} restricciones</span></div></Link>
              <Link href="/dashboard/tables" className="home-v2__module-card"><div className="home-v2__module-top"><span><Armchair size={17}/></span><small>Mesas y salón</small></div><strong>{tables.length}</strong><p>mesas configuradas</p><div className="home-v2__module-row"><span>{operational.capacity} cupos</span><span>{seating.length} sentados</span></div></Link>
              <Link href="/dashboard/finance" className="home-v2__module-card"><div className="home-v2__module-top"><span><DollarSign size={17}/></span><small>Presupuesto</small></div><strong className="home-v2__money">{shortMoney(budget?.summary.totalBudget)}</strong><p>presupuesto operativo</p><div className="home-v2__module-row"><span>{shortMoney(budget?.summary.paidOrPrepaid)} pagado</span><span>{shortMoney(budget?.summary.remaining)} faltante</span></div></Link>
              <Link href="/dashboard/issues" className="home-v2__module-card"><div className="home-v2__module-top"><span><AlertCircle size={17}/></span><small>Incidencias</small></div><strong>{summary?.openIssues ?? 0}</strong><p>abiertas</p><div className="home-v2__module-row"><span>{summary?.reconciliationPending || 0} RSVP por conciliar</span><span>revisar</span></div></Link>
            </div>
          </section>

          <section className="home-v2__bottom-grid">
            <div className="home-v2__panel">
              <div className="home-v2__panel-head"><div><span className="home-v2__label">Incidencias recientes</span><h3>Prioridad operativa</h3></div><Link href="/dashboard/issues">Abrir</Link></div>
              <div className="home-v2__issue-list">
                {(highPriority.length ? highPriority : issues.slice(0, 4)).map((issue) => <Link href="/dashboard/issues" key={issue.id} className="home-v2__issue"><span className={`home-v2__issue-dot is-${issue.severity}`}/><div><strong>{issue.title || issue.issue_type}</strong><small>{issue.issue_type}</small></div><ArrowRight size={13}/></Link>)}
                {!issues.length && <div className="home-v2__empty"><CheckCircle2 size={18}/><span>No hay incidencias abiertas.</span></div>}
              </div>
            </div>
            <div className="home-v2__panel">
              <div className="home-v2__panel-head"><div><span className="home-v2__label">Preparación</span><h3>Señales rápidas</h3></div></div>
              <div className="home-v2__signals">
                <div><span><CheckCircle2 size={15}/></span><div><strong>Confirmados oficiales</strong><small>{officialAttending} asisten · {officialDeclined} no asisten</small></div></div>
                <div><span><Clock3 size={15}/></span><div><strong>Conciliación</strong><small>{unresolvedMaster} confirmados todavía sin ficha maestra</small></div></div>
                <div><span><Utensils size={15}/></span><div><strong>Restricciones</strong><small>{official?.summary.dietary || 0} confirmados con restricción registrada</small></div></div>
                <div><span><Armchair size={15}/></span><div><strong>Distribución</strong><small>{assignedOfficialGap} confirmados sin asiento persistido</small></div></div>
              </div>
            </div>
          </section>
        </>}
      </div>
    </DashboardLayout>
  );
}
