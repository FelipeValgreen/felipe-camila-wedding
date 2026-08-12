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
  Link2,
  Loader2,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Unlock,
  Users,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import './tables-v2.css';
import './tables-v3.css';
import './tables-v4.css';

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
  rsvpResponses: number;
  sheetSynced: number;
  sheetPending: number;
  openIssues: number;
}

interface ConfirmedPerson {
  name: string;
  attendance: string;
  dietaryType: string;
  dietaryDetail: string;
  recordStatus: string;
  guestId: string | null;
  rsvpId: string | null;
  confirmedAt: string | null;
  phone: string;
}

interface IncomingPerson {
  id: string;
  rsvpId: string;
  name: string;
  guestId: string | null;
  resolutionStatus: string;
  updatedAt: string | null;
}

interface TableGroup {
  groupId: string;
  groupName: string;
  linkType: string;
  confirmed: boolean;
  people: string[];
  sourceNotes: string[];
}

interface ConfirmedSource {
  ok: boolean;
  source: string;
  liveSource: string;
  groupsSource: string;
  summary: {
    attending: number;
    declined: number;
    currentKnownAttending: number;
    currentKnownDeclined: number;
    incomingAttending: number;
    incomingDeclined: number;
    totalResponsesPeople: number;
    associated: number;
    withoutMasterRecord: number;
    dietary: number;
    latestConfirmationName: string | null;
    latestConfirmationAt: string | null;
  };
  people: ConfirmedPerson[];
  incomingAttending: IncomingPerson[];
  incomingDeclined: IncomingPerson[];
  groups: TableGroup[];
}

type Message = { type: 'success' | 'error' | 'info'; text: string };
type GuestFilter = 'all' | 'unassigned' | 'assigned' | 'dietary' | 'grouped';
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
  { left: 18, top: 24 }, { left: 42, top: 24 }, { left: 68, top: 24 },
  { left: 22, top: 62 }, { left: 50, top: 64 }, { left: 78, top: 62 },
  { left: 34, top: 43 }, { left: 68, top: 43 },
];

function guestName(guest: GuestItem) {
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
}

function guestInitial(guest: GuestItem) {
  return (guest.first_name || guest.last_name || '?').slice(0, 1).toUpperCase();
}

function normalizeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatLastUpdate(value: string | null) {
  if (!value) return 'Sin dato';
  if (/^\d{4}-\d{2}-\d{2}[ T]/.test(value) && !value.endsWith('Z') && !/[+-]\d\d:\d\d$/.test(value)) return value.replace('T', ' ');
  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ChairRing({ occupied, capacity }: { occupied: number; capacity: number }) {
  const visible = Math.min(Math.max(capacity, 1), 12);
  return <>{Array.from({ length: visible }).map((_, index) => {
    const angle = (Math.PI * 2 * index) / visible - Math.PI / 2;
    const radius = 51;
    return <span key={index} aria-hidden="true" className={`tables-v2__chair ${index < occupied ? 'tables-v2__chair--occupied' : ''}`} style={{ left: 32 + Math.cos(angle) * radius, top: 32 + Math.sin(angle) * radius }}/>;
  })}</>;
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [assignments, setAssignments] = useState<SeatingAssignment[]>([]);
  const [summary, setSummary] = useState<ManagementSummary | null>(null);
  const [official, setOfficial] = useState<ConfirmedSource | null>(null);
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

  useEffect(() => setPreviewMode(window.location.hostname !== 'gestion.felipeycami.cl'), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const [tablesResult, guestsResult, assignmentsResult, summaryResponse, officialResponse] = await Promise.all([
        supabase.from('wedding_tables').select('*').order('table_number', { ascending: true }),
        supabase.from('wedding_guests').select('id, first_name, last_name, group_name, family_side, guest_category, attendance_status, dietary_type, dietary_detail, table_id, guest_status').eq('attendance_status', 'attending').eq('guest_status', 'active').order('first_name', { ascending: true }),
        supabase.from('seating_assignments').select('*'),
        fetch('/api/management-summary', { cache: 'no-store' }),
        fetch('/api/confirmed-source', { cache: 'no-store' }),
      ]);
      const errors = [tablesResult.error, guestsResult.error, assignmentsResult.error].filter(Boolean);
      if (errors.length) throw new Error(errors.map((error) => error?.message).join(' · '));

      const [summaryPayload, officialPayload] = await Promise.all([
        summaryResponse.json().catch(() => null), officialResponse.json().catch(() => null),
      ]);
      if (!officialResponse.ok || !officialPayload?.ok) throw new Error(officialPayload?.error || 'No fue posible cargar confirmados y grupos.');

      const nextTables = (tablesResult.data || []) as TableItem[];
      const nextAssignments = (assignmentsResult.data || []) as SeatingAssignment[];
      setTables(nextTables);
      setGuests((guestsResult.data || []) as GuestItem[]);
      setAssignments(nextAssignments);
      setOfficial(officialPayload as ConfirmedSource);
      if (summaryResponse.ok && summaryPayload?.ok) setSummary(summaryPayload.summary);
      setSelectedTableByGuest(Object.fromEntries(nextAssignments.map((assignment) => [assignment.guest_id, assignment.table_id])));
      setSelectedTableId((current) => {
        const nextId = current && nextTables.some((table) => table.id === current) ? current : nextTables[0]?.id || null;
        const selected = nextTables.find((table) => table.id === nextId);
        setTableDraft(selected ? { ...selected } : {});
        return nextId;
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible cargar confirmados, grupos y mesas.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const assignmentByGuest = useMemo(() => new Map(assignments.map((assignment) => [assignment.guest_id, assignment])), [assignments]);
  const guestByNormalizedName = useMemo(() => new Map(guests.map((guest) => [normalizeName(guestName(guest)), guest])), [guests]);
  const groups = official?.groups || [];
  const hardGroups = useMemo(() => groups.filter((group) => group.confirmed), [groups]);
  const probableGroups = useMemo(() => groups.filter((group) => !group.confirmed), [groups]);
  const groupByPerson = useMemo(() => {
    const map = new Map<string, TableGroup[]>();
    groups.forEach((group) => group.people.forEach((person) => {
      const key = normalizeName(person);
      map.set(key, [...(map.get(key) || []), group]);
    }));
    return map;
  }, [groups]);

  const guestsByTable = useMemo(() => {
    const map = new Map<string, GuestItem[]>();
    tables.forEach((table) => map.set(table.id, []));
    guests.forEach((guest) => {
      const tableId = assignmentByGuest.get(guest.id)?.table_id || guest.table_id;
      if (tableId && map.has(tableId)) map.get(tableId)?.push(guest);
    });
    return map;
  }, [tables, guests, assignmentByGuest]);

  function tableIdForGuest(guest: GuestItem) {
    return assignmentByGuest.get(guest.id)?.table_id || guest.table_id || '';
  }

  const hardGroupSplits = useMemo(() => hardGroups.filter((group) => {
    const tableIds = new Set(group.people.map((name) => guestByNormalizedName.get(normalizeName(name))).filter(Boolean).map((guest) => tableIdForGuest(guest!)).filter(Boolean));
    return tableIds.size > 1;
  }), [hardGroups, guestByNormalizedName, assignmentByGuest]);

  const stats = useMemo(() => {
    const capacity = tables.reduce((sum, table) => sum + Number(table.capacity || 0), 0);
    const assigned = guests.filter((guest) => Boolean(tableIdForGuest(guest))).length;
    const dietary = guests.filter((guest) => guest.dietary_type && guest.dietary_type !== 'Ninguna').length;
    const known = official?.summary.currentKnownAttending ?? guests.length;
    const consolidated = official?.summary.attending ?? known;
    const incoming = official?.summary.incomingAttending ?? 0;
    const seatable = guests.length;
    return {
      known, consolidated, incoming, seatable, assigned,
      unassigned: Math.max(0, seatable - assigned), capacity, available: capacity - assigned, dietary,
      missingMaster: Math.max(0, known - seatable),
    };
  }, [tables, guests, assignmentByGuest, official]);

  const filteredGuests = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return guests.filter((guest) => {
      const assigned = Boolean(tableIdForGuest(guest));
      const guestGroups = groupByPerson.get(normalizeName(guestName(guest))) || [];
      const matchesSearch = !term || `${guestName(guest)} ${guest.group_name} ${guest.family_side} ${guestGroups.map((group) => group.groupName).join(' ')}`.toLowerCase().includes(term);
      if (!matchesSearch) return false;
      if (guestFilter === 'unassigned') return !assigned;
      if (guestFilter === 'assigned') return assigned;
      if (guestFilter === 'dietary') return Boolean(guest.dietary_type && guest.dietary_type !== 'Ninguna');
      if (guestFilter === 'grouped') return guestGroups.length > 0;
      return true;
    });
  }, [guests, searchTerm, guestFilter, assignmentByGuest, groupByPerson]);

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

  function groupsForGuest(guest: GuestItem) {
    return groupByPerson.get(normalizeName(guestName(guest))) || [];
  }

  function splitWarningForGuest(guest: GuestItem, targetTableId: string) {
    const warnings: string[] = [];
    groupsForGuest(guest).filter((group) => group.confirmed).forEach((group) => {
      const conflicts = group.people
        .filter((name) => normalizeName(name) !== normalizeName(guestName(guest)))
        .map((name) => guestByNormalizedName.get(normalizeName(name)))
        .filter(Boolean)
        .map((member) => ({ name: guestName(member!), tableId: tableIdForGuest(member!) }))
        .filter((member) => member.tableId && member.tableId !== targetTableId);
      if (conflicts.length) warnings.push(`${group.groupName}: ${conflicts.map((item) => item.name).join(', ')} ya está(n) en otra mesa.`);
    });
    return warnings;
  }

  async function createTablePreset(preset: TablePreset = tablePresets[0]) {
    const nextNumber = tables.length ? Math.max(...tables.map((table) => Number(table.table_number) || 0)) + 1 : 1;
    const fallback = tableFallbackPositions[tables.length % tableFallbackPositions.length];
    const draft: Omit<TableItem, 'id'> = {
      table_number: nextNumber, name: `Mesa ${nextNumber}`, capacity: preset.capacity, table_type: preset.table_type,
      zone: 'Salón principal', position_x: fallback.left, position_y: fallback.top, width: preset.width, height: preset.height,
      rotation: 0, locked: false, notes: null,
    };
    if (previewMode) {
      const table: TableItem = { ...draft, id: `preview-${Date.now()}-${nextNumber}` };
      setTables((current) => [...current, table]); selectTable(table); previewNotice(`${preset.label} agregada como ${table.name}.`); return;
    }
    setBusyKey('create-table');
    try {
      const response = await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible crear la mesa.');
      await loadData(); selectTable(payload.table); setMessage({ type: 'success', text: `${payload.table.name} creada correctamente.` });
    } catch (error: any) { setMessage({ type: 'error', text: error?.message || 'No fue posible crear la mesa.' }); }
    finally { setBusyKey(null); }
  }

  async function saveTable() {
    if (!selectedTable || !tableDraft.name) return;
    const updates: Partial<TableItem> = {
      table_number: Number(tableDraft.table_number || selectedTable.table_number), name: tableDraft.name,
      capacity: Number(tableDraft.capacity || selectedTable.capacity), table_type: tableDraft.table_type || selectedTable.table_type,
      zone: tableDraft.zone || 'Salón principal', position_x: Number(tableDraft.position_x ?? selectedTable.position_x),
      position_y: Number(tableDraft.position_y ?? selectedTable.position_y), width: Number(tableDraft.width ?? selectedTable.width ?? 10),
      height: Number(tableDraft.height ?? selectedTable.height ?? 10), rotation: Number(tableDraft.rotation ?? selectedTable.rotation ?? 0),
      locked: Boolean(tableDraft.locked), notes: tableDraft.notes || null,
    };
    if (previewMode || selectedTable.id.startsWith('preview-')) { replaceTableLocally(selectedTable.id, updates); previewNotice(`${updates.name} actualizada.`); return; }
    setBusyKey(`save-${selectedTable.id}`);
    try {
      const response = await fetch('/api/tables', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedTable.id, ...updates }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la mesa.');
      replaceTableLocally(selectedTable.id, payload.table); setMessage({ type: 'success', text: `${payload.table.name} actualizada.` });
    } catch (error: any) { setMessage({ type: 'error', text: error?.message || 'No fue posible guardar la mesa.' }); }
    finally { setBusyKey(null); }
  }

  async function persistPosition(table: TableItem) {
    if (previewMode || table.id.startsWith('preview-')) { previewNotice(`${table.name} movida en el plano.`); return; }
    try {
      const response = await fetch('/api/tables', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: table.id, position_x: table.position_x, position_y: table.position_y }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la posición.');
      replaceTableLocally(table.id, payload.table); setMessage({ type: 'success', text: `${table.name}: posición guardada.` });
    } catch (error: any) { setMessage({ type: 'error', text: error?.message || 'No fue posible guardar la posición.' }); }
  }

  async function toggleTableLock(table: TableItem) {
    const nextLocked = !table.locked;
    if (previewMode || table.id.startsWith('preview-')) { replaceTableLocally(table.id, { locked: nextLocked }); previewNotice(nextLocked ? `${table.name} bloqueada.` : `${table.name} desbloqueada.`); return; }
    setBusyKey(`lock-${table.id}`);
    try {
      const response = await fetch('/api/tables', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: table.id, locked: nextLocked }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible cambiar el bloqueo.');
      replaceTableLocally(table.id, payload.table); setMessage({ type: 'success', text: payload.table.locked ? 'Mesa bloqueada en el plano.' : 'Mesa desbloqueada.' });
    } catch (error: any) { setMessage({ type: 'error', text: error?.message || 'No fue posible cambiar el bloqueo.' }); }
    finally { setBusyKey(null); }
  }

  async function deleteTable(table: TableItem) {
    const occupancy = guestsByTable.get(table.id)?.length || 0;
    if (occupancy) { setMessage({ type: 'error', text: `Reasigna primero las ${occupancy} persona(s) de ${table.name}.` }); return; }
    if (!window.confirm(`¿Eliminar ${table.name}?`)) return;
    if (previewMode || table.id.startsWith('preview-')) { setTables((current) => current.filter((item) => item.id !== table.id)); setSelectedTableId(null); setTableDraft({}); previewNotice(`${table.name} eliminada.`); return; }
    setBusyKey(`delete-${table.id}`);
    try {
      const response = await fetch(`/api/tables?id=${table.id}`, { method: 'DELETE' }); const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible eliminar la mesa.');
      setTables((current) => current.filter((item) => item.id !== table.id)); setSelectedTableId(null); setTableDraft({}); setMessage({ type: 'success', text: `${table.name} eliminada.` });
    } catch (error: any) { setMessage({ type: 'error', text: error?.message || 'No fue posible eliminar la mesa.' }); }
    finally { setBusyKey(null); }
  }

  function assignLocally(guest: GuestItem, tableId: string) {
    const existing = assignmentByGuest.get(guest.id);
    setAssignments((current) => [...current.filter((item) => item.guest_id !== guest.id), { id: existing?.id || `preview-assignment-${guest.id}`, guest_id: guest.id, table_id: tableId, seat_number: null }]);
    setSelectedTableByGuest((current) => ({ ...current, [guest.id]: tableId }));
  }

  async function assignGuestToTable(guest: GuestItem, tableId: string, skipGroupWarning = false) {
    if (!tableId) return false;
    const table = tables.find((item) => item.id === tableId); if (!table) return false;
    const occupancy = guestsByTable.get(tableId)?.length || 0;
    const existingTableId = tableIdForGuest(guest);
    if (existingTableId !== tableId && occupancy >= table.capacity) { setMessage({ type: 'error', text: `${table.name} ya está completa.` }); return false; }

    if (!skipGroupWarning) {
      const warnings = splitWarningForGuest(guest, tableId);
      if (warnings.length && !window.confirm(`Esta asignación separa un grupo conocido:\n\n${warnings.join('\n')}\n\n¿Quieres continuar de todas formas?`)) return false;
    }

    if (previewMode || tableId.startsWith('preview-')) { assignLocally(guest, tableId); previewNotice(`${guestName(guest)} asignado/a a ${table.name}.`); return true; }
    setBusyKey(`guest-${guest.id}`);
    try {
      const response = await fetch('/api/seating', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guest_id: guest.id, table_id: tableId }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la asignación.');
      await loadData(); setMessage({ type: 'success', text: `${guestName(guest)} asignado/a a ${table.name}.` }); return true;
    } catch (error: any) { setMessage({ type: 'error', text: error?.message || 'No fue posible guardar la asignación.' }); return false; }
    finally { setBusyKey(null); }
  }

  async function assignGroupToTable(group: TableGroup, tableId: string) {
    const table = tables.find((item) => item.id === tableId); if (!table) return;
    const members = group.people.map((name) => guestByNormalizedName.get(normalizeName(name))).filter(Boolean) as GuestItem[];
    const alreadyHere = members.filter((member) => tableIdForGuest(member) === tableId).length;
    const capacityNeeded = members.filter((member) => tableIdForGuest(member) !== tableId).length;
    const occupancy = guestsByTable.get(tableId)?.length || 0;
    if (occupancy + capacityNeeded > table.capacity) {
      setMessage({ type: 'error', text: `${table.name} necesita ${capacityNeeded} cupos adicionales para mantener unido a ${group.groupName}.` }); return;
    }
    if (!members.length) { setMessage({ type: 'info', text: `${group.groupName} todavía no tiene integrantes conciliados disponibles para sentar.` }); return; }
    if (!window.confirm(`Asignar ${members.length} integrante(s) disponibles de “${group.groupName}” a ${table.name}?`)) return;

    if (previewMode) {
      members.forEach((member) => assignLocally(member, tableId));
      previewNotice(`${group.groupName}: ${members.length} integrante(s) ubicados juntos en ${table.name}.`); return;
    }
    setBusyKey(`group-${group.groupId}`);
    try {
      for (const member of members) {
        const response = await fetch('/api/seating', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guest_id: member.id, table_id: tableId }) });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || `No fue posible asignar a ${guestName(member)}.`);
      }
      await loadData(); setMessage({ type: 'success', text: `${group.groupName} quedó unido en ${table.name}. ${alreadyHere ? `${alreadyHere} ya estaba(n) allí.` : ''}` });
    } catch (error: any) { setMessage({ type: 'error', text: error?.message || 'No fue posible asignar el grupo.' }); }
    finally { setBusyKey(null); }
  }

  async function unassignGuest(guest: GuestItem) {
    if (previewMode || assignmentByGuest.get(guest.id)?.id?.startsWith('preview-')) {
      setAssignments((current) => current.filter((item) => item.guest_id !== guest.id)); setSelectedTableByGuest((current) => ({ ...current, [guest.id]: '' })); previewNotice(`${guestName(guest)} volvió al banco sin mesa.`); return;
    }
    setBusyKey(`guest-${guest.id}`);
    try {
      const response = await fetch(`/api/seating?guest_id=${guest.id}`, { method: 'DELETE' }); const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible quitar la asignación.');
      await loadData(); setMessage({ type: 'success', text: `${guestName(guest)} volvió al banco sin mesa.` });
    } catch (error: any) { setMessage({ type: 'error', text: error?.message || 'No fue posible quitar la asignación.' }); }
    finally { setBusyKey(null); }
  }

  function adjustCapacity(delta: number) {
    const current = Number(tableDraft.capacity || selectedTable?.capacity || 10);
    setTableDraft({ ...tableDraft, capacity: Math.max(1, Math.min(30, current + delta)) });
  }

  function handleFloorPointerDown(event: React.PointerEvent<HTMLButtonElement>, table: TableItem) {
    selectTable(table); if (table.locked) return; draggingTableRef.current = { id: table.id, pointerId: event.pointerId }; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
  }

  function handleFloorPointerMove(event: React.PointerEvent<HTMLButtonElement>, table: TableItem) {
    if (!draggingTableRef.current || draggingTableRef.current.id !== table.id || table.locked || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    replaceTableLocally(table.id, { position_x: Number(clamp(((event.clientX - bounds.left) / bounds.width) * 100, 6, 94).toFixed(2)), position_y: Number(clamp(((event.clientY - bounds.top) / bounds.height) * 100, 8, 90).toFixed(2)) });
  }

  async function handleFloorPointerUp(event: React.PointerEvent<HTMLButtonElement>, tableId: string) {
    if (!draggingTableRef.current || draggingTableRef.current.id !== tableId) return;
    draggingTableRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const moved = tables.find((table) => table.id === tableId); if (moved) await persistPosition(moved);
  }

  function handleGuestDragStart(event: React.DragEvent<HTMLElement>, guest: GuestItem) {
    event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-wedding-guest', guest.id);
  }

  async function handleGuestDrop(event: React.DragEvent<HTMLElement>, table: TableItem) {
    event.preventDefault(); const guestId = event.dataTransfer.getData('application/x-wedding-guest'); const guest = guests.find((item) => item.id === guestId); if (guest) await assignGuestToTable(guest, table.id);
  }

  function resetPreview() {
    if (!previewMode) return; if (!window.confirm('¿Restablecer los cambios locales y volver a los datos reales?')) return; loadData();
  }

  return <DashboardLayout><div className="tables-v2 tables-v3 tables-v4">
    <section className="tables-v2__hero tables-v3__hero"><div><span className="tables-v2__eyebrow">Personas, vínculos y espacio</span><h1 className="tables-v2__title">Mesas</h1><p className="tables-v2__lead">Distribuye sólo a quienes tienen ficha operativa y usa los vínculos conocidos como reglas de planificación, sin confundir una asociación probable con una certeza.</p></div><div className="tables-v2__actions">{previewMode && <span className="tables-v3__preview-chip">Preview · cambios locales</span>}<button className="tables-v2__button" type="button" onClick={loadData}><RefreshCw size={14}/>Actualizar datos</button>{previewMode && <button className="tables-v2__button" type="button" onClick={resetPreview}><RotateCcw size={14}/>Restablecer</button>}<button className="tables-v2__button tables-v2__button--primary" type="button" onClick={() => createTablePreset()} disabled={busyKey === 'create-table'}>{busyKey === 'create-table' ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Nueva mesa</button></div></section>

    {message && <div className={`tables-v2__message tables-v2__message--${message.type}`}>{message.type === 'success' ? <CheckCircle2 size={16}/> : message.type === 'error' ? <XCircle size={16}/> : <AlertTriangle size={16}/>} {message.text}</div>}

    <section className="tables-v4__truth-strip">
      <div><span>Asistentes conocidos</span><strong>{stats.known}</strong><small>{stats.consolidated} consolidados + {stats.incoming} nuevos en Supabase</small></div>
      <div><span>Listos para sentar</span><strong>{stats.seatable}</strong><small>con ficha operativa</small></div>
      <div className={stats.missingMaster ? 'is-attention' : ''}><span>Aún no sentables</span><strong>{stats.missingMaster}</strong><small>faltan por conciliar a ficha maestra</small></div>
      <div><span>Grupos conocidos</span><strong>{hardGroups.length}</strong><small>regla: evitar separarlos</small></div>
      <div><span>Grupos por validar</span><strong>{probableGroups.length}</strong><small>sugerencia, no regla</small></div>
      <div className={hardGroupSplits.length ? 'is-danger' : ''}><span>Grupos separados</span><strong>{hardGroupSplits.length}</strong><small>inconsistencias actuales</small></div>
      <div><span>Última confirmación</span><strong className="tables-v4__date">{official?.summary.latestConfirmationName || '—'}</strong><small>{formatLastUpdate(official?.summary.latestConfirmationAt || null)}</small></div>
    </section>

    {stats.incoming > 0 && <section className="tables-v4__live-note"><Sparkles size={16}/><div><strong>{stats.incoming} confirmación(es) nueva(s) detectada(s) en Supabase.</strong><span>El sistema ya las cuenta dentro de {stats.known} asistentes conocidos aunque todavía no estén consolidadas en CONFIRMADOS_ACTUALES.</span></div></section>}

    <section className="tables-v2__metrics tables-v3__metrics" aria-label="Resumen operativo de mesas">
      <div className="tables-v2__metric"><span>Listos para sentar</span><strong>{stats.seatable}</strong><small>fichas operativas</small></div>
      <div className={`tables-v2__metric ${stats.unassigned ? 'tables-v2__metric--attention' : ''}`}><span>Sin mesa</span><strong>{stats.unassigned}</strong><small>de {stats.seatable} disponibles</small></div>
      <div className="tables-v2__metric"><span>Asignados</span><strong>{stats.assigned}</strong><small>{stats.seatable ? Math.round((stats.assigned / stats.seatable) * 100) : 0}% de sentables</small></div>
      <div className="tables-v2__metric"><span>Capacidad actual</span><strong>{stats.capacity}</strong><small>{stats.available} cupos libres</small></div>
      <div className={`tables-v2__metric ${hardGroupSplits.length ? 'tables-v2__metric--attention' : ''}`}><span>Integridad de grupos</span><strong>{hardGroupSplits.length ? hardGroupSplits.length : 'OK'}</strong><small>{hardGroupSplits.length ? 'grupos conocidos separados' : 'sin separaciones detectadas'}</small></div>
    </section>

    <section className="tables-v2__workflow" aria-label="Flujo de invitados a salón"><button className="tables-v2__step" type="button" onClick={() => window.location.href='/dashboard/guests'}><span className="tables-v2__step-index">1</span><span><strong>Invitados</strong><small>Confirmados y conciliación</small></span></button><button className={`tables-v2__step ${workspaceView === 'distribution' ? 'tables-v2__step--active' : ''}`} type="button" onClick={() => setWorkspaceView('distribution')}><span className="tables-v2__step-index">2</span><span><strong>Distribuir</strong><small>Personas, grupos y mesas</small></span></button><button className={`tables-v2__step ${workspaceView === 'venue' ? 'tables-v2__step--active' : ''}`} type="button" onClick={() => setWorkspaceView('venue')}><span className="tables-v2__step-index">3</span><span><strong>Salón</strong><small>Plano interactivo</small></span></button></section>

    {loading ? <div className="tables-v2__empty tables-v3__loading"><Loader2 className="mx-auto mb-2 animate-spin" size={20}/>Cargando confirmados, grupos, invitados y mesas…</div> : workspaceView === 'distribution' ? <section className="tables-v2__distribution tables-v3__distribution">
      <aside className="tables-v2__panel tables-v3__bank"><div className="tables-v2__panel-head"><span className="tables-v2__label">Banco operativo</span><h2>{stats.unassigned} sin mesa</h2><p>{stats.missingMaster} asistentes conocidos todavía no aparecen aquí porque aún no tienen ficha operativa.</p></div><div className="tables-v2__search"><Search size={14}/><input value={searchTerm} onChange={(event)=>setSearchTerm(event.target.value)} placeholder="Buscar persona, familia o grupo…"/></div><div className="tables-v2__filters">{([['unassigned',`Sin mesa ${stats.unassigned}`],['assigned',`Con mesa ${stats.assigned}`],['grouped','Con vínculo'],['dietary',`Restricciones ${stats.dietary}`],['all','Todos']] as Array<[GuestFilter,string]>).map(([key,label]) => <button key={key} type="button" className={`tables-v2__filter ${guestFilter===key?'tables-v2__filter--active':''}`} onClick={()=>setGuestFilter(key)}>{label}</button>)}</div><div className="tables-v2__guest-list tables-v3__guest-list">{filteredGuests.map((guest)=>{
        const currentTableId = tableIdForGuest(guest); const selectedValue = selectedTableByGuest[guest.id] || currentTableId; const guestGroups = groupsForGuest(guest);
        return <article key={guest.id} draggable onDragStart={(event)=>handleGuestDragStart(event, guest)} className="tables-v2__guest-card tables-v3__guest-card tables-v4__guest-card"><span className="tables-v3__drag"><GripVertical size={14}/></span><span className="tables-v2__guest-avatar">{guestInitial(guest)}</span><div className="tables-v3__guest-copy"><strong>{guestName(guest)}</strong><small>{guest.group_name || guest.family_side || 'Sin grupo'}{guest.dietary_type && guest.dietary_type !== 'Ninguna' ? ` · ${guest.dietary_type}` : ''}</small>{guestGroups.length > 0 && <div className="tables-v4__guest-groups">{guestGroups.map((group)=><span key={group.groupId} className={group.confirmed?'is-known':'is-probable'} title={group.sourceNotes.join(' · ')}>{group.confirmed?<Link2 size={9}/>:<Sparkles size={9}/>} {group.groupName}</span>)}</div>}</div><div className="tables-v2__guest-actions"><select value={selectedValue} onChange={(event)=>setSelectedTableByGuest((current)=>({...current,[guest.id]:event.target.value}))}><option value="">Elegir mesa…</option>{tables.map((table)=>{const occupancy=guestsByTable.get(table.id)?.length||0; return <option key={table.id} value={table.id} disabled={occupancy>=table.capacity && table.id!==currentTableId}>{table.name} · {occupancy}/{table.capacity}</option>;})}</select><button type="button" disabled={!selectedValue || busyKey===`guest-${guest.id}`} onClick={()=>assignGuestToTable(guest, selectedValue)}>{currentTableId ? 'Mover' : 'Asignar'}</button></div></article>;
      })}{!filteredGuests.length && <div className="tables-v2__empty">No hay personas en esta vista.</div>}</div></aside>

      <div className="tables-v2__tables tables-v3__tables"><div className="tables-v2__tables-head"><div><span className="tables-v2__label">Distribución</span><h2>{tables.length} mesas configuradas</h2></div><p>Arrastra una persona sobre una mesa. Si pertenece a un grupo conocido, el sistema controla que no la separes accidentalmente.</p></div>{hardGroupSplits.length > 0 && <div className="tables-v4__split-alert"><AlertTriangle size={15}/><div><strong>Hay {hardGroupSplits.length} grupo(s) conocido(s) actualmente separados.</strong><span>{hardGroupSplits.map((group)=>group.groupName).join(' · ')}</span></div></div>}<div className="tables-v2__table-grid tables-v3__table-grid">{tables.map((table)=>{
        const occupants=guestsByTable.get(table.id)||[]; const full=occupants.length===table.capacity; const over=occupants.length>table.capacity; const progress=Math.min(100,(occupants.length/Math.max(1,table.capacity))*100);
        return <button key={table.id} type="button" onDragOver={(event)=>{event.preventDefault();event.dataTransfer.dropEffect='move';}} onDrop={(event)=>handleGuestDrop(event,table)} onClick={()=>selectTable(table)} className={`tables-v2__table-card tables-v3__table-card ${selectedTableId===table.id?'tables-v2__table-card--selected':''} ${full?'tables-v2__table-card--full':''}`}><div className="tables-v2__table-top"><strong>{table.name}</strong><span style={{color:over?'var(--workspace-danger)':undefined}}>{occupants.length}/{table.capacity}</span></div><div className="tables-v2__progress"><span style={{width:`${progress}%`,background:over?'var(--workspace-danger)':undefined}}/></div><div className="tables-v2__table-meta"><span>{table.zone || 'Salón principal'}</span><span>{table.locked ? 'Bloqueada' : `${Math.max(0,table.capacity-occupants.length)} lugares`}</span></div><div className="tables-v3__mini-people">{occupants.slice(0,4).map((guest)=><span key={guest.id} title={guestName(guest)}>{guestInitial(guest)}</span>)}{occupants.length>4 && <span>+{occupants.length-4}</span>}</div><span className={`tables-v2__status ${full?'tables-v2__status--full':''}`}>{over?'Sobrecupo':full?'Completa':occupants.length?'En progreso':'Vacía'}</span></button>;
      })}{!tables.length && <div className="tables-v2__empty">Aún no hay mesas. Crea una para empezar.</div>}</div></div>

      <aside className="tables-v2__panel tables-v2__inspector tables-v3__inspector">{!selectedTable ? <div className="tables-v2__empty">Selecciona una mesa para editarla.</div> : <><span className="tables-v2__label">Mesa seleccionada</span><h2>{selectedTable.name}</h2><span className="tables-v2__inspector-sub">{selectedOccupants.length} de {selectedTable.capacity} lugares ocupados</span><div className="tables-v2__divider"/><span className="tables-v2__label">Personas</span><div className="tables-v2__people">{selectedOccupants.map((guest)=><div key={guest.id} className="tables-v2__person"><span>{guestInitial(guest)}</span><strong>{guestName(guest)}</strong>{groupsForGuest(guest).length>0 && <em>{groupsForGuest(guest).some((group)=>group.confirmed)?'grupo conocido':'por validar'}</em>}<button type="button" onClick={()=>unassignGuest(guest)} aria-label={`Quitar a ${guestName(guest)}`}><Trash2 size={12}/></button></div>)}{!selectedOccupants.length && <span className="tables-v2__inspector-sub">Aún no hay personas asignadas.</span>}</div><div className="tables-v2__divider"/><span className="tables-v2__label">Grupos útiles para esta mesa</span><div className="tables-v4__group-actions">{groups.filter((group)=>group.people.some((name)=>selectedOccupants.some((guest)=>normalizeName(guestName(guest))===normalizeName(name)))).map((group)=><div key={group.groupId}><div><strong>{group.groupName}</strong><small>{group.confirmed?'Relación conocida':'Por validar'} · {group.people.length} personas</small></div><button type="button" onClick={()=>assignGroupToTable(group,selectedTable.id)} disabled={busyKey===`group-${group.groupId}`}>Mantener juntos</button></div>)}{!groups.some((group)=>group.people.some((name)=>selectedOccupants.some((guest)=>normalizeName(guestName(guest))===normalizeName(name)))) && <span className="tables-v2__inspector-sub">Esta mesa todavía no contiene integrantes de grupos registrados.</span>}</div><div className="tables-v2__divider"/><div className="tables-v2__field"><label>Nombre</label><input value={tableDraft.name||''} onChange={(event)=>setTableDraft({...tableDraft,name:event.target.value})}/></div><div className="tables-v2__field"><label>Capacidad</label><div className="tables-v2__counter"><button type="button" onClick={()=>adjustCapacity(-1)}><Minus size={14}/></button><span>{Number(tableDraft.capacity||10)}</span><button type="button" onClick={()=>adjustCapacity(1)}><Plus size={14}/></button></div></div><div className="tables-v2__field"><label>Zona</label><input value={tableDraft.zone||''} onChange={(event)=>setTableDraft({...tableDraft,zone:event.target.value})}/></div><button type="button" className="tables-v2__button tables-v2__button--primary tables-v2__continue" onClick={saveTable} disabled={busyKey===`save-${selectedTable.id}`}><Save size={13}/>Guardar cambios</button><button type="button" className="tables-v2__button tables-v2__continue" onClick={()=>setWorkspaceView('venue')}>Continuar al salón →</button></>}</aside>
    </section> : <section className={`tables-v2__editor tables-v3__editor ${presentationMode?'tables-v3__editor--presentation':''}`}>
      {!presentationMode && <aside className="tables-v2__palette tables-v3__palette"><span className="tables-v2__label">Agregar mesas</span><h3>Biblioteca</h3><p className="tables-v3__palette-help">Mueve las mesas directamente en el plano. Las relaciones de invitados se controlan en Distribuir y se mantienen al pasar al salón.</p><div className="tables-v2__palette-section"><span>Mesas</span>{tablePresets.map((preset)=><button key={preset.label} type="button" className="tables-v2__palette-item" onClick={()=>createTablePreset(preset)}><Plus size={11}/>{preset.label}</button>)}</div><div className="tables-v3__tip"><strong>Cómo mover</strong><span>Arrastra cualquier mesa directamente en el plano. Bloquéala cuando termines.</span></div></aside>}
      <div className="tables-v2__canvas-wrap tables-v3__canvas-wrap"><div className="tables-v2__canvas-toolbar tables-v3__toolbar"><button type="button" className="tables-v2__tool tables-v2__tool--active">Seleccionar</button><button type="button" className="tables-v2__tool" onClick={()=>createTablePreset()}><Plus size={12}/> Mesa</button><span className="tables-v3__toolbar-divider"/><button type="button" className="tables-v2__tool" onClick={()=>setZoom((value)=>clamp(Number((value-.1).toFixed(2)),.6,1.25))} aria-label="Alejar"><ZoomOut size={13}/></button><span className="tables-v3__zoom-value">{Math.round(zoom*100)}%</span><button type="button" className="tables-v2__tool" onClick={()=>setZoom((value)=>clamp(Number((value+.1).toFixed(2)),.6,1.25))} aria-label="Acercar"><ZoomIn size={13}/></button><button type="button" className="tables-v2__tool" onClick={()=>setZoom(.9)}>Ajustar</button><button type="button" className="tables-v2__tool tables-v3__presentation-toggle" onClick={()=>setPresentationMode((value)=>!value)}><Eye size={13}/>{presentationMode?'Editar':'Presentación'}</button></div><div className="tables-v3__canvas-viewport"><div className="tables-v3__canvas-stage" style={{ transform:`scale(${zoom})` }}><div ref={canvasRef} className="tables-v2__canvas tables-v3__canvas"><div className="tables-v2__venue-object tables-v2__venue-object--stage">Escenario / DJ</div><div className="tables-v2__venue-object tables-v2__venue-object--bar">Bar</div><div className="tables-v2__venue-object tables-v2__venue-object--entrance">Entrada</div><div className="tables-v2__dance-floor">Pista de baile</div>{tables.map((table,index)=>{const occupants=guestsByTable.get(table.id)?.length||0;const fallback=tableFallbackPositions[index%tableFallbackPositions.length];const left=clamp(Number(table.position_x)||fallback.left,6,94);const top=clamp(Number(table.position_y)||fallback.top,8,90);const rectangular=table.table_type==='rectangular_guest';return <button key={table.id} type="button" onClick={()=>selectTable(table)} onDragOver={(event)=>{event.preventDefault();event.dataTransfer.dropEffect='move';}} onDrop={(event)=>handleGuestDrop(event,table)} onPointerDown={(event)=>handleFloorPointerDown(event,table)} onPointerMove={(event)=>handleFloorPointerMove(event,table)} onPointerUp={(event)=>handleFloorPointerUp(event,table.id)} onPointerCancel={(event)=>handleFloorPointerUp(event,table.id)} className={`tables-v2__floor-table tables-v3__floor-table ${rectangular?'tables-v3__floor-table--rectangular':''} ${selectedTableId===table.id?'tables-v2__floor-table--selected':''} ${table.locked?'tables-v3__floor-table--locked':''}`} style={{left:`${left}%`,top:`${top}%`,transform:`translate(-50%,-50%) rotate(${Number(table.rotation||0)}deg)`}} title={table.locked?'Mesa bloqueada: desbloquéala para moverla':'Arrastra para mover la mesa'}>{!rectangular && <ChairRing occupied={occupants} capacity={table.capacity}/>}<strong>{table.name}</strong><span>{occupants}/{table.capacity}</span>{table.locked&&<Lock size={10} className="tables-v3__lock-icon"/>}</button>;})}</div></div></div></div>
      {!presentationMode && <aside className="tables-v2__editor-inspector tables-v3__editor-inspector"><span className="tables-v2__label">Objeto seleccionado</span><h3>{selectedTable?.name || 'Selecciona una mesa'}</h3>{selectedTable ? <><span className="tables-v2__inspector-sub">{selectedOccupants.length} de {selectedTable.capacity} lugares ocupados</span><div className="tables-v2__divider"/><div className="tables-v2__field"><label>Nombre</label><input value={tableDraft.name||''} onChange={(event)=>setTableDraft({...tableDraft,name:event.target.value})}/></div><div className="tables-v2__field"><label>Tipo</label><select value={tableDraft.table_type||'round_guest'} onChange={(event)=>setTableDraft({...tableDraft,table_type:event.target.value})}><option value="round_guest">Redonda</option><option value="rectangular_guest">Imperial / rectangular</option></select></div><div className="tables-v2__field"><label>Capacidad</label><div className="tables-v2__counter"><button type="button" onClick={()=>adjustCapacity(-1)}><Minus size={14}/></button><span>{Number(tableDraft.capacity||selectedTable.capacity)}</span><button type="button" onClick={()=>adjustCapacity(1)}><Plus size={14}/></button></div></div><div className="tables-v2__field"><label>Zona</label><input value={tableDraft.zone||''} onChange={(event)=>setTableDraft({...tableDraft,zone:event.target.value})}/></div><div className="tables-v2__field"><label>Rotación</label><input type="range" min="-180" max="180" step="5" value={Number(tableDraft.rotation||0)} onChange={(event)=>{const rotation=Number(event.target.value);setTableDraft({...tableDraft,rotation});replaceTableLocally(selectedTable.id,{rotation});}}/><small>{Number(tableDraft.rotation||0)}°</small></div><div className="tables-v3__position-note">Posición: {Math.round(Number(selectedTable.position_x||0))}% · {Math.round(Number(selectedTable.position_y||0))}%</div><button type="button" className="tables-v2__button tables-v2__continue" onClick={()=>toggleTableLock(selectedTable)}>{selectedTable.locked?<Unlock size={13}/>:<Lock size={13}/>} {selectedTable.locked?'Desbloquear posición':'Bloquear posición'}</button><button type="button" className="tables-v2__button tables-v2__button--primary tables-v2__continue" onClick={saveTable}><Save size={13}/>Guardar propiedades</button><button type="button" className="tables-v2__button tables-v2__continue tables-v3__danger-button" onClick={()=>deleteTable(selectedTable)}><Trash2 size={13}/>Eliminar mesa</button></> : <div className="tables-v2__empty">Haz clic sobre una mesa para ver sus propiedades. Arrástrala para moverla.</div>}</aside>}
    </section>}
  </div></DashboardLayout>;
}
