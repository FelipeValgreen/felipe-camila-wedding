'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  AlertTriangle,
  ExternalLink,
  File,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Globe2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import './documents-v2.css';

interface DocumentItem {
  rowNumber: number;
  category: string;
  title: string;
  url: string;
  type: string;
  status: string;
  source: string;
  notes: string;
  updated: string;
}

interface DocumentsSource {
  ok: boolean;
  source: string;
  items: DocumentItem[];
  summary: { total: number; active: number; reference: number; categories: number };
  fetchedAt: string;
}

type FormState = {
  category: string;
  title: string;
  url: string;
  type: string;
  status: string;
  notes: string;
};

function iconFor(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('sheet')) return FileSpreadsheet;
  if (normalized.includes('doc')) return FileText;
  if (normalized.includes('sitio') || normalized.includes('web')) return Globe2;
  return File;
}

function formatDate(value: string) {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export default function DocumentsPage() {
  const [data, setData] = useState<DocumentsSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ category: 'General', title: '', url: '', type: 'Google Drive', status: 'Activo', notes: '' });

  useEffect(() => setPreviewMode(window.location.hostname !== 'gestion.felipeycami.cl'), []);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const response = await fetch('/api/documents-source', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible cargar documentos.');
      setData(payload as DocumentsSource);
    } catch (err: any) {
      setError(err?.message || 'No fue posible cargar documentos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const categories = useMemo(() => ['Todos', ...Array.from(new Set((data?.items || []).map((item) => item.category))).sort()], [data]);
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return (data?.items || []).filter((item) => {
      if (category !== 'Todos' && item.category !== category) return false;
      if (!term) return true;
      return `${item.title} ${item.category} ${item.type} ${item.status} ${item.notes}`.toLowerCase().includes(term);
    });
  }, [data, search, category]);

  async function addDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;
    const draft: DocumentItem = {
      rowNumber: Date.now(),
      category: form.category || 'General',
      title: form.title.trim(),
      url: form.url.trim(),
      type: form.type || 'Documento',
      status: form.status || 'Activo',
      source: 'Drive',
      notes: form.notes.trim(),
      updated: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
    };
    if (previewMode) {
      setData((current) => current ? {
        ...current,
        items: [draft, ...current.items],
        summary: { ...current.summary, total: current.summary.total + 1 },
      } : current);
      setDrawerOpen(false);
      setNotice('Documento agregado localmente para validar la experiencia. Preview no modificó la hoja real.');
      return;
    }
    try {
      const response = await fetch('/api/documents-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible registrar el documento.');
      setDrawerOpen(false);
      setForm({ category: 'General', title: '', url: '', type: 'Google Drive', status: 'Activo', notes: '' });
      setNotice('Documento registrado en el Centro de Comandos.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'No fue posible registrar el documento.');
    }
  }

  return <DashboardLayout><div className="documents-v2">
    <section className="documents-v2__hero">
      <div><span className="documents-v2__eyebrow">Archivo operativo</span><h1>Documentos</h1><p>Un índice único para abrir las fuentes vigentes, distinguir documentos activos de referencias históricas y evitar que el equipo trabaje sobre archivos equivocados.</p></div>
      <div className="documents-v2__hero-actions">{previewMode && <span className="documents-v2__preview">Preview · cambios locales</span>}<button type="button" onClick={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Actualizando…' : 'Actualizar'}</button><button type="button" className="is-primary" onClick={() => setDrawerOpen(true)}><Plus size={14}/>Agregar documento</button></div>
    </section>

    {error && <div className="documents-v2__notice documents-v2__notice--error"><AlertTriangle size={16}/><span>{error}</span></div>}
    {notice && <div className="documents-v2__notice"><ShieldCheck size={16}/><span>{notice}</span></div>}

    {loading ? <div className="documents-v2__loading"><Loader2 className="animate-spin" size={21}/>Cargando registro documental…</div> : <>
      <section className="documents-v2__metrics">
        <article><span>Documentos registrados</span><strong>{data?.summary.total || 0}</strong><small>en {data?.summary.categories || 0} categorías</small></article>
        <article><span>Fuentes activas</span><strong>{data?.summary.active || 0}</strong><small>uso operativo actual</small></article>
        <article><span>Referencias</span><strong>{data?.summary.reference || 0}</strong><small>histórico / apoyo</small></article>
        <article><span>Registro maestro</span><strong>DOCUMENTOS</strong><small>F&C Centro Comandos</small></article>
      </section>

      <section className="documents-v2__toolbar">
        <div className="documents-v2__search"><Search size={15}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar documento, categoría o nota…"/></div>
        <div className="documents-v2__filters">{categories.map((item) => <button key={item} type="button" className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </section>

      <section className="documents-v2__grid">
        {filtered.map((item) => {
          const Icon = iconFor(item.type);
          const active = item.status.toLowerCase() === 'activo';
          return <article key={`${item.rowNumber}-${item.title}`} className={active ? 'is-active' : 'is-reference'}>
            <header><span className="documents-v2__icon"><Icon size={18}/></span><span className={`documents-v2__status ${active ? 'is-active' : ''}`}>{item.status}</span></header>
            <div className="documents-v2__category">{item.category}</div>
            <h2>{item.title}</h2>
            <p>{item.notes || 'Sin nota operacional.'}</p>
            <dl><div><dt>Tipo</dt><dd>{item.type}</dd></div><div><dt>Fuente</dt><dd>{item.source}</dd></div><div><dt>Actualizado</dt><dd>{formatDate(item.updated)}</dd></div></dl>
            <footer>{item.url ? <a href={item.url} target="_blank" rel="noreferrer"><FolderOpen size={14}/>Abrir fuente<ExternalLink size={12}/></a> : <span>Enlace pendiente</span>}</footer>
          </article>;
        })}
        {!filtered.length && <div className="documents-v2__empty">No hay documentos que coincidan con esta búsqueda.</div>}
      </section>
    </>}

    {drawerOpen && <><button type="button" className="documents-v2__backdrop" aria-label="Cerrar" onClick={() => setDrawerOpen(false)}/><aside className="documents-v2__drawer"><header><div><span className="documents-v2__eyebrow">Registro documental</span><h2>Agregar documento</h2></div><button type="button" onClick={() => setDrawerOpen(false)}><X size={18}/></button></header><form onSubmit={addDocument}>
      <label><span>Título *</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ej. Contrato banquetería"/></label>
      <label><span>URL *</span><input type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://…"/></label>
      <div className="documents-v2__form-grid"><label><span>Categoría</span><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}/></label><label><span>Tipo</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Google Drive</option><option>Google Sheets</option><option>Google Docs</option><option>PDF</option><option>Sitio web</option><option>Otro</option></select></label></div>
      <label><span>Estado</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Activo</option><option>Referencia</option></select></label>
      <label><span>Notas</span><textarea rows={5} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Qué contiene y cuándo debemos usarlo."/></label>
      <footer><button type="button" onClick={() => setDrawerOpen(false)}>Cancelar</button><button type="submit" className="is-primary">Guardar documento</button></footer>
    </form></aside></>}
  </div></DashboardLayout>;
}
