'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DollarSign,
  Loader2,
  Music2,
  RefreshCw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import './music-v2.css';

interface MusicMoment {
  rowNumber: number;
  dateTime: string;
  block: string;
  owner: string;
  duration: string;
  status: string;
  dependencies: string;
  notes: string;
}

interface MusicBudgetItem {
  rowNumber: number;
  item: string;
  projectedQuantity: string;
  confirmedQuantity: string;
  unitNet: number | null;
  vat: string;
  projectedGross: number | null;
  category: string;
  responsible: string;
  status: string;
  notes: string;
  advance: number | null;
}

interface MusicSource {
  ok: boolean;
  sources: string[];
  moments: MusicMoment[];
  budgetItems: MusicBudgetItem[];
  summary: {
    moments: number;
    confirmedMoments: number;
    pendingMoments: number;
    budgetItems: number;
    confirmedBudget: number;
    pendingBudget: number;
    budgetTotal: number;
    hasDetailedPlaylist: boolean;
  };
  fetchedAt: string;
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Por confirmar';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

function time(value: string) {
  const match = value.match(/(\d{2}:\d{2})/);
  return match?.[1] || '—';
}

function statusClass(value: string) {
  return value.toLowerCase() === 'confirmado' ? 'is-confirmed' : 'is-pending';
}

export default function MusicPage() {
  const [data, setData] = useState<MusicSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const response = await fetch('/api/music-source', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible cargar Música.');
      setData(payload as MusicSource);
    } catch (err: any) {
      setError(err?.message || 'No fue posible cargar Música.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const pendingDecisions = useMemo(() => {
    if (!data) return [];
    const decisions: Array<{ title: string; detail: string; source: string }> = [];
    data.moments.filter((item) => item.status.toLowerCase() !== 'confirmado').forEach((item) => decisions.push({
      title: `Cerrar ${item.block}`,
      detail: item.notes || item.dependencies || 'El bloque musical todavía figura pendiente.',
      source: 'TIMELINE',
    }));
    data.budgetItems.filter((item) => item.status.toLowerCase() !== 'confirmado').forEach((item) => decisions.push({
      title: `Resolver ${item.item}`,
      detail: item.notes || `${item.responsible || 'Responsable por definir'} · ${money(item.projectedGross)}`,
      source: 'PRESUPUESTO_IGLESIA',
    }));
    if (!data.summary.hasDetailedPlaylist) decisions.push({
      title: 'Construir repertorio y canciones por momento',
      detail: 'Las fuentes operativas actuales definen bloques, responsables y servicios, pero todavía no contienen una playlist canción por canción.',
      source: 'Brecha de información',
    });
    return decisions;
  }, [data]);

  return <DashboardLayout><div className="music-v2">
    <section className="music-v2__hero">
      <div><span className="music-v2__eyebrow">Banda sonora operativa</span><h1>Música</h1><p>Conecta los momentos musicales del cronograma con los servicios presupuestados, sin inventar canciones que todavía no estén documentadas.</p></div>
      <button type="button" onClick={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Actualizando…' : 'Actualizar'}</button>
    </section>

    {error && <div className="music-v2__error"><AlertTriangle size={16}/><span>{error}</span></div>}

    {loading ? <div className="music-v2__loading"><Loader2 className="animate-spin" size={21}/>Cargando operación musical…</div> : <>
      <section className="music-v2__source">
        <div><span>Fuentes</span><strong>{data?.sources.join(' + ')}</strong><small>lectura en vivo</small></div>
        <div><span>Momentos musicales</span><strong>{data?.summary.moments || 0}</strong><small>{data?.summary.confirmedMoments || 0} confirmados</small></div>
        <div className={(data?.summary.pendingMoments || 0) > 0 ? 'is-attention' : ''}><span>Momentos pendientes</span><strong>{data?.summary.pendingMoments || 0}</strong><small>requieren cierre</small></div>
        <div><span>Presupuesto asociado</span><strong>{money(data?.summary.budgetTotal)}</strong><small>{data?.summary.budgetItems || 0} ítems detectados</small></div>
      </section>

      <section className="music-v2__section">
        <header><div><span className="music-v2__eyebrow">Secuencia</span><h2>Cómo entra la música durante el evento</h2></div></header>
        <div className="music-v2__moments">{(data?.moments || []).map((item) => <article key={item.rowNumber} className={statusClass(item.status)}>
          <div className="music-v2__moment-time"><strong>{time(item.dateTime)}</strong><small>{item.duration || '—'}</small></div>
          <span className="music-v2__moment-icon"><Volume2 size={16}/></span>
          <div className="music-v2__moment-main"><div className="music-v2__moment-top"><div><span>{item.owner || 'Responsable por definir'}</span><h3>{item.block}</h3></div><span className="music-v2__status">{item.status || 'Pendiente'}</span></div><div className="music-v2__moment-meta"><span><b>Dependencia</b>{item.dependencies || 'Sin dependencia declarada'}</span><span><b>Dirección</b>{item.notes || 'Sin nota ejecutiva'}</span></div></div>
        </article>)}</div>
      </section>

      <section className="music-v2__grid">
        <div className="music-v2__panel">
          <header><div><span className="music-v2__eyebrow">Servicios</span><h2>Proveedores y costos musicales</h2></div><DollarSign size={18}/></header>
          <div className="music-v2__budget-list">{(data?.budgetItems || []).map((item) => <article key={item.rowNumber}><span className="music-v2__service-icon"><Music2 size={15}/></span><div><strong>{item.item}</strong><small>{item.category} · {item.responsible || 'Responsable por definir'}</small>{item.notes && <p>{item.notes}</p>}</div><strong className="music-v2__amount">{money(item.projectedGross)}</strong><span className={`music-v2__status ${statusClass(item.status)}`}>{item.status || 'Pendiente'}</span></article>)}</div>
        </div>

        <div className="music-v2__panel music-v2__decisions">
          <header><div><span className="music-v2__eyebrow">Decisiones</span><h2>Qué falta definir</h2></div><Sparkles size={18}/></header>
          <div>{pendingDecisions.map((decision, index) => <article key={`${decision.title}-${index}`}><span className="music-v2__decision-icon">{decision.source === 'Brecha de información' ? <Music2 size={15}/> : <Clock3 size={15}/>}</span><div><span>{decision.source}</span><strong>{decision.title}</strong><p>{decision.detail}</p></div></article>)}{!pendingDecisions.length && <div className="music-v2__complete"><CheckCircle2 size={20}/><strong>Operación musical cerrada.</strong></div>}</div>
        </div>
      </section>
    </>}
  </div></DashboardLayout>;
}
