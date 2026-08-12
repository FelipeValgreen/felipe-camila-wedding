'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Loader2, RefreshCw, Search } from 'lucide-react';
import './timeline-v2.css';

interface TimelineItem {
  rowNumber: number;
  dateTime: string;
  block: string;
  owner: string;
  duration: string;
  status: string;
  dependencies: string;
  notes: string;
}

interface TimelineSource {
  ok: boolean;
  source: string;
  items: TimelineItem[];
  summary: { total: number; confirmed: number; pending: number };
  fetchedAt: string;
}

function clock(value: string) {
  const match = value.match(/(\d{2}:\d{2})/);
  return match?.[1] || value || '—';
}

function dateLabel(value: string) {
  if (!value) return '23 octubre 2026';
  const date = new Date(value.replace(' ', 'T') + (value.includes('T') ? '' : '-03:00'));
  if (Number.isNaN(date.getTime())) return '23 octubre 2026';
  return new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' }).format(date);
}

export default function TimelinePage() {
  const [data, setData] = useState<TimelineSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const response = await fetch('/api/timeline-source', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible cargar el cronograma.');
      setData(payload as TimelineSource);
    } catch (err: any) {
      setError(err?.message || 'No fue posible cargar el cronograma.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const items = useMemo(() => {
    const term = search.toLowerCase().trim();
    return (data?.items || []).filter((item) => {
      if (showPendingOnly && item.status.toLowerCase() === 'confirmado') return false;
      if (!term) return true;
      return `${item.block} ${item.owner} ${item.dependencies} ${item.notes}`.toLowerCase().includes(term);
    });
  }, [data, search, showPendingOnly]);

  const nextCritical = useMemo(() => (data?.items || []).filter((item) => item.status.toLowerCase() !== 'confirmado').slice(0, 3), [data]);

  return <DashboardLayout><div className="timeline-v2">
    <section className="timeline-v2__hero"><div><span className="timeline-v2__eyebrow">Operación del día</span><h1>Cronograma</h1><p>Secuencia operativa conectada directamente a la pestaña TIMELINE del Centro de Comandos, con responsables, dependencias y estado.</p></div><button type="button" onClick={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Actualizando…' : 'Actualizar'}</button></section>

    {error && <div className="timeline-v2__error"><AlertTriangle size={16}/><span>{error}</span></div>}

    {loading ? <div className="timeline-v2__loading"><Loader2 className="animate-spin" size={21}/>Cargando cronograma real…</div> : <>
      <section className="timeline-v2__source"><div><span>Fuente</span><strong>{data?.source}</strong><small>lectura en vivo</small></div><div><span>Bloques</span><strong>{data?.summary.total || 0}</strong><small>eventos operativos</small></div><div><span>Confirmados</span><strong>{data?.summary.confirmed || 0}</strong><small>bloques cerrados</small></div><div className={(data?.summary.pending || 0) > 0 ? 'is-attention' : ''}><span>Pendientes</span><strong>{data?.summary.pending || 0}</strong><small>requieren definición</small></div></section>

      <section className="timeline-v2__priority"><div><span className="timeline-v2__eyebrow">Antes del evento</span><h2>Qué falta cerrar</h2></div><div className="timeline-v2__priority-grid">{nextCritical.map((item) => <article key={item.rowNumber}><span><Clock3 size={14}/>{clock(item.dateTime)}</span><strong>{item.block}</strong><small>{item.dependencies || 'Sin dependencia declarada'}</small></article>)}{!nextCritical.length && <article className="is-complete"><CheckCircle2 size={18}/><strong>Todo el cronograma está confirmado.</strong></article>}</div></section>

      <section className="timeline-v2__toolbar"><label><Search size={14}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar bloque, responsable o dependencia…"/></label><button type="button" className={showPendingOnly ? 'is-active' : ''} onClick={() => setShowPendingOnly((value) => !value)}>Sólo pendientes</button></section>

      <section className="timeline-v2__day"><header><div><CalendarDays size={17}/><div><span>Viernes</span><strong>{dateLabel(data?.items[0]?.dateTime || '')}</strong></div></div><small>{items.length} bloques visibles</small></header><div className="timeline-v2__rail">{items.map((item) => {
        const confirmed = item.status.toLowerCase() === 'confirmado';
        return <article key={item.rowNumber} className={confirmed ? 'is-confirmed' : 'is-pending'}><div className="timeline-v2__time"><strong>{clock(item.dateTime)}</strong><span>{item.duration || '—'}</span></div><span className="timeline-v2__dot"/><div className="timeline-v2__card"><div className="timeline-v2__card-top"><div><span>{item.owner || 'Responsable por definir'}</span><h2>{item.block}</h2></div><span className="timeline-v2__status">{item.status || 'Pendiente'}</span></div><div className="timeline-v2__meta"><div><span>Dependencias</span><strong>{item.dependencies || 'Sin dependencia declarada'}</strong></div><div><span>Nota ejecutiva</span><strong>{item.notes || 'Sin nota'}</strong></div></div></div></article>;
      })}{!items.length && <div className="timeline-v2__empty">No hay bloques que coincidan con esta vista.</div>}</div></section>
    </>}
  </div></DashboardLayout>;
}
