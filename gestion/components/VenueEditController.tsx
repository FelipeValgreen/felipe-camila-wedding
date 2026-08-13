'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy,
  EyeOff,
  Layers3,
  Lock,
  Map,
  Plus,
  RotateCcw,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import styles from './VenueEditController.module.css';

type VenueKind = 'stage' | 'dance' | 'bar' | 'entrance' | 'cocktail' | 'lounge' | 'buffet' | 'green';
type VenueElement = {
  id: string;
  kind: VenueKind;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
};
type DragState = { id: string; pointerId: number } | null;

const STORAGE_KEY = 'fc-venue-arboleda-layout-v4';
const ARBOLEDA_PLAN = 'https://static.wixstatic.com/media/85640d_53a2c4d7c999494dbba4bc95c126c80b~mv2.png/v1/fill/w_990%2Ch_655%2Cal_c%2Cq_90%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/PLANO%20ARBOLEDA345.png';

const BASE: VenueElement[] = [
  { id: 'stage-main', kind: 'stage', label: 'Escenario / DJ', x: 55, y: 11, width: 25, height: 8, rotation: 0, locked: false },
  { id: 'dance-main', kind: 'dance', label: 'Pista de baile', x: 58, y: 52, width: 28, height: 28, rotation: 45, locked: false },
  { id: 'bar-main', kind: 'bar', label: 'Bar / apoyo', x: 11, y: 48, width: 10, height: 27, rotation: 0, locked: false },
  { id: 'entrance-main', kind: 'entrance', label: 'Acceso', x: 87, y: 84, width: 15, height: 7, rotation: 0, locked: false },
  { id: 'cocktail-main', kind: 'cocktail', label: 'Cocktail / recepción', x: 21, y: 18, width: 19, height: 10, rotation: 0, locked: false },
  { id: 'green-a', kind: 'green', label: 'Árbol / verde', x: 18, y: 12, width: 4, height: 6, rotation: 0, locked: false },
  { id: 'green-b', kind: 'green', label: 'Árbol / verde', x: 82, y: 14, width: 4, height: 6, rotation: 0, locked: false },
  { id: 'green-c', kind: 'green', label: 'Árbol / verde', x: 19, y: 84, width: 4, height: 6, rotation: 0, locked: false },
];

const PALETTE: Array<{ kind: VenueKind; label: string }> = [
  { kind: 'stage', label: 'Escenario / DJ' }, { kind: 'dance', label: 'Pista' }, { kind: 'bar', label: 'Bar' },
  { kind: 'entrance', label: 'Acceso' }, { kind: 'cocktail', label: 'Cocktail' }, { kind: 'lounge', label: 'Living / lounge' },
  { kind: 'buffet', label: 'Buffet / estación' }, { kind: 'green', label: 'Árbol / planta' },
];

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function defaultFor(kind: VenueKind, index: number): VenueElement {
  const spec: Record<VenueKind, { width: number; height: number }> = {
    stage: { width: 24, height: 8 }, dance: { width: 25, height: 25 }, bar: { width: 10, height: 22 }, entrance: { width: 14, height: 7 },
    cocktail: { width: 18, height: 10 }, lounge: { width: 15, height: 11 }, buffet: { width: 15, height: 8 }, green: { width: 4, height: 6 },
  };
  const item = PALETTE.find((entry) => entry.kind === kind)!;
  return { id: `${kind}-${Date.now()}-${index}`, kind, label: item.label, x: 50, y: 50, width: spec[kind].width, height: spec[kind].height, rotation: 0, locked: false };
}

export default function VenueEditController() {
  const [canvas, setCanvas] = useState<HTMLElement | null>(null);
  const [elements, setElements] = useState<VenueElement[]>(BASE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<DragState>(null);
  const history = useRef<VenueElement[][]>([]);
  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  useEffect(() => {
    try { const stored = window.localStorage.getItem(STORAGE_KEY); if (stored) { const parsed = JSON.parse(stored); if (Array.isArray(parsed) && parsed.length) setElements(parsed); } } catch {}
  }, []);
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(elements)); } catch {} }, [elements]);
  useEffect(() => {
    let stopped = false;
    const locate = () => { if (stopped) return; const found = document.querySelector<HTMLElement>('.venue-v2__canvas'); if (found) { setCanvas(found); return; } window.setTimeout(locate, 100); };
    locate(); return () => { stopped = true; };
  }, []);
  useEffect(() => {
    if (!canvas) return;
    const legacy = Array.from(canvas.querySelectorAll<HTMLElement>('.venue-v2__zone, .venue-v2__dance, .venue-v2__green'));
    const previous = legacy.map((item) => item.style.display); legacy.forEach((item) => { item.style.display = 'none'; });
    return () => legacy.forEach((item, index) => { item.style.display = previous[index] || ''; });
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;
    function move(event: PointerEvent) {
      const active = drag.current; if (!active) return;
      const item = elementsRef.current.find((entry) => entry.id === active.id); if (!item || item.locked) return;
      const bounds = canvas!.getBoundingClientRect();
      const x = clamp(((event.clientX - bounds.left) / bounds.width) * 100, item.width / 2, 100 - item.width / 2);
      const y = clamp(((event.clientY - bounds.top) / bounds.height) * 100, item.height / 2, 100 - item.height / 2);
      setElements((current) => current.map((entry) => entry.id === active.id ? { ...entry, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) } : entry));
      event.preventDefault();
    }
    function up(event: PointerEvent) { if (!drag.current) return; drag.current = null; setIsDragging(false); event.preventDefault(); }
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up, { passive: false });
    window.addEventListener('pointercancel', up, { passive: false });
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [canvas]);

  const selected = useMemo(() => elements.find((item) => item.id === selectedId) || null, [elements, selectedId]);
  function checkpoint() { history.current.push(elements.map((item) => ({ ...item }))); if (history.current.length > 30) history.current.shift(); }
  function update(id: string, patch: Partial<VenueElement>) { setElements((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item)); }
  function startDrag(event: React.PointerEvent<HTMLButtonElement>, item: VenueElement) {
    setSelectedId(item.id); if (item.locked) return; checkpoint(); drag.current = { id: item.id, pointerId: event.pointerId }; setIsDragging(true); event.preventDefault(); event.stopPropagation();
  }
  function add(kind: VenueKind) { checkpoint(); const next = defaultFor(kind, elements.length + 1); setElements((current) => [...current, next]); setSelectedId(next.id); setAddOpen(false); }
  function duplicate() { if (!selected) return; checkpoint(); const copy = { ...selected, id: `${selected.kind}-${Date.now()}`, label: `${selected.label} copia`, x: clamp(selected.x + 4, 5, 95), y: clamp(selected.y + 4, 5, 95), locked: false }; setElements((current) => [...current, copy]); setSelectedId(copy.id); }
  function remove() { if (!selected) return; checkpoint(); setElements((current) => current.filter((item) => item.id !== selected.id)); setSelectedId(null); }
  function reset() { checkpoint(); setElements(BASE.map((item) => ({ ...item }))); setSelectedId(null); }
  function undo() { const previous = history.current.pop(); if (previous) { setElements(previous); setSelectedId(null); } }

  if (!canvas) return null;
  const overlay = <>
    {showReference && <div className={styles.reference} aria-hidden="true"><img src={ARBOLEDA_PLAN} alt=""/><span>Plano general oficial · Arboleda Chicureo</span></div>}
    <div className={`${styles.editBanner} ${isDragging ? styles.draggingBanner : ''}`}>{isDragging ? 'Moviendo elemento… suelta para dejarlo aquí' : 'Modo edición activo · arrastra pista, escenario, bar, acceso, cocktail o vegetación'}</div>
    <div className={styles.objects}>{elements.map((item) => <button type="button" key={item.id}
      className={`${styles.object} ${styles[item.kind]} ${selectedId === item.id ? styles.selected : ''} ${item.locked ? styles.locked : ''}`}
      style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%`, transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }}
      onPointerDown={(event) => startDrag(event, item)} onClick={() => setSelectedId(item.id)} title={item.locked ? `${item.label} bloqueado` : `Arrastra para mover ${item.label}`}
    ><span style={{ transform: `rotate(${-item.rotation}deg)` }}>{item.label}</span>{item.locked && <Lock size={10}/>}</button>)}</div>
    <div className={styles.canvasTools}><button type="button" onClick={() => setShowReference((value) => !value)}>{showReference ? <EyeOff size={13}/> : <Map size={13}/>} {showReference ? 'Ocultar plano oficial' : 'Plano oficial Arboleda'}</button><button type="button" onClick={() => setPanelOpen((value) => !value)}><Layers3 size={13}/> Elementos</button></div>
  </>;

  return <>{createPortal(overlay, canvas)}{panelOpen && <aside className={styles.panel}>
    <header><div><span>Editor de capas</span><strong>Elementos del salón</strong><small>Arrastra directamente sobre el plano · autosave local</small></div><button type="button" onClick={() => setPanelOpen(false)}><X size={16}/></button></header>
    <div className={styles.topActions}><button type="button" onClick={() => setAddOpen((value) => !value)}><Plus size={13}/>Agregar</button><button type="button" onClick={undo} disabled={!history.current.length}><RotateCcw size={13}/>Deshacer</button><button type="button" onClick={reset}><RotateCcw size={13}/>Base Arboleda</button></div>
    {addOpen && <div className={styles.palette}>{PALETTE.map((entry) => <button type="button" key={entry.kind} onClick={() => add(entry.kind)}>{entry.label}</button>)}</div>}
    <div className={styles.list}>{elements.map((item) => <button type="button" key={item.id} className={selectedId === item.id ? styles.activeRow : ''} onClick={() => setSelectedId(item.id)}><span>{item.label}</span><small>{Math.round(item.x)}% · {Math.round(item.y)}%</small></button>)}</div>
    {!selected ? <div className={styles.empty}>Selecciona un elemento del plano para moverlo, redimensionarlo, rotarlo o bloquearlo.</div> : <div className={styles.inspector}>
      <label><span>Nombre</span><input value={selected.label} onChange={(event) => update(selected.id, { label: event.target.value })}/></label>
      <div className={styles.grid2}><label><span>Ancho</span><input type="number" min="3" max="60" value={selected.width} onChange={(event) => update(selected.id, { width: clamp(Number(event.target.value) || 3, 3, 60) })}/></label><label><span>Alto</span><input type="number" min="3" max="60" value={selected.height} onChange={(event) => update(selected.id, { height: clamp(Number(event.target.value) || 3, 3, 60) })}/></label></div>
      <label><span>Rotación · {Math.round(selected.rotation)}°</span><input type="range" min="-180" max="180" step="5" value={selected.rotation} onChange={(event) => update(selected.id, { rotation: Number(event.target.value) })}/></label>
      <div className={styles.coords}><span>X {Math.round(selected.x)}%</span><span>Y {Math.round(selected.y)}%</span></div>
      <div className={styles.inspectorActions}><button type="button" onClick={() => update(selected.id, { locked: !selected.locked })}>{selected.locked ? <Unlock size={13}/> : <Lock size={13}/>} {selected.locked ? 'Desbloquear' : 'Bloquear'}</button><button type="button" onClick={duplicate}><Copy size={13}/>Duplicar</button><button type="button" className={styles.danger} onClick={remove}><Trash2 size={13}/>Eliminar</button></div>
    </div>}
    <footer><strong>Referencia real</strong><span>El plano oficial del recinto se puede superponer como guía. La distribución interior se mantiene editable hasta reconciliar el material exacto de montaje.</span></footer>
  </aside>}</>;
}
