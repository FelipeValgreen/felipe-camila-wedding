'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import {
  AlertTriangle,
  CheckCircle2,
  Grid3X3,
  ListChecks,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Unlock,
  Users,
  XCircle
} from 'lucide-react';

interface TableItem {
  id: string;
  table_number: number;
  name: string;
  capacity: number;
  table_type: string;
  zone: string;
  position_x: number;
  position_y: number;
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

type Message = { type: 'success' | 'error' | 'info'; text: string };
type GuestFilter = 'all' | 'unassigned' | 'assigned' | 'dietary';

function guestName(guest: GuestItem): string {
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [assignments, setAssignments] = useState<SeatingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<'operational' | 'map'>('operational');
  const [guestFilter, setGuestFilter] = useState<GuestFilter>('unassigned');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTableByGuest, setSelectedTableByGuest] = useState<Record<string, string>>({});
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tableDraft, setTableDraft] = useState<Partial<TableItem>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [tablesResult, guestsResult, assignmentsResult] = await Promise.all([
        supabase.from('wedding_tables').select('*').order('table_number', { ascending: true }),
        supabase
          .from('wedding_guests')
          .select('id, first_name, last_name, group_name, family_side, guest_category, attendance_status, dietary_type, dietary_detail, table_id, guest_status')
          .eq('attendance_status', 'attending')
          .eq('guest_status', 'active')
          .order('first_name', { ascending: true }),
        supabase.from('seating_assignments').select('*')
      ]);

      const errors = [tablesResult.error, guestsResult.error, assignmentsResult.error].filter(Boolean);
      if (errors.length > 0) throw new Error(errors.map(error => error?.message).join(' · '));

      const nextTables = (tablesResult.data || []) as TableItem[];
      const nextGuests = (guestsResult.data || []) as GuestItem[];
      const nextAssignments = (assignmentsResult.data || []) as SeatingAssignment[];

      setTables(nextTables);
      setGuests(nextGuests);
      setAssignments(nextAssignments);
      setSelectedTableByGuest(
        Object.fromEntries(nextAssignments.map(assignment => [assignment.guest_id, assignment.table_id]))
      );

      if (selectedTableId) {
        const refreshed = nextTables.find(table => table.id === selectedTableId);
        if (refreshed) setTableDraft({ ...refreshed });
        else {
          setSelectedTableId(null);
          setTableDraft({});
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible cargar las mesas.' });
    } finally {
      setLoading(false);
    }
  }, [selectedTableId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignmentByGuest = useMemo(
    () => new Map(assignments.map(assignment => [assignment.guest_id, assignment])),
    [assignments]
  );

  const guestsByTable = useMemo(() => {
    const map = new Map<string, GuestItem[]>();
    for (const table of tables) map.set(table.id, []);
    for (const guest of guests) {
      const tableId = assignmentByGuest.get(guest.id)?.table_id || guest.table_id;
      if (tableId && map.has(tableId)) map.get(tableId)?.push(guest);
    }
    return map;
  }, [tables, guests, assignmentByGuest]);

  const stats = useMemo(() => {
    const capacity = tables.reduce((sum, table) => sum + Number(table.capacity || 0), 0);
    const assigned = guests.filter(guest => Boolean(assignmentByGuest.get(guest.id))).length;
    const overCapacity = tables.filter(table => (guestsByTable.get(table.id)?.length || 0) > table.capacity).length;
    return {
      confirmed: guests.length,
      assigned,
      unassigned: Math.max(0, guests.length - assigned),
      capacity,
      available: capacity - assigned,
      overCapacity,
      dietary: guests.filter(guest => guest.dietary_type && guest.dietary_type !== 'Ninguna').length
    };
  }, [tables, guests, assignmentByGuest, guestsByTable]);

  const filteredGuests = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return guests.filter(guest => {
      const assignment = assignmentByGuest.get(guest.id);
      const matchesSearch = !term || `${guestName(guest)} ${guest.group_name} ${guest.family_side}`.toLowerCase().includes(term);
      if (!matchesSearch) return false;
      if (guestFilter === 'unassigned') return !assignment;
      if (guestFilter === 'assigned') return Boolean(assignment);
      if (guestFilter === 'dietary') return Boolean(guest.dietary_type && guest.dietary_type !== 'Ninguna');
      return true;
    });
  }, [guests, searchTerm, guestFilter, assignmentByGuest]);

  const selectedTable = tables.find(table => table.id === selectedTableId) || null;

  function selectTable(table: TableItem) {
    setSelectedTableId(table.id);
    setTableDraft({ ...table });
  }

  async function createTable() {
    const nextNumber = tables.length === 0
      ? 1
      : Math.max(...tables.map(table => Number(table.table_number) || 0)) + 1;
    const index = tables.length;

    setBusyKey('create-table');
    setMessage(null);
    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: nextNumber,
          name: `Mesa ${nextNumber}`,
          capacity: 10,
          table_type: 'round_guest',
          zone: 'Principal',
          position_x: 12 + (index % 5) * 19,
          position_y: 18 + Math.floor(index / 5) * 22,
          locked: false
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible crear la mesa.');
      await loadData();
      selectTable(payload.table);
      setMessage({ type: 'success', text: `Mesa ${nextNumber} creada. Completa su nombre, zona y capacidad.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible crear la mesa.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function saveTable() {
    if (!selectedTable || !tableDraft.name) return;
    setBusyKey(`save-table-${selectedTable.id}`);
    setMessage(null);
    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTable.id,
          table_number: Number(tableDraft.table_number),
          name: tableDraft.name,
          capacity: Number(tableDraft.capacity),
          zone: tableDraft.zone || 'Principal',
          position_x: Number(tableDraft.position_x),
          position_y: Number(tableDraft.position_y),
          locked: Boolean(tableDraft.locked),
          notes: tableDraft.notes || null
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la mesa.');
      await loadData();
      setMessage({ type: 'success', text: `${payload.table.name} actualizada correctamente.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible guardar la mesa.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleTableLock(table: TableItem) {
    setBusyKey(`lock-${table.id}`);
    setMessage(null);
    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: table.id, locked: !table.locked })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible cambiar el bloqueo.');
      await loadData();
      setMessage({ type: 'success', text: payload.table.locked ? 'Posición de mesa bloqueada.' : 'Posición de mesa desbloqueada.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible cambiar el bloqueo.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteTable(table: TableItem) {
    const occupancy = guestsByTable.get(table.id)?.length || 0;
    if (occupancy > 0) {
      setMessage({ type: 'error', text: `Debes reasignar las ${occupancy} persona(s) de ${table.name} antes de eliminarla.` });
      return;
    }
    if (!window.confirm(`¿Eliminar ${table.name}? Esta acción quedará auditada.`)) return;

    setBusyKey(`delete-${table.id}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/tables?id=${table.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible eliminar la mesa.');
      setSelectedTableId(null);
      setTableDraft({});
      await loadData();
      setMessage({ type: 'success', text: `${table.name} fue eliminada.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible eliminar la mesa.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function assignGuest(guest: GuestItem, targetTableId?: string) {
    const tableId = targetTableId || selectedTableByGuest[guest.id];
    if (!tableId) {
      setMessage({ type: 'error', text: `Selecciona una mesa para ${guestName(guest)}.` });
      return;
    }

    setBusyKey(`guest-${guest.id}`);
    setMessage(null);
    try {
      const response = await fetch('/api/seating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guest.id, table_id: tableId })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la asignación.');
      await loadData();
      const table = tables.find(item => item.id === tableId);
      setMessage({ type: 'success', text: `${guestName(guest)} quedó asignado/a a ${table?.name || 'la mesa seleccionada'}.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible guardar la asignación.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function unassignGuest(guest: GuestItem) {
    setBusyKey(`guest-${guest.id}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/seating?guest_id=${guest.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible quitar la asignación.');
      await loadData();
      setMessage({ type: 'success', text: `${guestName(guest)} quedó sin mesa para ser reasignado/a.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible quitar la asignación.' });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent-gold)]">
              Distribución operativa del evento
            </span>
            <h1 className="mt-1 font-serif text-3xl text-[var(--text-primary)]">Mesas y Asignaciones</h1>
            <p className="mt-1 max-w-3xl text-xs text-[var(--text-secondary)]">
              La vista operativa es la principal: asigna personas mediante selectores, controla capacidades y revisa restricciones. El plano es una referencia visual secundaria.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => loadData()} className="btn-secondary flex items-center gap-2">
              <RefreshCw size={14} /> Actualizar
            </button>
            <button type="button" onClick={createTable} disabled={busyKey === 'create-table'} className="btn-primary flex items-center gap-2">
              {busyKey === 'create-table' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Nueva mesa
            </button>
          </div>
        </div>

        {message && (
          <div className={`flex items-start gap-2 border p-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800'
              : message.type === 'error'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-800'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-800'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={17} /> : message.type === 'error' ? <XCircle size={17} /> : <AlertTriangle size={17} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ['Confirmados', stats.confirmed],
            ['Con mesa', stats.assigned],
            ['Sin mesa', stats.unassigned],
            ['Capacidad', stats.capacity],
            ['Cupos libres', stats.available],
            ['Restricciones', stats.dietary]
          ].map(([label, value]) => (
            <div key={String(label)} className="border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
              <strong className={`text-xl ${Number(value) < 0 ? 'text-rose-700' : 'text-[var(--text-primary)]'}`}>{value}</strong>
            </div>
          ))}
        </div>

        {(stats.capacity < stats.confirmed || stats.overCapacity > 0) && (
          <div className="flex items-start gap-3 border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-800">
            <AlertTriangle className="shrink-0" size={19} />
            <div>
              <strong className="block">La configuración actual de mesas no alcanza para todos los confirmados.</strong>
              <span>
                Hay {stats.confirmed} personas confirmadas y {stats.capacity} cupos configurados. Completa las mesas reales antes de entregar el plano a proveedores.
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-b border-[var(--border-color)] pb-3 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('operational')}
            className={`flex items-center gap-2 border px-3 py-2 ${viewMode === 'operational' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
          >
            <ListChecks size={14} /> Gestión por lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 border px-3 py-2 ${viewMode === 'map' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
          >
            <Grid3X3 size={14} /> Plano referencial
          </button>
        </div>

        {loading ? (
          <div className="border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center text-sm text-[var(--text-secondary)]">
            <Loader2 className="mx-auto mb-2 animate-spin" size={22} /> Cargando mesas e invitados…
          </div>
        ) : viewMode === 'operational' ? (
          <>
            <section className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">Configuración</span>
                <h2 className="font-serif text-2xl">Mesas registradas ({tables.length})</h2>
              </div>

              {tables.length === 0 ? (
                <div className="border border-amber-500/40 bg-amber-500/10 p-6 text-center text-sm text-amber-800">
                  No hay mesas configuradas. Crea la primera mesa para comenzar la distribución.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {tables.map(table => {
                    const occupants = guestsByTable.get(table.id) || [];
                    const isFull = occupants.length === table.capacity;
                    const isOver = occupants.length > table.capacity;
                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => selectTable(table)}
                        className={`border p-4 text-left transition ${
                          selectedTableId === table.id
                            ? 'border-[var(--text-primary)] bg-[var(--bg-secondary)]'
                            : isOver
                            ? 'border-rose-500/50 bg-rose-500/5'
                            : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--text-secondary)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Mesa {table.table_number} · {table.zone}</span>
                            <strong className="block font-serif text-lg">{table.name}</strong>
                          </div>
                          {table.locked ? <Lock size={14} /> : <Unlock size={14} className="text-[var(--text-muted)]" />}
                        </div>
                        <div className="mt-3 h-2 overflow-hidden bg-[var(--bg-secondary)]">
                          <div
                            className={isOver ? 'h-full bg-rose-600' : isFull ? 'h-full bg-emerald-700' : 'h-full bg-[var(--accent-gold)]'}
                            style={{ width: `${Math.min(100, (occupants.length / Math.max(1, table.capacity)) * 100)}%` }}
                          />
                        </div>
                        <div className="mt-2 flex justify-between text-xs">
                          <span>{occupants.length} asignados</span>
                          <strong className={isOver ? 'text-rose-700' : ''}>{table.capacity} cupos</strong>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {selectedTable && (
              <section className="border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">Editar mesa</span>
                    <h2 className="font-serif text-2xl">{selectedTable.name}</h2>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => toggleTableLock(selectedTable)} className="btn-secondary flex items-center gap-2 text-xs">
                      {selectedTable.locked ? <Unlock size={13} /> : <Lock size={13} />}
                      {selectedTable.locked ? 'Desbloquear plano' : 'Bloquear plano'}
                    </button>
                    <button type="button" onClick={() => deleteTable(selectedTable)} className="btn-secondary flex items-center gap-2 text-xs text-rose-700">
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <label className="text-xs">
                    <span className="mb-1 block font-semibold uppercase text-[var(--text-secondary)]">Número</span>
                    <input type="number" min={1} value={tableDraft.table_number || ''} onChange={event => setTableDraft({ ...tableDraft, table_number: Number(event.target.value) })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="mb-1 block font-semibold uppercase text-[var(--text-secondary)]">Nombre</span>
                    <input value={tableDraft.name || ''} onChange={event => setTableDraft({ ...tableDraft, name: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-semibold uppercase text-[var(--text-secondary)]">Capacidad</span>
                    <input type="number" min={1} max={30} value={tableDraft.capacity || 10} onChange={event => setTableDraft({ ...tableDraft, capacity: Number(event.target.value) })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="mb-1 block font-semibold uppercase text-[var(--text-secondary)]">Zona</span>
                    <input value={tableDraft.zone || ''} onChange={event => setTableDraft({ ...tableDraft, zone: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" />
                  </label>
                </div>

                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={saveTable} disabled={busyKey === `save-table-${selectedTable.id}`} className="btn-primary flex items-center gap-2">
                    {busyKey === `save-table-${selectedTable.id}` ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Guardar propiedades
                  </button>
                </div>

                <div className="mt-5 border-t border-[var(--border-color)] pt-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider">Personas de esta mesa ({guestsByTable.get(selectedTable.id)?.length || 0}/{selectedTable.capacity})</h3>
                  {(guestsByTable.get(selectedTable.id) || []).length === 0 ? (
                    <p className="text-xs text-[var(--text-secondary)]">Aún no hay personas asignadas.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(guestsByTable.get(selectedTable.id) || []).map(guest => (
                        <div key={guest.id} className="flex items-center gap-2 border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-xs">
                          <span>{guestName(guest)}</span>
                          {guest.dietary_type && guest.dietary_type !== 'Ninguna' && <AlertTriangle size={12} className="text-rose-700" />}
                          <button type="button" onClick={() => unassignGuest(guest)} title="Quitar de esta mesa" className="text-rose-700"><Trash2 size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">Asignación individual</span>
                  <h2 className="font-serif text-2xl">Invitados confirmados</h2>
                  <p className="text-xs text-[var(--text-secondary)]">Cada fila representa una persona. Las respuestas conjuntas ya conciliadas aparecen separadas.</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                  <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar nombre o grupo…" className="w-full border border-[var(--border-color)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-xs" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  ['unassigned', `Sin mesa (${stats.unassigned})`],
                  ['assigned', `Con mesa (${stats.assigned})`],
                  ['dietary', `Restricciones (${stats.dietary})`],
                  ['all', `Todos (${stats.confirmed})`]
                ].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setGuestFilter(value as GuestFilter)} className={`border px-3 py-1.5 ${guestFilter === value ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto border border-[var(--border-color)] bg-[var(--bg-card)]">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    <tr>
                      <th className="p-3">Invitado</th>
                      <th className="p-3">Grupo</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Restricción</th>
                      <th className="p-3">Mesa actual</th>
                      <th className="p-3">Cambiar / asignar</th>
                      <th className="p-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredGuests.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-[var(--text-secondary)]">No hay invitados en esta vista.</td></tr>
                    ) : filteredGuests.map(guest => {
                      const assignment = assignmentByGuest.get(guest.id);
                      const currentTable = assignment ? tables.find(table => table.id === assignment.table_id) : null;
                      const selectedValue = selectedTableByGuest[guest.id] || assignment?.table_id || '';
                      return (
                        <tr key={guest.id} className="hover:bg-[var(--bg-secondary)]/50">
                          <td className="p-3 font-semibold">{guestName(guest)}</td>
                          <td className="p-3">{guest.group_name}</td>
                          <td className="p-3">{guest.guest_category}</td>
                          <td className="p-3">
                            {guest.dietary_type && guest.dietary_type !== 'Ninguna' ? (
                              <span className="text-rose-700">{guest.dietary_type}{guest.dietary_detail ? ` · ${guest.dietary_detail}` : ''}</span>
                            ) : 'Ninguna'}
                          </td>
                          <td className="p-3">{currentTable ? <strong>{currentTable.name}</strong> : <span className="text-amber-700">Sin mesa</span>}</td>
                          <td className="p-3">
                            <select
                              value={selectedValue}
                              onChange={event => setSelectedTableByGuest(current => ({ ...current, [guest.id]: event.target.value }))}
                              className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2"
                            >
                              <option value="">Seleccionar mesa…</option>
                              {tables.map(table => {
                                const occupancy = guestsByTable.get(table.id)?.length || 0;
                                return <option key={table.id} value={table.id} disabled={occupancy >= table.capacity && table.id !== assignment?.table_id}>{table.name} — {occupancy}/{table.capacity}</option>;
                              })}
                            </select>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => assignGuest(guest)} disabled={!selectedValue || busyKey === `guest-${guest.id}`} className="btn-primary whitespace-nowrap px-3 py-1.5 text-[10px]">
                                {busyKey === `guest-${guest.id}` ? 'Guardando…' : currentTable ? 'Mover' : 'Asignar'}
                              </button>
                              {currentTable && (
                                <button type="button" onClick={() => unassignGuest(guest)} disabled={busyKey === `guest-${guest.id}`} className="btn-secondary px-3 py-1.5 text-[10px]">Quitar</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="space-y-4">
            <div className="border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800">
              El plano es referencial y no reemplaza la lista operativa. Edita las coordenadas desde el inspector para evitar arrastres imprecisos en celulares.
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="overflow-x-auto border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                <div className="relative h-[620px] min-w-[900px] overflow-hidden bg-[linear-gradient(to_right,rgba(0,0,0,.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,.035)_1px,transparent_1px)] bg-[size:40px_40px]">
                  <div className="absolute left-4 top-4 flex h-24 w-36 items-center justify-center border bg-[var(--text-primary)] text-xs text-white">Escenario / DJ</div>
                  <div className="absolute left-48 top-4 flex h-24 w-48 items-center justify-center border-2 border-dashed border-[var(--accent-gold)] bg-amber-500/5 text-xs">Pista de baile</div>
                  <div className="absolute right-4 top-4 flex h-16 w-44 items-center justify-center border border-emerald-700 bg-emerald-500/5 text-xs text-emerald-800">Mesa novios</div>
                  <div className="absolute bottom-4 left-1/2 flex h-12 w-48 -translate-x-1/2 items-center justify-center border bg-[var(--bg-secondary)] text-xs">Postres</div>

                  {tables.map(table => {
                    const occupants = guestsByTable.get(table.id)?.length || 0;
                    const isOver = occupants > table.capacity;
                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => selectTable(table)}
                        style={{ left: `${Number(table.position_x) || 50}%`, top: `${Number(table.position_y) || 50}%`, transform: 'translate(-50%, -50%)' }}
                        className={`absolute flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 bg-white text-center shadow-sm ${
                          selectedTableId === table.id ? 'border-[var(--accent-gold)] ring-4 ring-amber-500/20' : isOver ? 'border-rose-700' : 'border-[var(--border-color)]'
                        }`}
                      >
                        <strong className="font-serif">Mesa {table.table_number}</strong>
                        <span className="max-w-20 truncate text-[10px]">{table.name}</span>
                        <span className={`text-[10px] font-bold ${isOver ? 'text-rose-700' : ''}`}>{occupants}/{table.capacity}</span>
                        {table.locked && <Lock size={10} className="absolute right-2 top-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                {!selectedTable ? (
                  <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    <Grid3X3 className="mx-auto mb-2" size={24} /> Selecciona una mesa en el plano.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold)]">Inspector del plano</span>
                      <h2 className="font-serif text-2xl">{selectedTable.name}</h2>
                    </div>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold uppercase">Posición horizontal (X)</span>
                      <input type="number" min={4} max={96} value={tableDraft.position_x ?? 50} onChange={event => setTableDraft({ ...tableDraft, position_x: Number(event.target.value) })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold uppercase">Posición vertical (Y)</span>
                      <input type="number" min={6} max={94} value={tableDraft.position_y ?? 50} onChange={event => setTableDraft({ ...tableDraft, position_y: Number(event.target.value) })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" />
                    </label>
                    <button type="button" onClick={saveTable} className="btn-primary flex w-full items-center justify-center gap-2"><Save size={14} /> Guardar posición</button>
                    <button type="button" onClick={() => toggleTableLock(selectedTable)} className="btn-secondary flex w-full items-center justify-center gap-2">{selectedTable.locked ? <Unlock size={14} /> : <Lock size={14} />}{selectedTable.locked ? 'Desbloquear' : 'Bloquear'}</button>
                    <div className="border-t border-[var(--border-color)] pt-3 text-xs">
                      <strong className="block">Ocupación: {guestsByTable.get(selectedTable.id)?.length || 0}/{selectedTable.capacity}</strong>
                      <span className="text-[var(--text-secondary)]">Zona: {selectedTable.zone}</span>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
