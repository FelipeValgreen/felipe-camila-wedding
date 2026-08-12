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

interface TableRow { id: string; capacity: number; }
interface SeatingRow { id: string; }
interface GuestRow { attendance_status: string; guest_status: string; dietary_type: string | null; table_id: string | null; }
interface ExpenseRow { total_amount: number | null; due_date: string | null; payment_status: string | null; }
interface PaymentRow { amount: number | null; status: string | null; }
interface IssueRow { id: string; severity: string; issue_type: string; title: string | null; created_at: string; resolved_at: string | null; }

function money(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);
}

function shortMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })}M`;
  return money(value);
}

function formatDate(value: string | null) {
  if (!value) return 'Sin dato';
  try {
    return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }).format(new Date(value));
  } catch { return 'Actualizado'; }
}

export default function DashboardHome() {
  const [summary, setSummary] = useState<ManagementSummary | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [seating, setSeating] = useState<SeatingRow[]>([]);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const supabase = createClient();
      const [summaryResponse, tablesResult, seatingResult, guestsResult, expensesResult, paymentsResult, issuesResult] = await Promise.all([
        fetch('/api/management-summary', { cache: 'no-store' }),
        supabase.from('wedding_tables').select('id, capacity'),
        supabase.from('seating_assignments').select('id'),
        supabase.from('wedding_guests').select('attendance_status, guest_status, dietary_type, table_id'),
        supabase.from('expenses').select('total_amount, due_date, payment_status'),
        supabase.from('expense_payments').select('amount, status'),
        supabase.from('management_issues').select('id, severity, issue_type, title, created_at, resolved_at').is('resolved_at', null).order('created_at', { ascending: false }).limit(8),
      ]);
      const dbErrors = [tablesResult.error, seatingResult.error, guestsResult.error, expensesResult.error, paymentsResult.error, issuesResult.error].filter(Boolean);
      if (dbErrors.length) throw new Error(dbErrors.map((item) => item?.message).join(' · '));
      const summaryPayload = await summaryResponse.json().catch(() => null);
      if (!summaryResponse.ok || !summaryPayload?.ok) throw new Error(summaryPayload?.error || 'No fue posible cargar el resumen de RSVP.');
      setSummary(summaryPayload.summary);
      setTables((tablesResult.data || []) as TableRow[]);
      setSeating((seatingResult.data || []) as SeatingRow[]);
      setGuests((guestsResult.data || []) as GuestRow[]);
      setExpenses((expensesResult.data || []) as ExpenseRow[]);
      setPayments((paymentsResult.data || []) as PaymentRow[]);
      setIssues((issuesResult.data || []) as IssueRow[]);
    } catch (err: any) {
      setError(err?.message || 'No fue posible actualizar el Centro de Gestión.');
    } finally {
      setLoading(false); setRefreshing(false);
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
    const contracted = expenses.reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0);
    const paid = payments.filter((payment) => payment.status === 'Pagado').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const now = new Date();
    const nextThirty = new Date(now); nextThirty.setDate(now.getDate() + 30);
    const upcoming = expenses.filter((expense) => {
      if (!expense.due_date || expense.payment_status === 'Pagado') return false;
      const due = new Date(expense.due_date);
      return due >= now && due <= nextThirty;
    }).length;
    return { active: activeGuests.length, attending: attending.length, capacity, dietary, noTable, contracted, paid, balance: contracted - paid, upcoming };
  }, [guests, tables, expenses, payments]);

  const highPriority = issues.filter((issue) => ['critical','high'].includes(issue.severity)).slice(0, 4);
  const sourceHealthy = summary ? summary.sheetPending === 0 : false;

  return (
    <DashboardLayout>
      <div className="home-v2">
        <section className="home-v2__hero">
          <div>
            <span className="home-v2__eyebrow">Centro de comando</span>
            <h1>Todo lo importante, en una sola vista.</h1>
            <p>Personas, decisiones, mesas y presupuesto conectados sin convertir un dato parcial en una certeza.</p>
          </div>
          <button type="button" className="home-v2__refresh" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Actualizando…' : 'Actualizar datos'}
          </button>
        </section>

        {error && <div className="home-v2__error"><AlertCircle size={17}/><div><strong>No se pudo actualizar</strong><span>{error}</span></div></div>}

        {loading ? <div className="home-v2__loading"><Loader2 className="animate-spin" size={22}/><span>Cargando estado real…</span></div> : <>
          <section className="home-v2__truth">
            <div className="home-v2__truth-main">
              <span className="home-v2__label">Estado de confirmaciones</span>
              <div className="home-v2__truth-number">{summary?.rsvpAttending ?? '—'}</div>
              <strong>personas asistentes integradas al flujo RSVP</strong>
              <p>Este número refleja lo que hoy está integrado en Supabase/Sheets. No lo mostramos como “total oficial” mientras exista una lista nominal más reciente pendiente de consolidar.</p>
            </div>
            <div className="home-v2__truth-grid">
              <div><span>Fichas operativas</span><strong>{operational.attending}</strong><small>asistentes ya conciliados</small></div>
              <div className={(summary?.reconciliationPending || 0) > 0 ? 'is-attention' : ''}><span>Por conciliar</span><strong>{summary?.reconciliationPending ?? 0}</strong><small>personas del RSVP integrado</small></div>
              <div><span>Sheets</span><strong>{summary ? `${summary.sheetSynced}/${summary.rsvpResponses}` : '—'}</strong><small>{sourceHealthy ? 'sincronizado' : `${summary?.sheetPending || 0} pendientes`}</small></div>
              <div><span>Última integración</span><strong className="home-v2__date">{formatDate(summary?.lastRsvpUpdateAt || null)}</strong><small>hora Santiago</small></div>
            </div>
          </section>

          <section className="home-v2__section">
            <div className="home-v2__section-head"><div><span className="home-v2__label">Necesita atención</span><h2>Qué resolver ahora</h2></div><Link href="/dashboard/issues">Ver todo <ArrowRight size={13}/></Link></div>
            <div className="home-v2__attention-grid">
              <Link href="/dashboard/issues" className="home-v2__attention-card is-primary"><span className="home-v2__attention-icon"><Users size={18}/></span><div><strong>{summary?.reconciliationPending ?? 0} personas por conciliar</strong><p>Resolver estas fichas aumenta el universo realmente utilizable para mesas, restricciones y operación.</p></div><ArrowRight size={16}/></Link>
              <Link href="/dashboard/tables" className="home-v2__attention-card"><span className="home-v2__attention-icon"><Armchair size={18}/></span><div><strong>{operational.noTable} asistentes sin mesa</strong><p>{seating.length} asignaciones persistidas · {operational.capacity} cupos configurados.</p></div><ArrowRight size={16}/></Link>
              <Link href="/dashboard/finance" className="home-v2__attention-card"><span className="home-v2__attention-icon"><WalletCards size={18}/></span><div><strong>{operational.upcoming} pagos próximos</strong><p>Saldo comprometido: {shortMoney(Math.max(0, operational.balance))}.</p></div><ArrowRight size={16}/></Link>
            </div>
          </section>

          <section className="home-v2__section">
            <div className="home-v2__section-head"><div><span className="home-v2__label">Operación</span><h2>Estado de la boda</h2></div></div>
            <div className="home-v2__operation-grid">
              <Link href="/dashboard/guests" className="home-v2__module-card"><div className="home-v2__module-top"><span><Users size={17}/></span><small>Invitados</small></div><strong>{operational.active}</strong><p>fichas activas</p><div className="home-v2__module-row"><span>{operational.attending} asisten en ficha</span><span>{operational.dietary} restricciones</span></div></Link>
              <Link href="/dashboard/tables" className="home-v2__module-card"><div className="home-v2__module-top"><span><Armchair size={17}/></span><small>Mesas y salón</small></div><strong>{tables.length}</strong><p>mesas configuradas</p><div className="home-v2__module-row"><span>{operational.capacity} cupos</span><span>{seating.length} sentados</span></div></Link>
              <Link href="/dashboard/finance" className="home-v2__module-card"><div className="home-v2__module-top"><span><DollarSign size={17}/></span><small>Presupuesto</small></div><strong className="home-v2__money">{shortMoney(operational.contracted)}</strong><p>comprometido</p><div className="home-v2__module-row"><span>{shortMoney(operational.paid)} pagado</span><span>{shortMoney(Math.max(0, operational.balance))} saldo</span></div></Link>
              <Link href="/dashboard/issues" className="home-v2__module-card"><div className="home-v2__module-top"><span><AlertCircle size={17}/></span><small>Incidencias</small></div><strong>{summary?.openIssues ?? 0}</strong><p>abiertas</p><div className="home-v2__module-row"><span>{highPriority.length} prioritarias visibles</span><span>revisar</span></div></Link>
            </div>
          </section>

          <section className="home-v2__bottom-grid">
            <div className="home-v2__panel">
              <div className="home-v2__panel-head"><div><span className="home-v2__label">Incidencias recientes</span><h3>Prioridad operativa</h3></div><Link href="/dashboard/issues">Abrir</Link></div>
              <div className="home-v2__issue-list">
                {(highPriority.length ? highPriority : issues.slice(0,4)).map((issue) => <Link href="/dashboard/issues" key={issue.id} className="home-v2__issue"><span className={`home-v2__issue-dot is-${issue.severity}`}/><div><strong>{issue.title || issue.issue_type}</strong><small>{issue.issue_type}</small></div><ArrowRight size={13}/></Link>)}
                {!issues.length && <div className="home-v2__empty"><CheckCircle2 size={18}/><span>No hay incidencias abiertas.</span></div>}
              </div>
            </div>
            <div className="home-v2__panel">
              <div className="home-v2__panel-head"><div><span className="home-v2__label">Preparación</span><h3>Señales rápidas</h3></div></div>
              <div className="home-v2__signals">
                <div><span><CheckCircle2 size={15}/></span><div><strong>RSVP → Sheets</strong><small>{sourceHealthy ? 'Sincronización al día' : 'Hay pendientes de sincronización'}</small></div></div>
                <div><span><Clock3 size={15}/></span><div><strong>Conciliación</strong><small>{summary?.reconciliationPending || 0} personas requieren trabajo humano</small></div></div>
                <div><span><Utensils size={15}/></span><div><strong>Restricciones</strong><small>{operational.dietary} fichas operativas con restricción</small></div></div>
                <div><span><Armchair size={15}/></span><div><strong>Distribución</strong><small>{operational.noTable} asistentes conciliados aún sin mesa</small></div></div>
              </div>
            </div>
          </section>
        </>}
      </div>
    </DashboardLayout>
  );
}
