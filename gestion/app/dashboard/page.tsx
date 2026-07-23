'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Users, CheckCircle2, XCircle, Clock, AlertTriangle, Armchair, DollarSign } from 'lucide-react';

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
    totalCapacity: 250,
    dietaryFlagsCount: 0,
    reconfirmationPending: 0,
    totalCommitted: 500000,
    totalPaid: 500000,
    balance: 0,
    upcomingPaymentsCount: 2
  });

  useEffect(() => {
    async function loadStats() {
      try {
        // Fetch Guests
        const { data: guests } = await supabase.from('wedding_guests').select('*');
        const { data: rsvps } = await supabase.from('rsvp_responses').select('*');
        const { data: tables } = await supabase.from('wedding_tables').select('*');
        const { data: payments } = await supabase.from('expense_payments').select('*');

        const activeGuests = (guests || []).filter(g => g.guest_status === 'active');
        const confirmed = activeGuests.filter(g => g.attendance_status === 'attending').length;
        const declined = activeGuests.filter(g => g.attendance_status === 'not_attending').length;
        const pending = activeGuests.filter(g => g.attendance_status === 'pending').length;
        
        const dietaryFlagsCount = activeGuests.filter(g => g.dietary_type && g.dietary_type !== 'Ninguna').length;
        const confirmedNoTable = activeGuests.filter(g => g.attendance_status === 'attending' && !g.table_id).length;
        const reconfirmationPending = activeGuests.filter(g => g.reconfirmation_status === 'pending').length;

        const unmatchedRsvp = (rsvps || []).filter(r => r.reconciliation_status === 'unmatched').length;

        let totalPaidSum = (payments || [])
          .filter(p => p.status === 'Pagado')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        setStats({
          activeGuests: activeGuests.length,
          invitationsSent: activeGuests.filter(g => g.invitation_status !== 'not_sent').length,
          responsesReceived: (rsvps || []).length,
          confirmed,
          declined,
          pending,
          unmatchedRsvp,
          confirmedNoTable,
          totalCapacity: (tables || []).reduce((sum, t) => sum + (t.capacity || 10), 0) || 250,
          dietaryFlagsCount,
          reconfirmationPending,
          totalCommitted: 500000,
          totalPaid: totalPaidSum,
          balance: 0,
          upcomingPaymentsCount: 2
        });
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Title Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)] font-semibold block">
              Resumen Operativo
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
                {stats.invitationsSent} invitaciones enviadas
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
            Alertas de Conciliación & Mesas
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
                Capacidad del Centro
              </span>
              <div className="kpi-value">{loading ? '...' : `${stats.confirmed} / ${stats.totalCapacity}`}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                {stats.totalCapacity - stats.confirmed} cupos disponibles
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Resumen Financiero */}
        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--text-secondary)] mb-4">
            Resumen Financiero & Vencimientos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2">
                <DollarSign size={14} /> Total Pagado
              </span>
              <div className="kpi-value">${loading ? '...' : stats.totalPaid.toLocaleString('es-CL')} CLP</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                Reserva banquetería registrada
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2">
                Monto Comprometido
              </span>
              <div className="kpi-value">${loading ? '...' : stats.totalCommitted.toLocaleString('es-CL')} CLP</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                3 proveedores registrados
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title flex items-center gap-2">
                Próximos Vencimientos
              </span>
              <div className="kpi-value">{loading ? '...' : stats.upcomingPaymentsCount}</div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 block">
                Locación Arboleda & Banquetería
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
