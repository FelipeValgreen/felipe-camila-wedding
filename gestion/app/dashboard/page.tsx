'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import {
  AlertCircle,
  AlertTriangle,
  Armchair,
  CheckCircle2,
  Clock,
  Database,
  DollarSign,
  RefreshCw,
  Users,
  XCircle
} from 'lucide-react';

type SummaryStatus =
  | 'matched'
  | 'split_matched'
  | 'partially_matched'
  | 'unmatched'
  | 'ambiguous'
  | 'conflict'
  | string;

interface GuestRow {
  guest_status: string;
  invitation_status: string;
  attendance_status: string;
  dietary_type: string | null;
  table_id: string | null;
  reconfirmation_status: string;
}

interface RsvpSummaryRow {
  rsvp_id: string;
  attendance_status: string;
  reconciliation_status: SummaryStatus;
  sheet_sync_status: string;
  member_count: number;
  matched_member_count: number;
  pending_member_count: number;
}

interface IssueRow {
  severity: string;
  issue_type: string;
  status: string;
}

interface OutboxRow {
  status: string;
}

interface TableRow {
  capacity: number;
}

interface ExpenseRow {
  total_amount: number | null;
  due_date: string | null;
  payment_status: string | null;
}

interface PaymentRow {
  amount: number | null;
  status: string | null;
}

const EMPTY_STATS = {
  activeGuests: 0,
  invitationsSent: 0,
  responsesReceived: 0,
  attendingResponses: 0,
  confirmedPeople: 0,
  declinedPeople: 0,
  pendingPeople: 0,
  reconciledResponses: 0,
  individualMatches: 0,
  jointMatches: 0,
  reviewResponses: 0,
  partiallyMatched: 0,
  openIssues: 0,
  criticalIssues: 0,
  sheetSyncFailed: 0,
  outboxPending: 0,
  outboxFailed: 0,
  outboxProcessed: 0,
  confirmedNoTable: 0,
  configuredCapacity: 0,
  seatingAssignments: 0,
  dietaryFlags: 0,
  reconfirmationPending: 0,
  totalContracted: 0,
  totalPaid: 0,
  incompleteAmounts: 0,
  upcomingPayments: 0,
  overduePayments: 0
};

function money(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(value || 0);
}

export default function DashboardResumen() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadStats = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setLoadError(null);

    try {
      const supabase = createClient();
      const [
        guestsResult,
        rsvpsResult,
        issuesResult,
        outboxResult,
        tablesResult,
        seatingResult,
        expensesResult,
        paymentsResult
      ] = await Promise.all([
        supabase
          .from('wedding_guests')
          .select('guest_status, invitation_status, attendance_status, dietary_type, table_id, reconfirmation_status'),
        supabase
          .from('rsvp_management_summary')
          .select('rsvp_id, attendance_status, reconciliation_status, sheet_sync_status, member_count, matched_member_count, pending_member_count'),
        supabase
          .from('management_issues')
          .select('severity, issue_type, status')
          .eq('status', 'open'),
        supabase.from('sync_outbox').select('status'),
        supabase.from('wedding_tables').select('capacity'),
        supabase.from('seating_assignments').select('id'),
        supabase.from('expenses').select('total_amount, due_date, payment_status'),
        supabase.from('expense_payments').select('amount, status')
      ]);

      const queryErrors = [
        guestsResult.error,
        rsvpsResult.error,
        issuesResult.error,
        outboxResult.error,
        tablesResult.error,
        seatingResult.error,
        expensesResult.error,
        paymentsResult.error
      ].filter(Boolean);

      if (queryErrors.length > 0) {
        throw new Error(queryErrors.map(error => error?.message).join(' · '));
      }

      const guests = (guestsResult.data || []) as GuestRow[];
      const rsvps = (rsvpsResult.data || []) as RsvpSummaryRow[];
      const issues = (issuesResult.data || []) as IssueRow[];
      const outbox = (outboxResult.data || []) as OutboxRow[];
      const tables = (tablesResult.data || []) as TableRow[];
      const expenses = (expensesResult.data || []) as ExpenseRow[];
      const payments = (paymentsResult.data || []) as PaymentRow[];

      const activeGuests = guests.filter(guest => guest.guest_status === 'active');
      const confirmedPeople = activeGuests.filter(guest => guest.attendance_status === 'attending').length;
      const declinedPeople = activeGuests.filter(guest => guest.attendance_status === 'not_attending').length;
      const pendingPeople = activeGuests.filter(guest => guest.attendance_status === 'pending').length;

      const individualMatches = rsvps.filter(
        rsvp => rsvp.reconciliation_status === 'matched' && rsvp.pending_member_count === 0
      ).length;
      const jointMatches = rsvps.filter(
        rsvp => rsvp.reconciliation_status === 'split_matched' && rsvp.pending_member_count === 0
      ).length;
      const partiallyMatched = rsvps.filter(
        rsvp => rsvp.reconciliation_status === 'partially_matched'
      ).length;
      const reviewResponses = rsvps.filter(rsvp =>
        rsvp.pending_member_count > 0 ||
        ['unmatched', 'partially_matched', 'ambiguous', 'conflict'].includes(rsvp.reconciliation_status)
      ).length;

      const configuredCapacity = tables.reduce(
        (sum, table) => sum + (Number(table.capacity) || 0),
        0
      );
      const totalContracted = expenses.reduce(
        (sum, expense) => sum + (Number(expense.total_amount) || 0),
        0
      );
      const totalPaid = payments
        .filter(payment => payment.status === 'Pagado')
        .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

      const now = new Date();
      const inThirtyDays = new Date(now);
      inThirtyDays.setDate(now.getDate() + 30);
      let upcomingPayments = 0;
      let overduePayments = 0;

      expenses.forEach(expense => {
        if (!expense.due_date || expense.payment_status === 'Pagado') return;
        const dueDate = new Date(expense.due_date);
        if (dueDate < now) overduePayments++;
        else if (dueDate <= inThirtyDays) upcomingPayments++;
      });

      setStats({
        activeGuests: activeGuests.length,
        invitationsSent: activeGuests.filter(guest => guest.invitation_status !== 'not_sent').length,
        responsesReceived: rsvps.length,
        attendingResponses: rsvps.filter(rsvp => rsvp.attendance_status === 'attending').length,
        confirmedPeople,
        declinedPeople,
        pendingPeople,
        reconciledResponses: individualMatches + jointMatches,
        individualMatches,
        jointMatches,
        reviewResponses,
        partiallyMatched,
        openIssues: issues.length,
        criticalIssues: issues.filter(issue => issue.severity === 'critical').length,
        sheetSyncFailed: rsvps.filter(rsvp => rsvp.sheet_sync_status === 'failed').length,
        outboxPending: outbox.filter(item => item.status === 'pending' || item.status === 'processing').length,
        outboxFailed: outbox.filter(item => item.status === 'failed').length,
        outboxProcessed: outbox.filter(item => item.status === 'processed').length,
        confirmedNoTable: activeGuests.filter(
          guest => guest.attendance_status === 'attending' && !guest.table_id
        ).length,
        configuredCapacity,
        seatingAssignments: seatingResult.data?.length || 0,
        dietaryFlags: activeGuests.filter(
          guest => guest.dietary_type && guest.dietary_type !== 'Ninguna'
        ).length,
        reconfirmationPending: activeGuests.filter(
          guest => guest.reconfirmation_status === 'pending'
        ).length,
        totalContracted,
        totalPaid,
        incompleteAmounts: expenses.filter(expense => expense.total_amount === null).length,
        upcomingPayments,
        overduePayments
      });
      setLastUpdatedAt(new Date());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No fue posible actualizar el resumen.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = window.setInterval(() => loadStats(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadStats();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadStats]);

  const capacityDifference = stats.configuredCapacity - stats.confirmedPeople;
  const balance = stats.totalContracted - stats.totalPaid;
  const hasOperationalAlert =
    stats.reviewResponses > 0 ||
    stats.criticalIssues > 0 ||
    stats.sheetSyncFailed > 0 ||
    stats.outboxPending > 0 ||
    stats.outboxFailed > 0 ||
    stats.configuredCapacity < stats.confirmedPeople;

  const reconciliationText = useMemo(() => {
    return `${stats.individualMatches} individuales · ${stats.jointMatches} conjuntas`;
  }, [stats.individualMatches, stats.jointMatches]);

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <header className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent-gold)]">
              Resumen operativo en vivo
            </span>
            <h1 className="mt-1 font-serif text-3xl text-[var(--text-primary)]">Centro de Comandos F&C</h1>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Supabase es la fuente canónica · Google Sheets funciona como espejo operativo.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs sm:block">
              <strong className="block">23 de octubre de 2026</strong>
              <span className="text-[var(--text-muted)]">
                {lastUpdatedAt
                  ? `Actualizado ${lastUpdatedAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : 'Esperando actualización'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => loadStats(true)}
              disabled={refreshing}
              className="btn-secondary flex items-center gap-2 text-xs disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Actualizando' : 'Actualizar'}
            </button>
          </div>
        </header>

        {loadError && (
          <div className="flex items-start gap-3 border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div><strong className="block">No se pudo actualizar el dashboard</strong>{loadError}</div>
          </div>
        )}

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Invitados y respuestas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2"><Users size={14} /> Invitados activos</span>
              <div className="kpi-value">{loading ? '…' : stats.activeGuests}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">
                {stats.invitationsSent} invitaciones enviadas · {stats.responsesReceived} respuestas web
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2 text-emerald-800"><CheckCircle2 size={14} /> Personas confirmadas</span>
              <div className="kpi-value text-emerald-800">{loading ? '…' : stats.confirmedPeople}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">
                {stats.attendingResponses} respuestas afirmativas · {stats.dietaryFlags} restricciones
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2"><XCircle size={14} /> No asisten</span>
              <div className="kpi-value">{loading ? '…' : stats.declinedPeople}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">Personas individuales en la nómina canónica</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2 text-amber-800"><Clock size={14} /> Pendientes</span>
              <div className="kpi-value text-amber-800">{loading ? '…' : stats.pendingPeople}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">{stats.reconfirmationPending} reconfirmaciones pendientes</span>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Calidad de datos y sincronización
            </h2>
            <Link href="/dashboard/issues" className="text-xs font-semibold underline">Abrir incidencias</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2"><CheckCircle2 size={14} /> RSVP conciliados</span>
              <div className="kpi-value">{loading ? '…' : stats.reconciledResponses}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">{reconciliationText}</span>
            </div>
            <div className={`kpi-card ${stats.reviewResponses > 0 ? 'border-amber-500/50' : ''}`}>
              <span className="kpi-title flex items-center gap-2 text-amber-800"><AlertTriangle size={14} /> Requieren revisión</span>
              <div className="kpi-value text-amber-800">{loading ? '…' : stats.reviewResponses}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">
                {stats.partiallyMatched} parciales · {stats.criticalIssues} críticas
              </span>
            </div>
            <div className={`kpi-card ${stats.sheetSyncFailed > 0 || stats.outboxPending > 0 || stats.outboxFailed > 0 ? 'border-rose-500/50' : ''}`}>
              <span className="kpi-title flex items-center gap-2"><Database size={14} /> Sincronización</span>
              <div className="kpi-value">{loading ? '…' : stats.outboxPending}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">
                Cola pendiente · {stats.outboxFailed} fallidas · {stats.sheetSyncFailed} RSVP sin copiar
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2"><AlertCircle size={14} /> Incidencias abiertas</span>
              <div className="kpi-value">{loading ? '…' : stats.openIssues}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">{stats.criticalIssues} requieren prioridad</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Mesas y operación
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2"><Armchair size={14} /> Capacidad configurada</span>
              <div className={`kpi-value ${capacityDifference < 0 ? 'text-rose-700' : ''}`}>{loading ? '…' : stats.configuredCapacity}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">
                {capacityDifference >= 0 ? `${capacityDifference} cupos disponibles` : `Faltan ${Math.abs(capacityDifference)} cupos`}
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2"><Users size={14} /> Con mesa</span>
              <div className="kpi-value">{loading ? '…' : stats.seatingAssignments}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">{stats.confirmedNoTable} confirmados aún sin mesa</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2"><DollarSign size={14} /> Contratado</span>
              <div className="text-2xl font-semibold">{loading ? '…' : money(stats.totalContracted)}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">{stats.incompleteAmounts} montos incompletos</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2"><DollarSign size={14} /> Saldo conocido</span>
              <div className="text-2xl font-semibold">{loading ? '…' : money(balance)}</div>
              <span className="mt-2 block text-xs text-[var(--text-secondary)]">
                {stats.overduePayments} vencidos · {stats.upcomingPayments} próximos 30 días
              </span>
            </div>
          </div>
        </section>

        {hasOperationalAlert && (
          <div className="flex flex-col gap-3 border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle size={19} className="mt-0.5 shrink-0" />
              <div>
                <strong className="block">Todavía existen tareas operativas antes del cierre final.</strong>
                <span>Revisa incidencias y completa las mesas antes de exportar la nómina definitiva a proveedores.</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/issues" className="btn-secondary text-xs">Incidencias</Link>
              <Link href="/dashboard/tables" className="btn-primary text-xs">Mesas</Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
