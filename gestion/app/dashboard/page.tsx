'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Armchair,
  DollarSign,
  Calendar,
  AlertCircle,
  Database,
  RefreshCw
} from 'lucide-react';

const INITIAL_STATS = {
  activeGuests: 0,
  invitationsSent: 0,
  responsesReceived: 0,
  confirmed: 0,
  declined: 0,
  pending: 0,
  properlyMatchedRsvp: 0,
  unmatchedRsvp: 0,
  ambiguousRsvp: 0,
  conflictRsvp: 0,
  malformedMatchedRsvp: 0,
  rsvpReviewTotal: 0,
  sheetSyncFailed: 0,
  outboxPending: 0,
  outboxFailed: 0,
  outboxProcessed: 0,
  confirmedNoTable: 0,
  configuredCapacity: 0,
  estimatedCapacity: 250,
  dietaryFlagsCount: 0,
  reconfirmationPending: 0,
  totalContracted: 0,
  totalPaid: 0,
  hasIncompleteAmounts: true,
  upcomingPaymentsCount: 0,
  overduePaymentsCount: 0
};

export default function DashboardResumen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [stats, setStats] = useState(INITIAL_STATS);

  const loadStats = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) setRefreshing(true);
    setLoadError(null);

    try {
      const supabase = createClient();
      const [
        guestsResult,
        rsvpsResult,
        tablesResult,
        expensesResult,
        paymentsResult,
        outboxResult
      ] = await Promise.all([
        supabase
          .from('wedding_guests')
          .select('guest_status, invitation_status, attendance_status, dietary_type, table_id, reconfirmation_status'),
        supabase
          .from('rsvp_responses')
          .select('id, guest_id, reconciliation_status, sheet_sync_status, created_at'),
        supabase.from('wedding_tables').select('capacity'),
        supabase.from('expenses').select('total_amount, due_date, payment_status'),
        supabase.from('expense_payments').select('amount, status'),
        supabase.from('sync_outbox').select('status, attempts, entity_type, created_at')
      ]);

      const queryErrors = [
        guestsResult.error,
        rsvpsResult.error,
        tablesResult.error,
        expensesResult.error,
        paymentsResult.error,
        outboxResult.error
      ].filter(Boolean);

      if (queryErrors.length > 0) {
        throw new Error(queryErrors.map(error => error?.message).join(' · '));
      }

      const guests = guestsResult.data || [];
      const rsvps = rsvpsResult.data || [];
      const tables = tablesResult.data || [];
      const expenses = expensesResult.data || [];
      const payments = paymentsResult.data || [];
      const outbox = outboxResult.data || [];

      const activeGuests = guests.filter(guest => guest.guest_status === 'active');
      const confirmed = activeGuests.filter(guest => guest.attendance_status === 'attending').length;
      const declined = activeGuests.filter(guest => guest.attendance_status === 'not_attending').length;
      const pending = activeGuests.filter(guest => guest.attendance_status === 'pending').length;

      const dietaryFlagsCount = activeGuests.filter(
        guest => guest.dietary_type && guest.dietary_type !== 'Ninguna'
      ).length;
      const confirmedNoTable = activeGuests.filter(
        guest => guest.attendance_status === 'attending' && !guest.table_id
      ).length;
      const reconfirmationPending = activeGuests.filter(
        guest => guest.reconfirmation_status === 'pending'
      ).length;

      const properlyMatchedRsvp = rsvps.filter(
        rsvp => rsvp.reconciliation_status === 'matched' && Boolean(rsvp.guest_id)
      ).length;
      const malformedMatchedRsvp = rsvps.filter(
        rsvp => rsvp.reconciliation_status === 'matched' && !rsvp.guest_id
      ).length;
      const unmatchedRsvp = rsvps.filter(
        rsvp => rsvp.reconciliation_status === 'unmatched' && !rsvp.guest_id
      ).length;
      const ambiguousRsvp = rsvps.filter(
        rsvp => rsvp.reconciliation_status === 'ambiguous'
      ).length;
      const conflictRsvp = rsvps.filter(
        rsvp => rsvp.reconciliation_status === 'conflict'
      ).length;
      const rsvpReviewTotal = unmatchedRsvp + ambiguousRsvp + conflictRsvp + malformedMatchedRsvp;
      const sheetSyncFailed = rsvps.filter(rsvp => rsvp.sheet_sync_status === 'failed').length;

      const outboxPending = outbox.filter(item => item.status === 'pending').length;
      const outboxFailed = outbox.filter(item => item.status === 'failed').length;
      const outboxProcessed = outbox.filter(item => item.status === 'processed').length;

      const configuredCapacity = tables.reduce(
        (sum, table) => sum + (Number(table.capacity) || 10),
        0
      );

      const totalPaid = payments
        .filter(payment => payment.status === 'Pagado')
        .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

      const incompleteExpenses = expenses.filter(
        expense => expense.total_amount === null || expense.total_amount === undefined
      );
      const hasIncompleteAmounts = incompleteExpenses.length > 0;

      const totalContracted = expenses
        .filter(expense => expense.total_amount !== null && expense.total_amount !== undefined)
        .reduce((sum, expense) => sum + (Number(expense.total_amount) || 0), 0);

      const now = new Date();
      const thirtyDaysFromNow = new Date(now);
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      let upcomingPaymentsCount = 0;
      let overduePaymentsCount = 0;

      expenses.forEach(expense => {
        if (!expense.due_date || expense.payment_status === 'Pagado') return;

        const dueDate = new Date(expense.due_date);
        if (dueDate > now && dueDate <= thirtyDaysFromNow) upcomingPaymentsCount++;
        if (dueDate < now) overduePaymentsCount++;
      });

      setStats({
        activeGuests: activeGuests.length,
        invitationsSent: activeGuests.filter(guest => guest.invitation_status !== 'not_sent').length,
        responsesReceived: rsvps.length,
        confirmed,
        declined,
        pending,
        properlyMatchedRsvp,
        unmatchedRsvp,
        ambiguousRsvp,
        conflictRsvp,
        malformedMatchedRsvp,
        rsvpReviewTotal,
        sheetSyncFailed,
        outboxPending,
        outboxFailed,
        outboxProcessed,
        confirmedNoTable,
        configuredCapacity,
        estimatedCapacity: 250,
        dietaryFlagsCount,
        reconfirmationPending,
        totalContracted,
        totalPaid,
        hasIncompleteAmounts,
        upcomingPaymentsCount,
        overduePaymentsCount
      });
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error('Error loading dynamic stats:', err);
      setLoadError(err instanceof Error ? err.message : 'No se pudo actualizar el resumen operativo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();

    const intervalId = window.setInterval(() => {
      loadStats();
    }, 30_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadStats();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadStats]);

  const balanceKnown = stats.totalContracted - stats.totalPaid;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)] font-semibold block">
              Resumen Operativo en Vivo
            </span>
            <h1 className="font-serif text-3xl text-[var(--text-primary)] mt-1">
              Centro de Comandos F&C
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-[var(--text-secondary)] block">Matrimonio Felipe & Camila</span>
              <span className="text-xs font-semibold text-[var(--text-primary)] block">23 de octubre de 2026</span>
              <span className="text-[10px] text-[var(--text-muted)] block mt-1">
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
        </div>

        {loadError && (
          <div className="flex items-start gap-3 border border-[#A83232]/40 bg-[#A83232]/10 p-4 text-sm text-[#A83232]">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <strong className="block uppercase tracking-wider text-xs">No se pudo actualizar el dashboard</strong>
              <span className="block mt-1 text-xs">{loadError}</span>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--text-secondary)] mb-4">
            Gestión de Invitados & RSVP
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2">
                <Users size={14} /> Invitados Activos
              </span>
              <div className="kpi-value">{loading ? '...' : stats.activeGuests}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                {stats.invitationsSent} invitaciones enviadas · {stats.responsesReceived} respuestas web
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2 text-[#2D5A27]">
                <CheckCircle2 size={14} /> Confirmados
              </span>
              <div className="kpi-value text-[#2D5A27]">{loading ? '...' : stats.confirmed}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                {stats.properlyMatchedRsvp} RSVP correctamente vinculados · {stats.dietaryFlagsCount} restricciones
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2 text-[#55504A]">
                <XCircle size={14} /> No Asisten
              </span>
              <div className="kpi-value text-[#55504A]">{loading ? '...' : stats.declined}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                Cupos liberados para asignación
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2 text-[#8E703E]">
                <Clock size={14} /> Pendientes
              </span>
              <div className="kpi-value text-[#8E703E]">{loading ? '...' : stats.pending}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                {stats.reconfirmationPending} pendientes de reconfirmación
              </span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--text-secondary)] mb-4">
            Alertas de Conciliación, Sincronización & Capacidad
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="kpi-card border-l-4 border-l-[#8E703E]">
              <span className="kpi-title flex items-center gap-2">
                <AlertTriangle size={14} className="text-[#8E703E]" /> RSVP Por Revisar
              </span>
              <div className="kpi-value">{loading ? '...' : stats.rsvpReviewTotal}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                {stats.unmatchedRsvp} sin coincidencia · {stats.ambiguousRsvp} ambiguos · {stats.conflictRsvp} conflictos
                {stats.malformedMatchedRsvp > 0 ? ` · ${stats.malformedMatchedRsvp} matched sin ficha` : ''}
              </span>
            </div>

            <div className={`kpi-card border-l-4 ${stats.outboxFailed > 0 ? 'border-l-[#A83232]' : 'border-l-[#8E703E]'}`}>
              <span className="kpi-title flex items-center gap-2">
                <Database size={14} className={stats.outboxFailed > 0 ? 'text-[#A83232]' : 'text-[#8E703E]'} /> Cola de Sincronización
              </span>
              <div className="kpi-value">{loading ? '...' : stats.outboxPending}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                Pendientes en sync_outbox · {stats.outboxFailed} fallidas · {stats.outboxProcessed} procesadas
              </span>
              <span className="text-[10px] text-[#A83232] mt-1 block">
                {stats.sheetSyncFailed} RSVP marcados con fallo de Google Sheets
              </span>
            </div>

            <div className="kpi-card border-l-4 border-l-[#A83232]">
              <span className="kpi-title flex items-center gap-2">
                <Armchair size={14} className="text-[#A83232]" /> Confirmados Sin Mesa
              </span>
              <div className="kpi-value text-[#A83232]">{loading ? '...' : stats.confirmedNoTable}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                Invitados confirmados requeridos en plano
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2">
                Capacidad de Mesas
              </span>
              <div className="kpi-value">
                {loading ? '...' : `Configurada: ${stats.configuredCapacity}`}
              </div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                Capacidad estimada recinto: {stats.estimatedCapacity} personas
              </span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--text-secondary)] mb-4">
            Resumen Financiero & Vencimientos Dinámicos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2 text-[#2D5A27]">
                <DollarSign size={14} /> Total Pagado
              </span>
              <div className="kpi-value text-[#2D5A27]">${loading ? '...' : stats.totalPaid.toLocaleString('es-CL')} CLP</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                Pagos confirmados en base de datos
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2">
                Contratado Conocido
              </span>
              <div className="kpi-value">${loading ? '...' : stats.totalContracted.toLocaleString('es-CL')} CLP</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                Gastos con monto definido
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2 text-[#8E703E]">
                Saldo Total
              </span>
              <div className="kpi-value text-[#8E703E]">
                {stats.hasIncompleteAmounts ? (
                  <span className="text-[#A83232] font-semibold italic text-xl">POR COMPLETAR</span>
                ) : (
                  `$${balanceKnown.toLocaleString('es-CL')} CLP`
                )}
              </div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                {stats.hasIncompleteAmounts ? 'Existen contratos con monto desconocido' : 'Saldo exacto calculado'}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2">
                <Calendar size={14} /> Vencimientos (30 días)
              </span>
              <div className="kpi-value">{loading ? '...' : stats.upcomingPaymentsCount}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                {stats.overduePaymentsCount} pagos vencidos
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
