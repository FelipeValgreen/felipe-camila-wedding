'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Activity as ActivityIcon, Filter, Clock, User, ShieldCheck } from 'lucide-react';

interface AuditItem {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data: any;
  after_data: any;
  actor: string | null;
  origin: string;
  created_at: string;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOrigin, setFilterOrigin] = useState('all');

  async function loadLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
      if (!error && data) {
        setLogs(data as AuditItem[]);
      }
    } catch (err) {
      console.error('Error loading audit log:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(l => filterOrigin === 'all' || l.origin === filterOrigin);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)] font-semibold block">
              Registro de Auditoría Integral
            </span>
            <h1 className="font-serif text-3xl text-[var(--text-primary)] mt-1">
              Actividad del Sistema
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2 text-xs focus:outline-none"
            >
              <option value="all">Todos los orígenes</option>
              <option value="dashboard">Dashboard</option>
              <option value="website">Web pública</option>
              <option value="sheets">Google Sheets</option>
              <option value="system">Sistema</option>
              <option value="import">Importación</option>
            </select>
          </div>
        </div>

        {/* Activity Table */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha & Hora</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Origen</th>
                <th>Actor</th>
                <th>Detalles de Cambio</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[var(--text-secondary)]">Cargando registro de actividad...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[var(--text-secondary)]">No hay eventos de auditoría registrados.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs font-mono">{new Date(log.created_at).toLocaleString('es-CL')}</td>
                    <td className="font-semibold text-[var(--text-primary)]">{log.action}</td>
                    <td><span className="badge badge-pending">{log.entity_type}</span></td>
                    <td>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-gold)]">
                        {log.origin}
                      </span>
                    </td>
                    <td>{log.actor || 'Felipe & Camila'}</td>
                    <td className="text-xs text-[var(--text-secondary)] font-mono">
                      {log.after_data ? JSON.stringify(log.after_data) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
