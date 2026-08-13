'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DollarSign,
  Edit3,
  ExternalLink,
  Loader2,
  Music2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import './music-v2.css';
import './music-edit.css';

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
  projectedGross: number | null;
  category: string;
  responsible: string;
  status: string;
  notes: string;
}

interface PlaylistItem {
  rowNumber: number;
  moment: string;
  song: string;
  artist: string;
  version: string;
  link: string;
  cue: string;
  owner: string;
  status: string;
  type: string;
  notes: string;
}

interface MusicSource {
  ok: boolean;
  mode?: 'production' | 'staging';
  sources: string[];
  moments: MusicMoment[];
  budgetItems: MusicBudgetItem[];
  playlist: PlaylistItem[];
  summary: {
    moments: number;
    confirmedMoments: number;
    pendingMoments: number;
    budgetItems: number;
    confirmedBudget: number;
    pendingBudget: number;
    budgetTotal: number;
    playlistItems: number;
    confirmedPlaylist: number;
    pendingPlaylist: number;
    mustPlay: number;
    doNotPlay: number;
    hasDetailedPlaylist: boolean;
  };
  fetchedAt: string;
}

type Notice = { type: 'success' | 'error' | 'info'; text: string };

const EMPTY: PlaylistItem = {
  rowNumber: 0,
  moment: '',
  song: '',
  artist: '',
  version: '',
  link: '',
  cue: '',
  owner: '',
  status: 'Pendiente',
  type: 'Normal',
  notes: '',
};

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
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PlaylistItem>(EMPTY);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setNotice(null);
    try {
      const response = await fetch('/api/music-source', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible cargar Música.');
      setData(payload as MusicSource);
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'No fue posible cargar Música.' });
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
      source: 'PRESUPUESTO',
    }));
    if (!data.summary.hasDetailedPlaylist) decisions.unshift({
      title: 'Construir repertorio por momento',
      detail: 'Todavía no hay canciones cargadas en el plan musical. Puedes agregarlas directamente desde este módulo.',
      source: 'MUSICA',
    });
    return decisions.slice(0, 8);
  }, [data]);

  function openCreate() {
    setCreating(true);
    setForm({ ...EMPTY });
    setEditorOpen(true);
  }

  function openEdit(item: PlaylistItem) {
    setCreating(false);
    setForm({ ...item });
    setEditorOpen(true);
  }

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    if (!form.moment.trim() && !form.song.trim()) {
      setNotice({ type: 'error', text: 'Indica al menos el momento o la canción.' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/music-source', {
        method: creating ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible guardar el plan musical.');
      setEditorOpen(false);
      setNotice({ type: 'success', text: `${creating ? 'Momento musical agregado' : 'Momento musical actualizado'} en ${payload.mode === 'staging' ? 'STAGING' : 'la fuente operativa'}.` });
      await loadData();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible guardar el plan musical.' });
    } finally { setSaving(false); }
  }

  async function deleteItem() {
    if (creating || !form.rowNumber) { setEditorOpen(false); return; }
    if (!window.confirm(`¿Eliminar “${form.song || form.moment}” del plan musical?`)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/music-source?rowNumber=${form.rowNumber}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible eliminar el registro.');
      setEditorOpen(false);
      setNotice({ type: 'success', text: `Registro eliminado de ${payload.mode === 'staging' ? 'STAGING' : 'la fuente operativa'}.` });
      await loadData();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible eliminar el registro.' });
    } finally { setSaving(false); }
  }

  return <DashboardLayout><div className="music-v2">
    <section className="music-v2__hero">
      <div><span className="music-v2__eyebrow">Banda sonora operativa</span><h1>Música</h1><p>Administra canciones, cues y responsables por momento, y contrástalos con el cronograma y los servicios musicales presupuestados.</p></div>
      <div className="music-v2__hero-actions"><button type="button" onClick={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Actualizando…' : 'Actualizar'}</button><button type="button" className="is-primary" onClick={openCreate}><Plus size={14}/>Agregar canción</button></div>
    </section>

    {notice && <div className={`music-v2__error music-v2__notice--${notice.type}`}>{notice.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}<span>{notice.text}</span></div>}

    {loading ? <div className="music-v2__loading"><Loader2 className="animate-spin" size={21}/>Cargando operación musical…</div> : <>
      <section className="music-v2__source">
        <div><span>Fuente editable</span><strong>{data?.mode === 'staging' ? 'MUSICA · STAGING' : 'MUSICA'}</strong><small>{data?.mode === 'staging' ? 'los cambios persisten sólo en pruebas' : 'fuente operativa'}</small></div>
        <div><span>Canciones / momentos</span><strong>{data?.summary.playlistItems || 0}</strong><small>{data?.summary.confirmedPlaylist || 0} confirmados</small></div>
        <div className={(data?.summary.pendingPlaylist || 0) > 0 ? 'is-attention' : ''}><span>Por cerrar</span><strong>{data?.summary.pendingPlaylist || 0}</strong><small>registros de repertorio</small></div>
        <div><span>Presupuesto asociado</span><strong>{money(data?.summary.budgetTotal)}</strong><small>{data?.summary.budgetItems || 0} servicios detectados</small></div>
      </section>

      <section className="music-v2__playlist-section">
        <header><div><span className="music-v2__eyebrow">Repertorio editable</span><h2>Canciones por momento</h2><p>Cada registro puede indicar versión, enlace, cue, responsable y prioridad.</p></div><div className="music-v2__playlist-badges"><span>{data?.summary.mustPlay || 0} obligatorias</span><span>{data?.summary.doNotPlay || 0} no tocar</span></div></header>
        {(data?.playlist || []).length ? <div className="music-v2__playlist-list">{data!.playlist.map((item) => <article key={item.rowNumber} className={item.type.toLowerCase().includes('no tocar') ? 'is-no-play' : item.type.toLowerCase().includes('obligatoria') ? 'is-must' : ''}>
          <span className="music-v2__playlist-icon"><Music2 size={16}/></span>
          <div className="music-v2__playlist-main"><span>{item.moment || 'Momento por definir'}</span><strong>{item.song || 'Canción por definir'}</strong><small>{[item.artist, item.version].filter(Boolean).join(' · ') || 'Artista / versión por completar'}</small></div>
          <div className="music-v2__playlist-meta"><span>{item.type || 'Normal'}</span><small>{item.cue ? `Cue: ${item.cue}` : item.owner || 'Responsable por definir'}</small></div>
          <span className={`music-v2__status ${statusClass(item.status)}`}>{item.status || 'Pendiente'}</span>
          {item.link ? <a href={item.link} target="_blank" rel="noreferrer" aria-label={`Abrir ${item.song}`}><ExternalLink size={13}/></a> : <span/>}
          <button type="button" onClick={() => openEdit(item)} aria-label={`Editar ${item.song || item.moment}`}><Edit3 size={13}/></button>
        </article>)}</div> : <div className="music-v2__playlist-empty"><Music2 size={25}/><strong>Todavía no hay repertorio cargado.</strong><span>Empieza por entrada, ceremonia, cocktail, primer baile, banda, DJ y última canción.</span><button type="button" onClick={openCreate}><Plus size={13}/>Agregar primera canción</button></div>}
      </section>

      <section className="music-v2__section">
        <header><div><span className="music-v2__eyebrow">Contexto del run of show</span><h2>Momentos musicales detectados en el cronograma</h2></div></header>
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
          <div>{pendingDecisions.map((decision, index) => <article key={`${decision.title}-${index}`}><span className="music-v2__decision-icon">{decision.source === 'MUSICA' ? <Music2 size={15}/> : <Clock3 size={15}/>}</span><div><span>{decision.source}</span><strong>{decision.title}</strong><p>{decision.detail}</p></div></article>)}{!pendingDecisions.length && <div className="music-v2__complete"><CheckCircle2 size={20}/><strong>Operación musical cerrada.</strong></div>}</div>
        </div>
      </section>
    </>}

    {editorOpen && <><button type="button" className="music-v2__backdrop" aria-label="Cerrar editor" onClick={() => !saving && setEditorOpen(false)}/><aside className="music-v2__drawer"><header><div><span className="music-v2__eyebrow">{creating ? 'Nuevo registro' : 'Editar repertorio'}</span><h2>{creating ? 'Agregar canción o momento' : form.song || form.moment}</h2></div><button type="button" onClick={() => setEditorOpen(false)} disabled={saving}><X size={18}/></button></header><form onSubmit={saveItem}>
      <div className="music-v2__form-grid"><label><span>Momento</span><input value={form.moment} onChange={(e) => setForm({ ...form, moment: e.target.value })} placeholder="Ej. Primer baile"/></label><label><span>Tipo</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Normal</option><option>Obligatoria / Must play</option><option>Nice to have</option><option>No tocar</option></select></label></div>
      <label><span>Canción</span><input value={form.song} onChange={(e) => setForm({ ...form, song: e.target.value })} placeholder="Nombre de la canción"/></label>
      <div className="music-v2__form-grid"><label><span>Artista</span><input value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })}/></label><label><span>Versión</span><input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="Original, acústica, remix…"/></label></div>
      <label><span>Link Spotify / YouTube</span><input type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…"/></label>
      <div className="music-v2__form-grid"><label><span>Cue / inicio</span><input value={form.cue} onChange={(e) => setForm({ ...form, cue: e.target.value })} placeholder="Ej. 00:42"/></label><label><span>Responsable</span><input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="DJ, banda, coordinador…"/></label></div>
      <label><span>Estado</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Pendiente</option><option>En revisión</option><option>Confirmado</option></select></label>
      <label><span>Notas</span><textarea rows={5} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Indicaciones para DJ/banda, transición, volumen, contexto…"/></label>
      <footer><div>{!creating && <button type="button" className="is-danger" onClick={deleteItem} disabled={saving}><Trash2 size={13}/>Eliminar</button>}</div><div><button type="button" onClick={() => setEditorOpen(false)} disabled={saving}>Cancelar</button><button type="submit" className="is-primary" disabled={saving}>{saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}Guardar</button></div></footer>
    </form></aside></>}
  </div></DashboardLayout>;
}
