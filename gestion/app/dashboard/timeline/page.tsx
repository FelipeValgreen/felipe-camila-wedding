'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Edit3, Loader2, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
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
  mode?: 'production' | 'staging';
  items: TimelineItem[];
  summary: { total: number; confirmed: number; pending: number };
  fetchedAt: string;
}

type Notice = { type: 'success' | 'error' | 'info'; text: string };

const EMPTY: TimelineItem = { rowNumber: 0, dateTime: '2026-10-23 ', block: '', owner: '', duration: '', status: 'Pendiente', dependencies: '', notes: '' };

function clock(value: string) {
  const match = value.match(/(\d{2}:\d{2})/);
  return match?.[1] || value || '—';
}

function dateLabel(value: string) {
  if (!value) return '23 octubre 2026';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(`${normalized}${/[zZ]|[+-]\d\d:\d\d$/.test(normalized) ? '' : '-03:00'}`);
  if (Number.isNaN(date.getTime())) return '23 octubre 2026';
  return new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' }).format(date);
}

export default function TimelinePage() {
  const [data, setData] = useState<TimelineSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TimelineItem>(EMPTY);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setNotice(null);
    try {
      const response = await fetch('/api/timeline-source', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible cargar el cronograma.');
      setData(payload as TimelineSource);
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'No fue posible cargar el cronograma.' });
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

  function openCreate() {
    setCreating(true);
    setForm({ ...EMPTY });
    setEditorOpen(true);
  }

  function openEdit(item: TimelineItem) {
    setCreating(false);
    setForm({ ...item });
    setEditorOpen(true);
  }

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    if (!form.block.trim()) { setNotice({ type: 'error', text: 'El nombre del bloque es obligatorio.' }); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/timeline-source', {
        method: creating ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible guardar el bloque.');
      setEditorOpen(false);
      setNotice({ type: 'success', text: `${creating ? 'Bloque creado' : 'Bloque actualizado'} en ${payload.mode === 'staging' ? 'STAGING' : 'la fuente operativa'}.` });
      await loadData();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible guardar el bloque.' });
    } finally { setSaving(false); }
  }

  async function deleteItem() {
    if (creating || !form.rowNumber) { setEditorOpen(false); return; }
    if (!window.confirm(`¿Eliminar “${form.block}” del cronograma?`)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/timeline-source?rowNumber=${form.rowNumber}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible eliminar el bloque.');
      setEditorOpen(false);
      setNotice({ type: 'success', text: `Bloque eliminado de ${payload.mode === 'staging' ? 'STAGING' : 'la fuente operativa'}.` });
      await loadData();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible eliminar el bloque.' });
    } finally { setSaving(false); }
  }

  return <DashboardLayout><div className="timeline-v2">
    <section className="timeline-v2__hero"><div><span className="timeline-v2__eyebrow">Operación del día</span><h1>Cronograma</h1><p>Run of show editable con responsables, dependencias y notas. En Preview los cambios persisten en la copia STAGING del Centro de Comandos.</p></div><div className="timeline-v2__hero-actions"><button type="button" onClick={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Actualizando…' : 'Actualizar'}</button><button type="button" className="is-primary" onClick={openCreate}><Plus size={14}/>Nuevo bloque</button></div></section>

    {notice && <div className={`timeline-v2__error timeline-v2__notice--${notice.type}`}>{notice.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}<span>{notice.text}</span></div>}

    {loading ? <div className="timeline-v2__loading"><Loader2 className="animate-spin" size={21}/>Cargando cronograma real…</div> : <>
      <section className="timeline-v2__source"><div><span>Fuente</span><strong>{data?.source}</strong><small>{data?.mode === 'staging' ? 'entorno de prueba persistente' : 'operación en producción'}</small></div><div><span>Bloques</span><strong>{data?.summary.total || 0}</strong><small>eventos operativos</small></div><div><span>Confirmados</span><strong>{data?.summary.confirmed || 0}</strong><small>bloques cerrados</small></div><div className={(data?.summary.pending || 0) > 0 ? 'is-attention' : ''}><span>Pendientes</span><strong>{data?.summary.pending || 0}</strong><small>requieren definición</small></div></section>

      <section className="timeline-v2__priority"><div><span className="timeline-v2__eyebrow">Antes del evento</span><h2>Qué falta cerrar</h2></div><div className="timeline-v2__priority-grid">{nextCritical.map((item) => <article key={item.rowNumber} onClick={() => openEdit(item)} role="button" tabIndex={0}><span><Clock3 size={14}/>{clock(item.dateTime)}</span><strong>{item.block}</strong><small>{item.dependencies || 'Sin dependencia declarada'}</small></article>)}{!nextCritical.length && <article className="is-complete"><CheckCircle2 size={18}/><strong>Todo el cronograma está confirmado.</strong></article>}</div></section>

      <section className="timeline-v2__toolbar"><label><Search size={14}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar bloque, responsable o dependencia…"/></label><button type="button" className={showPendingOnly ? 'is-active' : ''} onClick={() => setShowPendingOnly((value) => !value)}>Sólo pendientes</button></section>

      <section className="timeline-v2__day"><header><div><CalendarDays size={17}/><div><span>Viernes</span><strong>{dateLabel(data?.items[0]?.dateTime || '')}</strong></div></div><small>{items.length} bloques visibles</small></header><div className="timeline-v2__rail">{items.map((item) => {
        const confirmed = item.status.toLowerCase() === 'confirmado';
        return <article key={item.rowNumber} className={confirmed ? 'is-confirmed' : 'is-pending'}><div className="timeline-v2__time"><strong>{clock(item.dateTime)}</strong><span>{item.duration || '—'}</span></div><span className="timeline-v2__dot"/><div className="timeline-v2__card"><div className="timeline-v2__card-top"><div><span>{item.owner || 'Responsable por definir'}</span><h2>{item.block}</h2></div><div className="timeline-v2__card-actions"><span className="timeline-v2__status">{item.status || 'Pendiente'}</span><button type="button" onClick={() => openEdit(item)} aria-label={`Editar ${item.block}`}><Edit3 size={13}/></button></div></div><div className="timeline-v2__meta"><div><span>Dependencias</span><strong>{item.dependencies || 'Sin dependencia declarada'}</strong></div><div><span>Nota ejecutiva</span><strong>{item.notes || 'Sin nota'}</strong></div></div></div></article>;
      })}{!items.length && <div className="timeline-v2__empty">No hay bloques que coincidan con esta vista.</div>}</div></section>
    </>}

    {editorOpen && <><button type="button" className="timeline-v2__backdrop" aria-label="Cerrar editor" onClick={() => !saving && setEditorOpen(false)}/><aside className="timeline-v2__drawer"><header><div><span className="timeline-v2__eyebrow">{creating ? 'Nuevo bloque' : 'Editar bloque'}</span><h2>{creating ? 'Agregar al run of show' : form.block}</h2></div><button type="button" onClick={() => setEditorOpen(false)} disabled={saving}><X size={18}/></button></header><form onSubmit={saveItem}>
      <label><span>Bloque *</span><input value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })}/></label>
      <div className="timeline-v2__form-grid"><label><span>Fecha y hora</span><input value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} placeholder="2026-10-23 20:30"/></label><label><span>Duración</span><input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="30 min"/></label></div>
      <div className="timeline-v2__form-grid"><label><span>Responsable</span><input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}/></label><label><span>Estado</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Pendiente</option><option>En revisión</option><option>Confirmado</option></select></label></div>
      <label><span>Dependencias</span><textarea rows={3} value={form.dependencies} onChange={(e) => setForm({ ...form, dependencies: e.target.value })}/></label>
      <label><span>Notas operativas</span><textarea rows={5} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
      <footer><div>{!creating && <button type="button" className="is-danger" onClick={deleteItem} disabled={saving}><Trash2 size={13}/>Eliminar</button>}</div><div><button type="button" onClick={() => setEditorOpen(false)} disabled={saving}>Cancelar</button><button type="submit" className="is-primary" disabled={saving}>{saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}Guardar</button></div></footer>
    </form></aside></>}
  </div></DashboardLayout>;
}
