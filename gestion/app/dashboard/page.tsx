'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Users, CheckCircle2, XCircle, Clock, AlertTriangle, Armchair, DollarSign, Calendar, AlertCircle } from 'lucide-react';

export default function DashboardResumen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeGuests: 0,
    invitationsSent: 0,
    responsesReceived: 0,
    confirmed: 0,
    declined: 0,
    pending: 0,
    unmatchedRsvp: 0,
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
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: guests } = await supabase.from('wedding_guests').select('*');
        const { data: rsvps } = await supabase.from('rsvp_responses').select('*');
        const { data: tables } = await supabase.from('wedding_tables').select('*');
        const { data: expenses } = await supabase.from('expenses').select('*');
        const { data: payments } = await supabase.from('expense_payments').select('*');

        const activeGuests = (guests || []).filter(g => g.guest_status === 'active');
        const confirmed = activeGuests.filter(g => g.attendance_status === 'attending').length;
        const declined = activeGuests.filter(g => g.attendance_status === 'not_attending').length;
        const pending = activeGuests.filter(g => g.attendance_status === 'pending').length;
        
        const dietaryFlagsCount = activeGuests.filter(g => g.dietary_type && g.dietary_type !== 'Ninguna').length;
        const confirmedNoTable = activeGuests.filter(g => g.attendance_status === 'attending' && !g.table_id).length;
        const reconfirmationPending = activeGuests.filter(g => g.reconfirmation_status === 'pending').length;

        const unmatchedRsvp = (rsvps || []).filter(r => r.reconciliation_status === 'unmatched').length;

        const configuredCapacity = (tables || []).reduce((sum, t) => sum + (t.capacity || 10), 0);

        const totalPaid = (payments || [])
          .filter(p => p.status === 'Pagado')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const incompleteExpenses = (expenses || []).filter(e => e.total_amount === null || e.total_amount === undefined);
        const hasIncompleteAmounts = incompleteExpenses.length > 0;

        const totalContracted = (expenses || [])
          .filter(e => e.total_amount !== null && e.total_amount !== undefined)
          .reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        let upcomingPaymentsCount = 0;
        let overduePaymentsCount = 0;

        (expenses || []).forEach(e => {
          if (e.due_date) {
            const dueDate = new Date(e.due_date);
            if (dueDate > now && dueDate <= thirtyDaysFromNow && e.payment_status !== 'Pagado') {
              upcomingPaymentsCount++;
            }
            if (dueDate < now && e.payment_status !== 'Pagado') {
              overduePaymentsCount++;
            }
          }
        });

        setStats({
          activeGuests: activeGuests.length,
          invitationsSent: activeGuests.filter(g => g.invitation_status !== 'not_sent').length,
          responsesReceived: (rsvps || []).length,
          confirmed,
          declined,
          pending,
          unmatchedRsvp,
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
      } catch (err) {
        console.error('Error loading dynamic stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const balanceKnown = stats.totalContracted - stats.totalPaid;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Title Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)] font-semibold block">
              Resumen Operativo Dinámico
            </span>
            <h1 className="font-serif text-3xl text-[var(--text-primary)] mt-1">
              Centro de Comandos F&C
            </h1>
          </div>
          <div className="text-right">
            <span className="text-xs text-[var(--text-secondary)] block">Matrimonio Felipe & Camila</span>
            <span className="text-xs font-semibold text-[var(--text-primary)] block">23 de octubre de 2026</span>
          </div>
        </div>

        {/* Section 1: KPIs Invitados & RSVP */}
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
                {stats.invitationsSent} enviadas · {stats.responsesReceived} respuestas
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2 text-[#2D5A27]">
                <CheckCircle2 size={14} /> Confirmados
              </span>
              <div className="kpi-value text-[#2D5A27]">{loading ? '...' : stats.confirmed}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                {stats.dietaryFlagsCount} restricciones alimentarias
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

        {/* Section 2: Conciliación & Mesas */}
        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--text-secondary)] mb-4">
            Alertas de Conciliación & Capacidad
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="kpi-card border-l-4 border-l-[#8E703E]">
              <span className="kpi-title flex items-center gap-2">
                <AlertTriangle size={14} className="text-[#8E703E]" /> RSVP Por Conciliar
              </span>
              <div className="kpi-value">{loading ? '...' : stats.unmatchedRsvp}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                Respuestas web sin vincular a ficha
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

        {/* Section 3: Resumen Financiero Dinámico */}
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
