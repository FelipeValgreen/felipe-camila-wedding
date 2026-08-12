'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  GripVertical,
  Loader2,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Unlock,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import './tables-v2.css';
import './tables-v3.css';

interface TableItem {
  id: string;
  table_number: number;
  name: string;
  capacity: number;
  table_type: string;
  zone: string;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  rotation?: number;
  locked: boolean;
  notes: string | null;
}

interface GuestItem {
  id: string;
  first_name: string;
  last_name: string;
  group_name: string;
  family_side: string;
  guest_category: string;
  attendance_status: string;
  dietary_type: string | null;
  dietary_detail: string | null;
  table_id: string | null;
  guest_status: string;
}

interface SeatingAssignment {
  id: string;
  guest_id: string;
  table_id: string;
  seat_number: number | null;
}

interface ManagementSummary {
  rsvpAttending: number;
  rsvpMatched: number;
  rsvpNeedsReview: number;
  rsvpUnmatched: number;
  reconciliationPending: number;
  rsvpResponses: number;
  sheetSynced: number;
  sheetPending: number;
  activeAttendingGuests: number;
  openIssues: number;
  lastRsvpUpdateAt: string | null;
}

type Message = { type: 'success' | 'error' | 'info'; text: string };
type GuestFilter = 'all' | 'unassigned' | 'assigned' | 'dietary';
type WorkspaceView = 'distribution' | 'venue';

type TablePreset = {
  label: string;
  capacity: number;
  table_type: string;
  width: number;
  height: number;
};

const tablePresets: TablePreset[] = [
  { label: 'Redonda 10', capacity: 10, table_type: 'round_guest', width: 10, height: 10 },
  { label: 'Redonda 8', capacity: 8, table_type: 'round_guest', width: 9, height: 9 },
  { label: 'Mesa imperial', capacity: 10, table_type: 'rectangular_guest', width: 18, height: 8 },
];

const tableFallbackPositions = [
  { left: 18, top: 24 },
  { left: 42, top: 24 },
  { left: 68, top: 24 },
  { left: 22, top: 62 },
  { left: 50, top: 64 },
  { left: 78, top: 62 },
  { left: 34, top: 43 },
  { left: 68, top: 43 },
];

function guestName(guest: GuestItem): string {
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
}

function guestInitial(guest: GuestItem): string {
  return (guest.first_name || guest.last_name || '?').slice(0, 1).toUpperCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatLastUpdate(value: string | null) {
  if (!value) return 'Sin dato';
  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Santiago',
    }).format(new Date(value));
  } catch {
    return 'Actualizado';
  }
}

function ChairRing({ occupied, capacity }: { occupied: number; capacity: number }) {
  const visible = Math.min(Math.max(capacity, 1), 12);
  return (
    <>
      {Array.from({ length: visible }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / visible - Math.PI / 2;
        const radius = 51;
        const left = 32 + Math.cos(angle) * radius;
        const top = 32 + Math.sin(angle) * radius;
        return (
          <span
            key={index}
            aria-hidden="true"
            className={`tables-v2__chair ${index < occupied ? 'tables-v2__chair--occupied' : ''}`}
            style={{ left, top }}
          />
        );
      })}
    </>
  );
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [assignments, setAssignments] = useState<SeatingAssignment[]>([]);
  const [summary, setSummary] = useState<ManagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('distribution');
  const [guestFilter, setGuestFilter] = useState<GuestFilter>('unassigned');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTableByGuest, setSelectedTableByGuest] = useState<Record<string, string>>({});
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tableDraft, setTableDraft] = useState<Partial<TableItem>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [zoom, setZoom] = useState(0.9);
  const [presentationMode, setPresentationMode] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const draggingTableRef = useRef<{ id: string; pointerId: number } | null>(null);

  useEffect(() => {
    setPreviewMode(window.location.hostname !== 'gestion.felipeycami.cl');
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const [tablesResult, guestsResult, assignmentsResult, summaryResponse] = await Promise.all([
        supabase.from('wedding_tables').select('*').order('table_number', { ascending: true }),
        supabase
          .from('wedding_guests')
          .select('id, first_name, last_name, group_name, family_side, guest_category, attendance_status, dietary_type, dietary_detail, table_id, guest_status')
          .eq('attendance_status', 'attending')
          .eq('guest_status', 'active')
          .order('first_name', { ascending: true }),
        supabase.from('seating_assignments').select('*'),
        fetch('/api/management-summary', { cache: 'no-store' }),
      ]);

      const errors = [tablesResult.error, guestsResult.error, assignmentsResult.error].filter(Boolean);
      if (errors.length) throw new Error(errors.map((error) => error?.message).join(' · '));

      const nextTables = (tablesResult.data || []) as TableItem[];
      const nextGuests = (guestsResult.data || []) as GuestItem[];
      const nextAssignments = (assignmentsResult.data || []) as SeatingAssignment[];
      const summaryPayload = await summaryResponse.json().catch(() => null);

      setTables(nextTables);
      setGuests(nextGuests);
      setAssignments(nextAssignments);
      if (summaryResponse.ok && summaryPayload?.ok) setSummary(summaryPayload.summary);
      setSelectedTableByGuest(Object.fromEntries(nextAssignments.map((assignment) => [assignment.guest_id, assignment.table_id])));

      setSelectedTableId((current) => {
        const nextId = current && nextTables.some((table) => table.id === current)
          ? current
          : nextTables[0]?.id || null;
        const selected = nextTables.find((table) => table.id === nextId);
        setTableDraft(selected ? { ...selected } : {});
        return nextId;
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible cargar invitados, RSVP y mesas.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const assignmentByGuest = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.guest_id, assignment])),
    [assignments],
  );

  const guestsByTable = useMemo(() => {
    const map = new Map<string, GuestItem[]>();
    tables.forEach((table) => map.set(table.id, []));
    guests.forEach((guest) => {
      const tableId = assignmentByGuest.get(guest.id)?.table_id || guest.table_id;
      if (tableId && map.has(tableId)) map.get(tableId)?.push(guest);
    });
    return map;
  }, [tables, guests, assignmentByGuest]);

  const stats = useMemo(() => {
    const capacity = tables.reduce((sum, table) => sum + Number(table.capacity || 0), 0);
    const assigned = guests.filter((guest) => Boolean(assignmentByGuest.get(guest.id) || guest.table_id)).length;
    const dietary = guests.filter((guest) => guest.dietary_type && guest.dietary_type !== 'Ninguna').length;
    const reconciled = summary?.rsvpMatched ?? guests.length;
    const rsvpConfirmed = summary?.rsvpAttending ?? guests.length;
    const reconciliationPending = summary?.reconciliationPending ?? Math.max(0, rsvpConfirmed - reconciled);
    return {
      rsvpConfirmed,
      reconciled,
      reconciliationPending,
      assigned,
      unassigned: Math.max(0, guests.length - assigned),
      capacity,
      available: capacity - assigned,
      dietary,
    };
  }, [tables, guests, assignmentByGuest, summary]);

  const filteredGuests = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return guests.filter((guest) => {
      const assigned = Boolean(assignmentByGuest.get(guest.id) || guest.table_id);
      const matchesSearch = !term || `${guestName(guest)} ${guest.group_name} ${guest.family_side}`.toLowerCase().includes(term);
      if (!matchesSearch) return false;
      if (guestFilter === 'unassigned') return !assigned;
      if (guestFilter === 'assigned') return assigned;
      if (guestFilter === 'dietary') return Boolean(guest.dietary_type && guest.dietary_type !== 'Ninguna');
      return true;
    });
  }, [guests, searchTerm, guestFilter, assignmentByGuest]);

  const selectedTable = tables.find((table) => table.id === selectedTableId) || null;
  const selectedOccupants = selectedTable ? guestsByTable.get(selectedTable.id) || [] : [];

  function selectTable(table: TableItem) {
    setSelectedTableId(table.id);
    setTableDraft({ ...table });
  }

  function replaceTableLocally(id: string, updates: Partial<TableItem>) {
    setTables((current) => current.map((table) => table.id === id ? { ...table, ...updates } : table));
    if (selectedTableId === id) setTableDraft((current) => ({ ...current, ...updates }));
  }

  function previewNotice(text: string) {
    setMessage({ type: 'info', text: `${text} En Preview el cambio es local; producción permanece intacta.` });
  }

  async function createTablePreset(preset: TablePreset = tablePresets[0]) {
    const nextNumber = tables.length ? Math.max(...tables.map((table) => Number(table.table_number) || 0)) + 1 : 1;
    const fallback = tableFallbackPositions[tables.length % tableFallbackPositions.length];
    const draft: Omit<TableItem, 'id'> = {
      table_number: nextNumber,
      name: `Mesa ${nextNumber}`,
      capacity: preset.capacity,
      table_type: preset.table_type,
      zone: 'Salón principal',
      position_x: fallback.left,
      position_y: fallback.top,
      width: preset.width,
      height: preset.height,
      rotation: 0,
      locked: false,
      notes: null,
    };

    if (previewMode) {
      const table: TableItem = { ...draft, id: `preview-${Date.now()}-${nextNumber}` };
      setTables((current) => [...current, table]);
      selectTable(table);
      previewNotice(`${preset.label} agregada como ${table.name}.`);
      return;
    }

    setBusyKey('create-table');
    try {
      const response = await fetch('/api/tables', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible crear la mesa.');
      await loadData();
      selectTable(payload.table);
      setMessage({ type: 'success', text: `${payload.table.name} creada correctamente.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible crear la mesa.' });
    } finally { setBusyKey(null); }
  }

  async function saveTable() {
    if (!selectedTable || !tableDraft.name) return;
    const updates: Partial<TableItem> = {
      table_number: Number(tableDraft.table_number || selectedTable.table_number),
      name: tableDraft.name,
      capacity: Number(tableDraft.capacity || selectedTable.capacity),
      table_type: tableDraft.table_type || selectedTable.table_type,
      zone: tableDraft.zone || 'Salón principal',
      position_x: Number(tableDraft.position_x ?? selectedTable.position_x),
      position_y: Number(tableDraft.position_y ?? selectedTable.position_y),
      width: Number(tableDraft.width ?? selectedTable.width ?? 10),
      height: Number(tableDraft.height ?? selectedTable.height ?? 10),
      rotation: Number(tableDraft.rotation ?? selectedTable.rotation ?? 0),
      locked: Boolean(tableDraft.locked),
      notes: tableDraft.notes || null,
    };

    if (previewMode || selectedTable.id.startsWith('preview-')) {
      replaceTableLocally(selectedTable.id, updates);
      previewNotice(`${updates.name} actualizada.`);
      return;
    }

    setBusyKey(`save-${selectedTable.id}`);
    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedTable.id, ...updates }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la mesa.');
      replaceTableLocally(selectedTable.id, payload.table);
      setMessage({ type: 'success', text: `${payload.table.name} actualizada.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible guardar la mesa.' });
    } finally { setBusyKey(null); }
  }

  async function persistPosition(table: TableItem) {
    if (previewMode || table.id.startsWith('preview-')) {
      previewNotice(`${table.name} movida en el plano.`);
      return;
    }
    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: table.id, position_x: table.position_x, position_y: table.position_y }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la posición.');
      replaceTableLocally(table.id, payload.table);
      setMessage({ type: 'success', text: `${table.name}: posición guardada.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible guardar la posición.' });
    }
  }

  async function toggleTableLock(table: TableItem) {
    const nextLocked = !table.locked;
    if (previewMode || table.id.startsWith('preview-')) {
      replaceTableLocally(table.id, { locked: nextLocked });
      previewNotice(nextLocked ? `${table.name} bloqueada.` : `${table.name} desbloqueada.`);
      return;
    }
    setBusyKey(`lock-${table.id}`);
    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: table.id, locked: nextLocked }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible cambiar el bloqueo.');
      replaceTableLocally(table.id, payload.table);
      setMessage({ type: 'success', text: payload.table.locked ? 'Mesa bloqueada en el plano.' : 'Mesa desbloqueada.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible cambiar el bloqueo.' });
    } finally { setBusyKey(null); }
  }

  async function deleteTable(table: TableItem) {
    const occupancy = guestsByTable.get(table.id)?.length || 0;
    if (occupancy) {
      setMessage({ type: 'error', text: `Reasigna primero las ${occupancy} persona(s) de ${table.name}.` });
      return;
    }
    if (!window.confirm(`¿Eliminar ${table.name}?`)) return;

    if (previewMode || table.id.startsWith('preview-')) {
      setTables((current) => current.filter((item) => item.id !== table.id));
      setSelectedTableId(null);
      setTableDraft({});
      previewNotice(`${table.name} eliminada.`);
      return;
    }

    setBusyKey(`delete-${table.id}`);
    try {
      const response = await fetch(`/api/tables?id=${table.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible eliminar la mesa.');
      setTables((current) => current.filter((item) => item.id !== table.id));
      setSelectedTableId(null);
      setTableDraft({});
      setMessage({ type: 'success', text: `${table.name} eliminada.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible eliminar la mesa.' });
    } finally { setBusyKey(null); }
  }

  async function assignGuestToTable(guest: GuestItem, tableId: string) {
    if (!tableId) return;
    const table = tables.find((item) => item.id === tableId);
    if (!table) return;
    const occupancy = guestsByTable.get(tableId)?.length || 0;
    const existing = assignmentByGuest.get(guest.id);
    if (!existing && occupancy >= table.capacity) {
      setMessage({ type: 'error', text: `${table.name} ya está completa.` });
      return;
    }

    if (previewMode || tableId.startsWith('preview-')) {
      setAssignments((current) => {
        const withoutGuest = current.filter((item) => item.guest_id !== guest.id);
        return [...withoutGuest, { id: existing?.id || `preview-assignment-${guest.id}`, guest_id: guest.id, table_id: tableId, seat_number: null }];
      });
      setSelectedTableByGuest((current) => ({ ...current, [guest.id]: tableId }));
      previewNotice(`${guestName(guest)} asignado/a a ${table.name}.`);
      return;
    }

    setBusyKey(`guest-${guest.id}`);
    try {
      const response = await fetch('/api/seating', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guest_id: guest.id, table_id: tableId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la asignación.');
      await loadData();
      setMessage({ type: 'success', text: `${guestName(guest)} asignado/a a ${table.name}.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible guardar la asignación.' });
    } finally { setBusyKey(null); }
  }

  async function assignGuest(guest: GuestItem) {
    await assignGuestToTable(guest, selectedTableByGuest[guest.id]);
  }

  async function unassignGuest(guest: GuestItem) {
    if (previewMode || assignmentByGuest.get(guest.id)?.id?.startsWith('preview-')) {
      setAssignments((current) => current.filter((item) => item.guest_id !== guest.id));
      setSelectedTableByGuest((current) => ({ ...current, [guest.id]: '' }));
      previewNotice(`${guestName(guest)} volvió al banco sin mesa.`);
      return;
    }

    setBusyKey(`guest-${guest.id}`);
    try {
      const response = await fetch(`/api/seating?guest_id=${guest.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible quitar la asignación.');
      await loadData();
      setMessage({ type: 'success', text: `${guestName(guest)} volvió al banco sin mesa.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible quitar la asignación.' });
    } finally { setBusyKey(null); }
  }

  function adjustCapacity(delta: number) {
    const current = Number(tableDraft.capacity || selectedTable?.capacity || 10);
    setTableDraft({ ...tableDraft, capacity: Math.max(1, Math.min(30, current + delta)) });
  }

  function handleFloorPointerDown(event: React.PointerEvent<HTMLButtonElement>, table: TableItem) {
    selectTable(table);
    if (table.locked) return;
    draggingTableRef.current = { id: table.id, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handleFloorPointerMove(event: React.PointerEvent<HTMLButtonElement>, table: TableItem) {
    if (!draggingTableRef.current || draggingTableRef.current.id !== table.id || table.locked || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 6, 94);
    const y = clamp(((event.clientY - bounds.top) / bounds.height) * 100, 8, 90);
    replaceTableLocally(table.id, { position_x: Number(x.toFixed(2)), position_y: Number(y.toFixed(2)) });
  }

  async function handleFloorPointerUp(event: React.PointerEvent<HTMLButtonElement>, tableId: string) {
    if (!draggingTableRef.current || draggingTableRef.current.id !== tableId) return;
    draggingTableRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const moved = tables.find((table) => table.id === tableId);
    if (moved) await persistPosition(moved);
  }

  function handleGuestDragStart(event: React.DragEvent<HTMLElement>, guest: GuestItem) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-wedding-guest', guest.id);
  }

  async function handleGuestDrop(event: React.DragEvent<HTMLElement>, table: TableItem) {
    event.preventDefault();
    const guestId = event.dataTransfer.getData('application/x-wedding-guest');
    const guest = guests.find((item) => item.id === guestId);
    if (guest) await assignGuestToTable(guest, table.id);
  }

  function resetPreview() {
    if (!previewMode) return;
    if (!window.confirm('¿Restablecer los cambios locales y volver a los datos reales?')) return;
    loadData();
  }

  return (
    <DashboardLayout>
      <div className="tables-v2 tables-v3">
        <section className="tables-v2__hero tables-v3__hero">
          <div>
            <span className="tables-v2__eyebrow">Personas y espacio</span>
            <h1 className="tables-v2__title">Mesas</h1>
            <p className="tables-v2__lead">
              Organiza los invitados ya conciliados y mantén el plano conectado a la información real de RSVP.
            </p>
          </div>
          <div className="tables-v2__actions">
            {previewMode && <span className="tables-v3__preview-chip">Preview · cambios locales</span>}
            <button className="tables-v2__button" type="button" onClick={() => loadData()}><RefreshCw size={14}/>Actualizar datos</button>
            {previewMode && <button className="tables-v2__button" type="button" onClick={resetPreview}><RotateCcw size={14}/>Restablecer</button>}
            <button className="tables-v2__button tables-v2__button--primary" type="button" onClick={() => createTablePreset()} disabled={busyKey === 'create-table'}>
              {busyKey === 'create-table' ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Nueva mesa
            </button>
          </div>
        </section>

        {message && (
          <div className={`tables-v2__message tables-v2__message--${message.type}`}>
            {message.type === 'success' ? <CheckCircle2 size={16}/> : message.type === 'error' ? <XCircle size={16}/> : <AlertTriangle size={16}/>} {message.text}
          </div>
        )}

        <section className="tables-v3__source-strip">
          <div><span>RSVP confirmados</span><strong>{stats.rsvpConfirmed}</strong></div>
          <div><span>Listos para sentar</span><strong>{stats.reconciled}</strong></div>
          <div className={stats.reconciliationPending ? 'is-attention' : ''}><span>Pendientes de conciliación</span><strong>{stats.reconciliationPending}</strong></div>
          <div><span>Google Sheets</span><strong>{summary ? `${summary.sheetSynced}/${summary.rsvpResponses}` : '—'}</strong><small>{summary?.sheetPending ? `${summary.sheetPending} pendientes` : 'sincronizado'}</small></div>
          <div><span>Último RSVP</span><strong className="tables-v3__date-value">{formatLastUpdate(summary?.lastRsvpUpdateAt || null)}</strong></div>
          {stats.reconciliationPending > 0 && <button type="button" onClick={() => window.location.href = '/dashboard/issues'}>Revisar pendientes →</button>}
        </section>

        <section className="tables-v2__metrics tables-v3__metrics" aria-label="Resumen operativo de mesas">
          <div className="tables-v2__metric"><span>Confirmados RSVP</span><strong>{stats.rsvpConfirmed}</strong><small>fuente RSVP</small></div>
          <div className="tables-v2__metric"><span>Conciliados</span><strong>{stats.reconciled}</strong><small>ficha maestra</small></div>
          <div className={`tables-v2__metric ${stats.unassigned ? 'tables-v2__metric--attention' : ''}`}><span>Sin mesa</span><strong>{stats.unassigned}</strong><small>de {guests.length} disponibles</small></div>
          <div className="tables-v2__metric"><span>Asignados</span><strong>{stats.assigned}</strong><small>{guests.length ? Math.round((stats.assigned / guests.length) * 100) : 0}% de conciliados</small></div>
          <div className="tables-v2__metric"><span>Capacidad actual</span><strong>{stats.capacity}</strong><small>{stats.available} cupos libres</small></div>
        </section>

        <section className="tables-v2__workflow" aria-label="Flujo de invitados a salón">
          <button className="tables-v2__step" type="button" onClick={() => window.location.href='/dashboard/guests'}><span className="tables-v2__step-index">1</span><span><strong>Invitados</strong><small>RSVP y conciliación</small></span></button>
          <button className={`tables-v2__step ${workspaceView === 'distribution' ? 'tables-v2__step--active' : ''}`} type="button" onClick={() => setWorkspaceView('distribution')}><span className="tables-v2__step-index">2</span><span><strong>Distribuir</strong><small>Personas y mesas</small></span></button>
          <button className={`tables-v2__step ${workspaceView === 'venue' ? 'tables-v2__step--active' : ''}`} type="button" onClick={() => setWorkspaceView('venue')}><span className="tables-v2__step-index">3</span><span><strong>Salón</strong><small>Plano interactivo</small></span></button>
        </section>

        {loading ? (
          <div className="tables-v2__empty tables-v3__loading"><Loader2 className="mx-auto mb-2 animate-spin" size={20}/>Cargando información real de RSVP, invitados y mesas…</div>
        ) : workspaceView === 'distribution' ? (
          <section className="tables-v2__distribution tables-v3__distribution">
            <aside className="tables-v2__panel tables-v3__bank">
              <div className="tables-v2__panel-head"><span className="tables-v2__label">Invitados conciliados</span><h2>{stats.unassigned} sin mesa</h2><p>Los {stats.reconciliationPending} RSVP aún no conciliados se gestionan en “Necesita atención” antes de poder sentarlos.</p></div>
              <div className="tables-v2__search"><Search size={14}/><input value={searchTerm} onChange={(event)=>setSearchTerm(event.target.value)} placeholder="Buscar persona o grupo…"/></div>
              <div className="tables-v2__filters">
                {([['unassigned',`Sin mesa ${stats.unassigned}`],['assigned',`Con mesa ${stats.assigned}`],['dietary',`Restricciones ${stats.dietary}`],['all','Todos']] as Array<[GuestFilter,string]>).map(([key,label]) => (
                  <button key={key} type="button" className={`tables-v2__filter ${guestFilter===key?'tables-v2__filter--active':''}`} onClick={()=>setGuestFilter(key)}>{label}</button>
                ))}
              </div>
              <div className="tables-v2__guest-list tables-v3__guest-list">
                {filteredGuests.map((guest)=>{
                  const currentAssignment = assignmentByGuest.get(guest.id);
                  const currentTableId = currentAssignment?.table_id || guest.table_id || '';
                  const selectedValue = selectedTableByGuest[guest.id] || currentTableId;
                  return <article key={guest.id} draggable onDragStart={(event)=>handleGuestDragStart(event, guest)} className="tables-v2__guest-card tables-v3__guest-card">
                    <span className="tables-v3__drag"><GripVertical size={14}/></span>
                    <span className="tables-v2__guest-avatar">{guestInitial(guest)}</span>
                    <div className="tables-v3__guest-copy"><strong>{guestName(guest)}</strong><small>{guest.group_name || guest.family_side || 'Sin grupo'}{guest.dietary_type && guest.dietary_type !== 'Ninguna' ? ` · ${guest.dietary_type}` : ''}</small></div>
                    <div className="tables-v2__guest-actions">
                      <select value={selectedValue} onChange={(event)=>setSelectedTableByGuest((current)=>({...current,[guest.id]:event.target.value}))}>
                        <option value="">Elegir mesa…</option>
                        {tables.map((table)=>{const occupancy=guestsByTable.get(table.id)?.length||0; return <option key={table.id} value={table.id} disabled={occupancy>=table.capacity && table.id!==currentTableId}>{table.name} · {occupancy}/{table.capacity}</option>;})}
                      </select>
                      <button type="button" disabled={!selectedValue || busyKey===`guest-${guest.id}`} onClick={()=>assignGuest(guest)}>{currentTableId ? 'Mover' : 'Asignar'}</button>
                    </div>
                  </article>;
                })}
                {!filteredGuests.length && <div className="tables-v2__empty">No hay personas en esta vista.</div>}
              </div>
            </aside>

            <div className="tables-v2__tables tables-v3__tables">
              <div className="tables-v2__tables-head"><div><span className="tables-v2__label">Distribución</span><h2>{tables.length} mesas configuradas</h2></div><p>Arrastra una persona sobre una mesa o usa el selector.</p></div>
              <div className="tables-v2__table-grid tables-v3__table-grid">
                {tables.map((table)=>{
                  const occupants=guestsByTable.get(table.id)||[];
                  const full=occupants.length===table.capacity;
                  const over=occupants.length>table.capacity;
                  const progress=Math.min(100,(occupants.length/Math.max(1,table.capacity))*100);
                  return <button
                    key={table.id}
                    type="button"
                    onDragOver={(event)=>{event.preventDefault(); event.dataTransfer.dropEffect='move';}}
                    onDrop={(event)=>handleGuestDrop(event,table)}
                    onClick={()=>selectTable(table)}
                    className={`tables-v2__table-card tables-v3__table-card ${selectedTableId===table.id?'tables-v2__table-card--selected':''} ${full?'tables-v2__table-card--full':''}`}
                  >
                    <div className="tables-v2__table-top"><strong>{table.name}</strong><span style={{color:over?'var(--workspace-danger)':undefined}}>{occupants.length}/{table.capacity}</span></div>
                    <div className="tables-v2__progress"><span style={{width:`${progress}%`,background:over?'var(--workspace-danger)':undefined}}/></div>
                    <div className="tables-v2__table-meta"><span>{table.zone || 'Salón principal'}</span><span>{table.locked ? 'Bloqueada' : `${Math.max(0,table.capacity-occupants.length)} lugares`}</span></div>
                    <div className="tables-v3__mini-people">
                      {occupants.slice(0,4).map((guest)=><span key={guest.id} title={guestName(guest)}>{guestInitial(guest)}</span>)}
                      {occupants.length>4 && <span>+{occupants.length-4}</span>}
                    </div>
                    <span className={`tables-v2__status ${full?'tables-v2__status--full':''}`}>{over?'Sobrecupo':full?'Completa':occupants.length?'En progreso':'Vacía'}</span>
                  </button>;
                })}
                {!tables.length && <div className="tables-v2__empty">Aún no hay mesas. Crea una para empezar.</div>}
              </div>
            </div>

            <aside className="tables-v2__panel tables-v2__inspector tables-v3__inspector">
              {!selectedTable ? <div className="tables-v2__empty">Selecciona una mesa para editarla.</div> : <>
                <span className="tables-v2__label">Mesa seleccionada</span><h2>{selectedTable.name}</h2><span className="tables-v2__inspector-sub">{selectedOccupants.length} de {selectedTable.capacity} lugares ocupados</span>
                <div className="tables-v2__divider"/>
                <span className="tables-v2__label">Personas</span><div className="tables-v2__people">
                  {selectedOccupants.map((guest)=><div key={guest.id} className="tables-v2__person"><span>{guestInitial(guest)}</span><strong>{guestName(guest)}</strong><button type="button" onClick={()=>unassignGuest(guest)} aria-label={`Quitar a ${guestName(guest)}`}><Trash2 size={12}/></button></div>)}
                  {!selectedOccupants.length && <span className="tables-v2__inspector-sub">Aún no hay personas asignadas.</span>}
                </div>
                <div className="tables-v2__divider"/>
                <div className="tables-v2__field"><label>Nombre</label><input value={tableDraft.name||''} onChange={(event)=>setTableDraft({...tableDraft,name:event.target.value})}/></div>
                <div className="tables-v2__field"><label>Capacidad</label><div className="tables-v2__counter"><button type="button" onClick={()=>adjustCapacity(-1)}><Minus size={14}/></button><span>{Number(tableDraft.capacity||10)}</span><button type="button" onClick={()=>adjustCapacity(1)}><Plus size={14}/></button></div></div>
                <div className="tables-v2__field"><label>Zona</label><input value={tableDraft.zone||''} onChange={(event)=>setTableDraft({...tableDraft,zone:event.target.value})}/></div>
                <button type="button" className="tables-v2__button tables-v2__button--primary tables-v2__continue" onClick={saveTable} disabled={busyKey===`save-${selectedTable.id}`}><Save size={13}/>Guardar cambios</button>
                <button type="button" className="tables-v2__button tables-v2__continue" onClick={()=>setWorkspaceView('venue')}>Continuar al salón →</button>
              </>}
            </aside>
          </section>
        ) : (
          <section className={`tables-v2__editor tables-v3__editor ${presentationMode?'tables-v3__editor--presentation':''}`}>
            {!presentationMode && <aside className="tables-v2__palette tables-v3__palette">
              <span className="tables-v2__label">Agregar mesas</span><h3>Biblioteca</h3><p className="tables-v3__palette-help">Los elementos disponibles aquí son funcionales. Los objetos decorativos se agregarán cuando tengan persistencia real.</p>
              <div className="tables-v2__palette-section"><span>Mesas</span>{tablePresets.map((preset)=><button key={preset.label} type="button" className="tables-v2__palette-item" onClick={()=>createTablePreset(preset)}><Plus size={11}/>{preset.label}</button>)}</div>
              <div className="tables-v3__tip"><strong>Cómo mover</strong><span>Arrastra cualquier mesa directamente en el plano. Bloquéala cuando termines.</span></div>
            </aside>}

            <div className="tables-v2__canvas-wrap tables-v3__canvas-wrap">
              <div className="tables-v2__canvas-toolbar tables-v3__toolbar">
                <button type="button" className="tables-v2__tool tables-v2__tool--active">Seleccionar</button>
                <button type="button" className="tables-v2__tool" onClick={()=>createTablePreset()}><Plus size={12}/> Mesa</button>
                <span className="tables-v3__toolbar-divider"/>
                <button type="button" className="tables-v2__tool" onClick={()=>setZoom((value)=>clamp(Number((value-.1).toFixed(2)),.6,1.25))} aria-label="Alejar"><ZoomOut size={13}/></button>
                <span className="tables-v3__zoom-value">{Math.round(zoom*100)}%</span>
                <button type="button" className="tables-v2__tool" onClick={()=>setZoom((value)=>clamp(Number((value+.1).toFixed(2)),.6,1.25))} aria-label="Acercar"><ZoomIn size={13}/></button>
                <button type="button" className="tables-v2__tool" onClick={()=>setZoom(.9)}>Ajustar</button>
                <button type="button" className="tables-v2__tool tables-v3__presentation-toggle" onClick={()=>setPresentationMode((value)=>!value)}><Eye size={13}/>{presentationMode?'Editar':'Presentación'}</button>
              </div>
              <div className="tables-v3__canvas-viewport">
                <div className="tables-v3__canvas-stage" style={{ transform:`scale(${zoom})` }}>
                  <div ref={canvasRef} className="tables-v2__canvas tables-v3__canvas">
                    <div className="tables-v2__venue-object tables-v2__venue-object--stage">Escenario / DJ</div>
                    <div className="tables-v2__venue-object tables-v2__venue-object--bar">Bar</div>
                    <div className="tables-v2__venue-object tables-v2__venue-object--entrance">Entrada</div>
                    <div className="tables-v2__dance-floor">Pista de baile</div>
                    {tables.map((table,index)=>{
                      const occupants=guestsByTable.get(table.id)?.length||0;
                      const fallback=tableFallbackPositions[index%tableFallbackPositions.length];
                      const left=clamp(Number(table.position_x)||fallback.left,6,94);
                      const top=clamp(Number(table.position_y)||fallback.top,8,90);
                      const rectangular=table.table_type==='rectangular_guest';
                      return <button
                        key={table.id}
                        type="button"
                        onClick={()=>selectTable(table)}
                        onDragOver={(event)=>{event.preventDefault(); event.dataTransfer.dropEffect='move';}}
                        onDrop={(event)=>handleGuestDrop(event,table)}
                        onPointerDown={(event)=>handleFloorPointerDown(event,table)}
                        onPointerMove={(event)=>handleFloorPointerMove(event,table)}
                        onPointerUp={(event)=>handleFloorPointerUp(event,table.id)}
                        onPointerCancel={(event)=>handleFloorPointerUp(event,table.id)}
                        className={`tables-v2__floor-table tables-v3__floor-table ${rectangular?'tables-v3__floor-table--rectangular':''} ${selectedTableId===table.id?'tables-v2__floor-table--selected':''} ${table.locked?'tables-v3__floor-table--locked':''}`}
                        style={{left:`${left}%`,top:`${top}%`,transform:`translate(-50%,-50%) rotate(${Number(table.rotation||0)}deg)`}}
                        title={table.locked?'Mesa bloqueada: desbloquéala para moverla':'Arrastra para mover la mesa'}
                      >
                        {!rectangular && <ChairRing occupied={occupants} capacity={table.capacity}/>}<strong>{table.name}</strong><span>{occupants}/{table.capacity}</span>{table.locked&&<Lock size={10} className="tables-v3__lock-icon"/>}
                      </button>;
                    })}
                  </div>
                </div>
              </div>
            </div>

            {!presentationMode && <aside className="tables-v2__editor-inspector tables-v3__editor-inspector">
              <span className="tables-v2__label">Objeto seleccionado</span><h3>{selectedTable?.name || 'Selecciona una mesa'}</h3>
              {selectedTable ? <>
                <span className="tables-v2__inspector-sub">{selectedOccupants.length} de {selectedTable.capacity} lugares ocupados</span><div className="tables-v2__divider"/>
                <div className="tables-v2__field"><label>Nombre</label><input value={tableDraft.name||''} onChange={(event)=>setTableDraft({...tableDraft,name:event.target.value})}/></div>
                <div className="tables-v2__field"><label>Tipo</label><select value={tableDraft.table_type||'round_guest'} onChange={(event)=>setTableDraft({...tableDraft,table_type:event.target.value})}><option value="round_guest">Redonda</option><option value="rectangular_guest">Imperial / rectangular</option></select></div>
                <div className="tables-v2__field"><label>Capacidad</label><div className="tables-v2__counter"><button type="button" onClick={()=>adjustCapacity(-1)}><Minus size={14}/></button><span>{Number(tableDraft.capacity||selectedTable.capacity)}</span><button type="button" onClick={()=>adjustCapacity(1)}><Plus size={14}/></button></div></div>
                <div className="tables-v2__field"><label>Zona</label><input value={tableDraft.zone||''} onChange={(event)=>setTableDraft({...tableDraft,zone:event.target.value})}/></div>
                <div className="tables-v2__field"><label>Rotación</label><input type="range" min="-180" max="180" step="5" value={Number(tableDraft.rotation||0)} onChange={(event)=>{const rotation=Number(event.target.value);setTableDraft({...tableDraft,rotation});replaceTableLocally(selectedTable.id,{rotation});}}/><small>{Number(tableDraft.rotation||0)}°</small></div>
                <div className="tables-v3__position-note">Posición: {Math.round(Number(selectedTable.position_x||0))}% · {Math.round(Number(selectedTable.position_y||0))}%</div>
                <button type="button" className="tables-v2__button tables-v2__continue" onClick={()=>toggleTableLock(selectedTable)}>{selectedTable.locked?<Unlock size={13}/>:<Lock size={13}/>} {selectedTable.locked?'Desbloquear posición':'Bloquear posición'}</button>
                <button type="button" className="tables-v2__button tables-v2__button--primary tables-v2__continue" onClick={saveTable}><Save size={13}/>Guardar propiedades</button>
                <button type="button" className="tables-v2__button tables-v2__continue tables-v3__danger-button" onClick={()=>deleteTable(selectedTable)}><Trash2 size={13}/>Eliminar mesa</button>
              </> : <div className="tables-v2__empty">Haz clic sobre una mesa para ver sus propiedades. Arrástrala para moverla.</div>}
            </aside>}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
