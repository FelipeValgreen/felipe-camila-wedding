'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Grid3X3,
  Loader2,
  Lock,
  Minus,
  Move,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Unlock,
  Users,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import './venue-v2.css';

interface TableItem {
  id: string;
  table_number: number;
  name: string;
  capacity: number;
  table_type: string;
  zone: string;
  position_x: number | string;
  position_y: number | string;
  width?: number | string;
  height?: number | string;
  rotation?: number | string;
  locked: boolean;
  notes: string | null;
}

interface GuestItem {
  id: string;
  first_name: string;
  last_name: string;
  table_id: string | null;
}

interface Assignment {
  id: string;
  guest_id: string;
  table_id: string;
  seat_number: number | null;
}

interface ConfirmedSource {
  summary: {
    currentKnownAttending: number;
    attending: number;
    incomingAttending: number;
    currentKnownAssociated: number;
    currentKnownWithoutMaster: number;
  };
  groups: Array<{ groupId: string; groupName: string; confirmed: boolean; people: string[] }>;
}

type Notice = { type: 'success' | 'warning' | 'info' | 'error'; text: string };

const autoPositions = [
  [27, 24], [50, 21], [73, 24],
  [23, 48], [77, 48],
  [27, 73], [50, 76], [73, 73],
  [15, 36], [85, 36], [15, 62], [85, 62],
];

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function number(value: number | string | undefined, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }

function ChairRing({ capacity, occupied, rectangular }: { capacity: number; occupied: number; rectangular: boolean }) {
  const visible = Math.min(Math.max(capacity, 1), 12);
  if (rectangular) {
    return <>{Array.from({ length: visible }).map((_, index) => {
      const topSide = index < Math.ceil(visible / 2);
      const sideIndex = topSide ? index : index - Math.ceil(visible / 2);
      const sideTotal = topSide ? Math.ceil(visible / 2) : Math.floor(visible / 2);
      const left = ((sideIndex + 1) / (sideTotal + 1)) * 100;
      return <span key={index} className={`venue-v2__chair venue-v2__chair--rect ${index < occupied ? 'is-occupied' : ''}`} style={{ left: `${left}%`, top: topSide ? '-13px' : 'auto', bottom: topSide ? 'auto' : '-13px' }}/>;
    })}</>;
  }
  return <>{Array.from({ length: visible }).map((_, index) => {
    const angle = (Math.PI * 2 * index) / visible - Math.PI / 2;
    const left = 50 + Math.cos(angle) * 65;
    const top = 50 + Math.sin(angle) * 65;
    return <span key={index} className={`venue-v2__chair ${index < occupied ? 'is-occupied' : ''}`} style={{ left: `${left}%`, top: `${top}%` }}/>;
  })}</>;
}

export default function VenuePage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedSource | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<TableItem>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [zoom, setZoom] = useState(.86);
  const [showGuides, setShowGuides] = useState(true);
  const [presentation, setPresentation] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null);

  useEffect(() => setPreviewMode(window.location.hostname !== 'gestion.felipeycami.cl'), []);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setNotice(null);
    try {
      const supabase = createClient();
      const [tablesResult, guestsResult, assignmentsResult, confirmedResponse] = await Promise.all([
        supabase.from('wedding_tables').select('*').order('table_number', { ascending: true }),
        supabase.from('wedding_guests').select('id, first_name, last_name, table_id').eq('attendance_status', 'attending').eq('guest_status', 'active'),
        supabase.from('seating_assignments').select('*'),
        fetch('/api/confirmed-source', { cache: 'no-store' }),
      ]);
      const errors = [tablesResult.error, guestsResult.error, assignmentsResult.error].filter(Boolean);
      if (errors.length) throw new Error(errors.map((item) => item?.message).join(' · '));
      const confirmedPayload = await confirmedResponse.json();
      if (!confirmedResponse.ok || !confirmedPayload?.ok) throw new Error(confirmedPayload?.error || 'No fue posible leer confirmados.');
      const nextTables = (tablesResult.data || []) as TableItem[];
      setTables(nextTables);
      setGuests((guestsResult.data || []) as GuestItem[]);
      setAssignments((assignmentsResult.data || []) as Assignment[]);
      setConfirmed(confirmedPayload as ConfirmedSource);
      setSelectedId((current) => {
        const next = current && nextTables.some((table) => table.id === current) ? current : nextTables[0]?.id || null;
        const selected = nextTables.find((table) => table.id === next);
        setDraft(selected ? { ...selected } : {});
        return next;
      });
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible cargar el salón.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const assignmentByGuest = useMemo(() => new Map(assignments.map((item) => [item.guest_id, item.table_id])), [assignments]);
  const occupancyByTable = useMemo(() => {
    const map = new Map<string, number>();
    tables.forEach((table) => map.set(table.id, 0));
    guests.forEach((guest) => {
      const tableId = assignmentByGuest.get(guest.id) || guest.table_id;
      if (tableId && map.has(tableId)) map.set(tableId, (map.get(tableId) || 0) + 1);
    });
    return map;
  }, [tables, guests, assignmentByGuest]);

  const metrics = useMemo(() => {
    const known = confirmed?.summary.currentKnownAttending || 0;
    const curated = confirmed?.summary.attending || 0;
    const liveDelta = confirmed?.summary.incomingAttending || 0;
    const associated = confirmed?.summary.currentKnownAssociated || guests.length;
    const capacity = tables.reduce((sum, table) => sum + number(table.capacity), 0);
    const assigned = Array.from(occupancyByTable.values()).reduce((sum, value) => sum + value, 0);
    return {
      known,
      curated,
      liveDelta,
      associated,
      capacity,
      assigned,
      capacityGap: Math.max(0, known - capacity),
      surplus: Math.max(0, capacity - known),
      unassignedOperational: Math.max(0, guests.length - assigned),
    };
  }, [confirmed, tables, guests.length, occupancyByTable]);

  const dataIssues = useMemo(() => {
    const issues: string[] = [];
    const numbers = new Map<number, number>();
    tables.forEach((table) => numbers.set(number(table.table_number), (numbers.get(number(table.table_number)) || 0) + 1));
    const duplicates = Array.from(numbers.entries()).filter(([, count]) => count > 1).map(([value]) => value);
    if (duplicates.length) issues.push(`Número de mesa duplicado: ${duplicates.join(', ')}`);
    for (let i = 0; i < tables.length; i += 1) {
      for (let j = i + 1; j < tables.length; j += 1) {
        const dx = Math.abs(number(tables[i].position_x) - number(tables[j].position_x));
        const dy = Math.abs(number(tables[i].position_y) - number(tables[j].position_y));
        if (dx < 3 && dy < 3) { issues.push(`${tables[i].name} y ${tables[j].name} están prácticamente superpuestas.`); break; }
      }
    }
    if (metrics.capacityGap > 0) issues.push(`La capacidad configurada es ${metrics.capacity}; faltan ${metrics.capacityGap} cupos para los ${metrics.known} asistentes conocidos.`);
    if (!assignments.length) issues.push('Todavía no hay asignaciones persistidas de invitados a mesas.');
    return Array.from(new Set(issues));
  }, [tables, metrics.capacityGap, metrics.capacity, metrics.known, assignments.length]);

  const selected = tables.find((table) => table.id === selectedId) || null;

  function selectTable(table: TableItem) { setSelectedId(table.id); setDraft({ ...table }); }
  function patchLocal(id: string, updates: Partial<TableItem>) {
    setTables((current) => current.map((table) => table.id === id ? { ...table, ...updates } : table));
    if (selectedId === id) setDraft((current) => ({ ...current, ...updates }));
  }

  function autoLayout() {
    setTables((current) => current.map((table, index) => ({ ...table, position_x: autoPositions[index % autoPositions.length][0], position_y: autoPositions[index % autoPositions.length][1], rotation: 0 })));
    setNotice({ type: 'info', text: 'Distribución equilibrada aplicada localmente. Revisa el plano y guarda sólo cuando estés conforme.' });
  }

  async function completeCapacity() {
    if (metrics.capacityGap <= 0) { setNotice({ type: 'success', text: 'La capacidad actual ya cubre a todos los asistentes conocidos.' }); return; }
    const needed = Math.ceil(metrics.capacityGap / 10);
    const start = tables.reduce((max, table) => Math.max(max, number(table.table_number)), 0) + 1;
    if (previewMode) {
      const created = Array.from({ length: needed }).map((_, offset) => {
        const index = tables.length + offset;
        const pos = autoPositions[index % autoPositions.length];
        return {
          id: `preview-capacity-${Date.now()}-${offset}`,
          table_number: start + offset,
          name: `Mesa ${start + offset}`,
          capacity: 10,
          table_type: 'round_guest',
          zone: 'Principal',
          position_x: pos[0],
          position_y: pos[1],
          width: 120,
          height: 120,
          rotation: 0,
          locked: false,
          notes: null,
        } as TableItem;
      });
      setTables((current) => [...current, ...created]);
      setNotice({ type: 'info', text: `${needed} mesa(s) de 10 agregadas localmente para cubrir la capacidad. Producción permanece intacta.` });
      return;
    }
    setSaving(true);
    try {
      for (let offset = 0; offset < needed; offset += 1) {
        const index = tables.length + offset;
        const pos = autoPositions[index % autoPositions.length];
        const response = await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          table_number: start + offset, name: `Mesa ${start + offset}`, capacity: 10, table_type: 'round_guest', zone: 'Principal', position_x: pos[0], position_y: pos[1], width: 120, height: 120, rotation: 0, locked: false, notes: null,
        }) });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible crear una mesa.');
      }
      await loadData();
      setNotice({ type: 'success', text: `Capacidad ampliada con ${needed} mesa(s).` });
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible completar capacidad.' });
    } finally { setSaving(false); }
  }

  async function saveSelected() {
    if (!selected) return;
    const updates = {
      name: String(draft.name || selected.name),
      table_number: number(draft.table_number, selected.table_number),
      capacity: Math.max(1, number(draft.capacity, selected.capacity)),
      table_type: String(draft.table_type || selected.table_type),
      zone: String(draft.zone || selected.zone || 'Principal'),
      position_x: number(draft.position_x, number(selected.position_x)),
      position_y: number(draft.position_y, number(selected.position_y)),
      width: number(draft.width, number(selected.width, 120)),
      height: number(draft.height, number(selected.height, 120)),
      rotation: number(draft.rotation, number(selected.rotation)),
      locked: Boolean(draft.locked),
      notes: draft.notes || null,
    };
    if (previewMode || selected.id.startsWith('preview-')) {
      patchLocal(selected.id, updates);
      setNotice({ type: 'info', text: `${updates.name} actualizada localmente. Preview no modificó producción.` });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/tables', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, ...updates }) });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No fue posible guardar la mesa.');
      patchLocal(selected.id, payload.table);
      setNotice({ type: 'success', text: `${payload.table.name} guardada.` });
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible guardar la mesa.' });
    } finally { setSaving(false); }
  }

  async function saveLayout() {
    if (previewMode) { setNotice({ type: 'info', text: 'El layout se mantiene local en Preview. Producción no fue modificada.' }); return; }
    setSaving(true);
    try {
      for (const table of tables) {
        if (table.id.startsWith('preview-')) continue;
        const response = await fetch('/api/tables', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: table.id, position_x: number(table.position_x), position_y: number(table.position_y), rotation: number(table.rotation), locked: table.locked }) });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || `No fue posible guardar ${table.name}.`);
      }
      setNotice({ type: 'success', text: 'Distribución del salón guardada.' });
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible guardar la distribución.' });
    } finally { setSaving(false); }
  }

  function resetPreview() { if (!previewMode) return; loadData(); }

  function pointerDown(event: React.PointerEvent<HTMLButtonElement>, table: TableItem) {
    selectTable(table);
    if (table.locked) return;
    dragRef.current = { id: table.id, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function pointerMove(event: React.PointerEvent<HTMLButtonElement>, table: TableItem) {
    if (!dragRef.current || dragRef.current.id !== table.id || table.locked || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 8, 92);
    const y = clamp(((event.clientY - bounds.top) / bounds.height) * 100, 10, 90);
    patchLocal(table.id, { position_x: Number(x.toFixed(2)), position_y: Number(y.toFixed(2)) });
  }
  function pointerUp(event: React.PointerEvent<HTMLButtonElement>, tableId: string) {
    if (!dragRef.current || dragRef.current.id !== tableId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <DashboardLayout><div className="venue-v2">
    <section className="venue-v2__hero">
      <div><span className="venue-v2__eyebrow">Espacio y experiencia</span><h1>Salón</h1><p>Un editor visual separado de la distribución de invitados. Aquí trabajamos geometría, capacidad y flujo; las posiciones son editables y los datos de mesas siguen viniendo de Supabase.</p></div>
      <div className="venue-v2__actions">{previewMode && <span className="venue-v2__preview">Preview · cambios locales</span>}<button type="button" onClick={() => loadData(true)}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Actualizando…' : 'Actualizar'}</button><button type="button" onClick={autoLayout}><Wand2 size={14}/>Auto-distribuir</button><button type="button" className="is-primary" onClick={saveLayout} disabled={saving}><Save size={14}/>{saving ? 'Guardando…' : 'Guardar layout'}</button></div>
    </section>

    {notice && <div className={`venue-v2__notice is-${notice.type}`}>{notice.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}<span>{notice.text}</span></div>}

    {loading ? <div className="venue-v2__loading"><Loader2 className="animate-spin" size={22}/>Cargando mesas, capacidad y asistentes…</div> : <>
      <section className="venue-v2__metrics">
        <article><span>Asistentes conocidos</span><strong>{metrics.known}</strong><small>{metrics.curated} consolidados + {metrics.liveDelta} nuevos RSVP</small></article>
        <article><span>Capacidad configurada</span><strong>{metrics.capacity}</strong><small>{tables.length} mesas</small></article>
        <article className={metrics.capacityGap ? 'is-attention' : ''}><span>Brecha de capacidad</span><strong>{metrics.capacityGap ? `-${metrics.capacityGap}` : `+${metrics.surplus}`}</strong><small>{metrics.capacityGap ? 'cupos que faltan' : 'cupos de holgura'}</small></article>
        <article><span>Listos para operar</span><strong>{guests.length}</strong><small>{metrics.unassignedOperational} sin mesa persistida</small></article>
        <article><span>Asignados</span><strong>{metrics.assigned}</strong><small>seating_assignments + ficha</small></article>
      </section>

      {dataIssues.length > 0 && <section className="venue-v2__audit"><header><AlertTriangle size={16}/><div><strong>Antes de cerrar el plano</strong><span>{dataIssues.length} observación(es) detectadas automáticamente</span></div></header><div>{dataIssues.map((issue) => <span key={issue}>{issue}</span>)}</div>{metrics.capacityGap > 0 && <button type="button" onClick={completeCapacity} disabled={saving}><Plus size={13}/>Completar capacidad con mesas de 10</button>}</section>}

      <section className={`venue-v2__workspace ${presentation ? 'is-presentation' : ''}`}>
        {!presentation && <aside className="venue-v2__left-panel">
          <span className="venue-v2__eyebrow">Composición</span><h2>Capas del salón</h2><p>Los anclajes visuales son conceptuales; no sustituyen un plano arquitectónico del recinto.</p>
          <div className="venue-v2__layer is-on"><span><Grid3X3 size={14}/>Mesas</span><strong>{tables.length}</strong></div>
          <div className="venue-v2__layer is-on"><span><Move size={14}/>Pista central</span><small>Referencia</small></div>
          <div className="venue-v2__layer is-on"><span><Sparkles size={14}/>Escenario / DJ</span><small>Referencia</small></div>
          <div className="venue-v2__layer is-on"><span><Sparkles size={14}/>Bar y acceso</span><small>Referencia</small></div>
          <div className="venue-v2__panel-divider"/>
          <button type="button" className="venue-v2__panel-button" onClick={() => setShowGuides((value) => !value)}><Grid3X3 size={13}/>{showGuides ? 'Ocultar guías' : 'Mostrar guías'}</button>
          {previewMode && <button type="button" className="venue-v2__panel-button" onClick={resetPreview}><RotateCcw size={13}/>Restablecer datos</button>}
          <div className="venue-v2__capacity-card"><span>Capacidad objetivo</span><strong>{metrics.known}</strong><small>{metrics.capacityGap > 0 ? `Aún faltan ${metrics.capacityGap} cupos` : `Cobertura suficiente (+${metrics.surplus})`}</small></div>
        </aside>}

        <div className="venue-v2__canvas-column">
          <div className="venue-v2__toolbar">
            <div><button type="button" onClick={() => setZoom((value) => clamp(Number((value - .08).toFixed(2)), .55, 1.25))}><ZoomOut size={13}/></button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => clamp(Number((value + .08).toFixed(2)), .55, 1.25))}><ZoomIn size={13}/></button><button type="button" onClick={() => setZoom(.86)}>Ajustar</button></div>
            <div><button type="button" onClick={() => setPresentation((value) => !value)}><Eye size={13}/>{presentation ? 'Volver a editar' : 'Presentación'}</button></div>
          </div>
          <div className="venue-v2__viewport">
            <div className="venue-v2__stage" style={{ transform: `scale(${zoom})` }}>
              <div ref={canvasRef} className={`venue-v2__canvas ${showGuides ? 'show-guides' : ''}`}>
                <div className="venue-v2__zone venue-v2__zone--stage"><span>Escenario / DJ</span></div>
                <div className="venue-v2__zone venue-v2__zone--bar"><span>Bar / apoyo</span></div>
                <div className="venue-v2__zone venue-v2__zone--entrance"><span>Acceso</span></div>
                <div className="venue-v2__dance"><span>Pista</span><small>flujo central</small></div>
                <div className="venue-v2__green venue-v2__green--a"/><div className="venue-v2__green venue-v2__green--b"/><div className="venue-v2__green venue-v2__green--c"/><div className="venue-v2__green venue-v2__green--d"/>
                {tables.map((table) => {
                  const rectangular = table.table_type === 'rectangular_guest';
                  const occupied = occupancyByTable.get(table.id) || 0;
                  return <button
                    key={table.id}
                    type="button"
                    className={`venue-v2__table ${rectangular ? 'is-rectangular' : ''} ${selectedId === table.id ? 'is-selected' : ''} ${table.locked ? 'is-locked' : ''}`}
                    style={{ left: `${clamp(number(table.position_x, 50), 8, 92)}%`, top: `${clamp(number(table.position_y, 50), 10, 90)}%`, transform: `translate(-50%,-50%) rotate(${number(table.rotation)}deg)` }}
                    onClick={() => selectTable(table)}
                    onPointerDown={(event) => pointerDown(event, table)}
                    onPointerMove={(event) => pointerMove(event, table)}
                    onPointerUp={(event) => pointerUp(event, table.id)}
                    onPointerCancel={(event) => pointerUp(event, table.id)}
                    title={table.locked ? 'Mesa bloqueada' : 'Arrastra para mover'}
                  >
                    <ChairRing capacity={number(table.capacity, 10)} occupied={occupied} rectangular={rectangular}/>
                    <strong>{table.name}</strong><span>{occupied}/{table.capacity}</span>{table.locked && <Lock size={10}/>} 
                  </button>;
                })}
                <div className="venue-v2__canvas-note">Composición conceptual editable · coordenadas relativas</div>
              </div>
            </div>
          </div>
        </div>

        {!presentation && <aside className="venue-v2__inspector">
          <span className="venue-v2__eyebrow">Inspector</span><h2>{selected?.name || 'Selecciona una mesa'}</h2>
          {!selected ? <p>Haz clic en una mesa para editar sus propiedades.</p> : <>
            <div className="venue-v2__selection-summary"><Users size={15}/><div><strong>{occupancyByTable.get(selected.id) || 0} / {selected.capacity}</strong><span>personas asignadas</span></div></div>
            <label><span>Nombre</span><input value={String(draft.name || '')} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label>
            <div className="venue-v2__form-grid"><label><span>Número</span><input type="number" min="1" value={String(draft.table_number || '')} onChange={(event) => setDraft({ ...draft, table_number: Number(event.target.value) })}/></label><label><span>Zona</span><input value={String(draft.zone || '')} onChange={(event) => setDraft({ ...draft, zone: event.target.value })}/></label></div>
            <label><span>Tipo</span><select value={String(draft.table_type || 'round_guest')} onChange={(event) => setDraft({ ...draft, table_type: event.target.value })}><option value="round_guest">Redonda</option><option value="rectangular_guest">Rectangular / imperial</option></select></label>
            <label><span>Capacidad</span><div className="venue-v2__counter"><button type="button" onClick={() => setDraft({ ...draft, capacity: Math.max(1, number(draft.capacity, selected.capacity) - 1) })}><Minus size={13}/></button><strong>{number(draft.capacity, selected.capacity)}</strong><button type="button" onClick={() => setDraft({ ...draft, capacity: number(draft.capacity, selected.capacity) + 1 })}><Plus size={13}/></button></div></label>
            <label><span>Rotación · {number(draft.rotation)}°</span><input type="range" min="-180" max="180" step="5" value={number(draft.rotation)} onChange={(event) => { const rotation = Number(event.target.value); setDraft({ ...draft, rotation }); patchLocal(selected.id, { rotation }); }}/></label>
            <div className="venue-v2__coords"><span>X {Math.round(number(selected.position_x))}%</span><span>Y {Math.round(number(selected.position_y))}%</span></div>
            <button type="button" className="venue-v2__inspector-button" onClick={() => { const locked = !selected.locked; patchLocal(selected.id, { locked }); setDraft({ ...draft, locked }); }}>{selected.locked ? <Unlock size={13}/> : <Lock size={13}/>} {selected.locked ? 'Desbloquear posición' : 'Bloquear posición'}</button>
            <button type="button" className="venue-v2__inspector-button is-primary" onClick={saveSelected} disabled={saving}><Save size={13}/>Guardar propiedades</button>
          </>}
        </aside>}
      </section>
    </>}
  </div></DashboardLayout>;
}
