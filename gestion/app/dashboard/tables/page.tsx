'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Unlock,
  XCircle,
} from 'lucide-react';
import './tables-v2.css';

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
type WorkspaceView = 'distribution' | 'venue';

function guestName(guest: GuestItem): string {
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
}

function guestInitial(guest: GuestItem): string {
  return (guest.first_name || guest.last_name || '?').slice(0, 1).toUpperCase();
}

const tableFallbackPositions = [
  { left: 16, top: 24 },
  { left: 16, top: 58 },
  { left: 70, top: 53 },
  { left: 72, top: 73 },
  { left: 30, top: 76 },
  { left: 57, top: 18 },
  { left: 38, top: 35 },
  { left: 80, top: 32 },
];

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
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('distribution');
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
        supabase.from('seating_assignments').select('*'),
      ]);

      const errors = [tablesResult.error, guestsResult.error, assignmentsResult.error].filter(Boolean);
      if (errors.length) throw new Error(errors.map((error) => error?.message).join(' · '));

      const nextTables = (tablesResult.data || []) as TableItem[];
      const nextGuests = (guestsResult.data || []) as GuestItem[];
      const nextAssignments = (assignmentsResult.data || []) as SeatingAssignment[];

      setTables(nextTables);
      setGuests(nextGuests);
      setAssignments(nextAssignments);
      setSelectedTableByGuest(Object.fromEntries(nextAssignments.map((assignment) => [assignment.guest_id, assignment.table_id])));

      if (!selectedTableId && nextTables.length) {
        setSelectedTableId(nextTables[0].id);
        setTableDraft({ ...nextTables[0] });
      } else if (selectedTableId) {
        const refreshed = nextTables.find((table) => table.id === selectedTableId);
        if (refreshed) setTableDraft({ ...refreshed });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible cargar las mesas.' });
    } finally {
      setLoading(false);
    }
  }, [selectedTableId]);

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
    return {
      confirmed: guests.length,
      assigned,
      unassigned: Math.max(0, guests.length - assigned),
      capacity,
      available: capacity - assigned,
      dietary,
    };
  }, [tables, guests, assignmentByGuest]);

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

  async function createTable() {
    const nextNumber = tables.length ? Math.max(...tables.map((table) => Number(table.table_number) || 0)) + 1 : 1;
    const fallback = tableFallbackPositions[tables.length % tableFallbackPositions.length];
    setBusyKey('create-table');
    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: nextNumber,
          name: `Mesa ${nextNumber}`,
          capacity: 10,
          table_type: 'round_guest',
          zone: 'Salón principal',
          position_x: fallback.left,
          position_y: fallback.top,
          locked: false,
        }),
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
    setBusyKey(`save-${selectedTable.id}`);
    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTable.id,
          table_number: Number(tableDraft.table_number),
          name: tableDraft.name,
          capacity: Number(tableDraft.capacity),
          zone: tableDraft.zone || 'Salón principal',
          position_x: Number(tableDraft.position_x),
          position_y: Number(tableDraft.position_y),
          locked: Boolean(tableDraft.locked),
          notes: tableDraft.notes || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la mesa.');
      await loadData();
      setMessage({ type: 'success', text: `${payload.table.name} actualizada.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible guardar la mesa.' });
    } finally { setBusyKey(null); }
  }

  async function toggleTableLock(table: TableItem) {
    setBusyKey(`lock-${table.id}`);
    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: table.id, locked: !table.locked }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible cambiar el bloqueo.');
      await loadData();
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
    setBusyKey(`delete-${table.id}`);
    try {
      const response = await fetch(`/api/tables?id=${table.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible eliminar la mesa.');
      setSelectedTableId(null);
      setTableDraft({});
      await loadData();
      setMessage({ type: 'success', text: `${table.name} eliminada.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible eliminar la mesa.' });
    } finally { setBusyKey(null); }
  }

  async function assignGuest(guest: GuestItem) {
    const tableId = selectedTableByGuest[guest.id];
    if (!tableId) return;
    setBusyKey(`guest-${guest.id}`);
    try {
      const response = await fetch('/api/seating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guest.id, table_id: tableId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la asignación.');
      await loadData();
      setMessage({ type: 'success', text: `${guestName(guest)} asignado/a correctamente.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible guardar la asignación.' });
    } finally { setBusyKey(null); }
  }

  async function unassignGuest(guest: GuestItem) {
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

  return (
    <DashboardLayout>
      <div className="tables-v2">
        <section className="tables-v2__hero">
          <div>
            <span className="tables-v2__eyebrow">Personas y espacio</span>
            <h1 className="tables-v2__title">Mesas</h1>
            <p className="tables-v2__lead">
              Organiza quién se sienta con quién y luego lleva esa distribución al salón real. La misma información vive en ambos espacios.
            </p>
          </div>
          <div className="tables-v2__actions">
            <button className="tables-v2__button" type="button" onClick={() => loadData()}><RefreshCw size={14}/>Actualizar</button>
            <button className="tables-v2__button tables-v2__button--primary" type="button" onClick={createTable} disabled={busyKey === 'create-table'}>
              {busyKey === 'create-table' ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Nueva mesa
            </button>
          </div>
        </section>

        {message && (
          <div className={`tables-v2__message tables-v2__message--${message.type}`}>
            {message.type === 'success' ? <CheckCircle2 size={16}/> : message.type === 'error' ? <XCircle size={16}/> : <AlertTriangle size={16}/>} {message.text}
          </div>
        )}

        <section className="tables-v2__metrics" aria-label="Resumen de mesas">
          <div className="tables-v2__metric"><span>Confirmados</span><strong>{stats.confirmed}</strong></div>
          <div className="tables-v2__metric"><span>Asignados</span><strong>{stats.assigned}</strong><small>{stats.confirmed ? Math.round((stats.assigned / stats.confirmed) * 100) : 0}%</small></div>
          <div className={`tables-v2__metric ${stats.unassigned ? 'tables-v2__metric--attention' : ''}`}><span>Sin mesa</span><strong>{stats.unassigned}</strong><small>{stats.unassigned ? 'Requiere acción' : 'Completo'}</small></div>
          <div className="tables-v2__metric"><span>Capacidad</span><strong>{stats.capacity}</strong><small>{stats.available} cupos libres</small></div>
        </section>

        <section className="tables-v2__workflow" aria-label="Flujo de invitados a salón">
          <button className="tables-v2__step" type="button" onClick={() => window.location.href='/dashboard/guests'}><span className="tables-v2__step-index">1</span><span><strong>Invitados</strong><small>Personas y RSVP</small></span></button>
          <button className={`tables-v2__step ${workspaceView === 'distribution' ? 'tables-v2__step--active' : ''}`} type="button" onClick={() => setWorkspaceView('distribution')}><span className="tables-v2__step-index">2</span><span><strong>Distribuir</strong><small>Mesas y grupos</small></span></button>
          <button className={`tables-v2__step ${workspaceView === 'venue' ? 'tables-v2__step--active' : ''}`} type="button" onClick={() => setWorkspaceView('venue')}><span className="tables-v2__step-index">3</span><span><strong>Salón</strong><small>Plano y montaje</small></span></button>
        </section>

        {loading ? (
          <div className="tables-v2__empty"><Loader2 className="mx-auto mb-2 animate-spin" size={20}/>Cargando invitados y mesas…</div>
        ) : workspaceView === 'distribution' ? (
          <section className="tables-v2__distribution">
            <aside className="tables-v2__panel">
              <div className="tables-v2__panel-head"><span className="tables-v2__label">Banco sin mesa</span><h2>{stats.unassigned} personas</h2><p>Filtra, busca y asigna sin perder los grupos de referencia.</p></div>
              <div className="tables-v2__search"><Search size={14}/><input value={searchTerm} onChange={(event)=>setSearchTerm(event.target.value)} placeholder="Buscar persona o grupo…"/></div>
              <div className="tables-v2__filters">
                {([['unassigned',`Sin mesa ${stats.unassigned}`],['assigned',`Con mesa ${stats.assigned}`],['dietary',`Restricciones ${stats.dietary}`],['all','Todos']] as Array<[GuestFilter,string]>).map(([key,label]) => (
                  <button key={key} type="button" className={`tables-v2__filter ${guestFilter===key?'tables-v2__filter--active':''}`} onClick={()=>setGuestFilter(key)}>{label}</button>
                ))}
              </div>
              <div className="tables-v2__guest-list">
                {filteredGuests.slice(0,24).map((guest)=>{
                  const currentAssignment = assignmentByGuest.get(guest.id);
                  const currentTableId = currentAssignment?.table_id || guest.table_id || '';
                  const selectedValue = selectedTableByGuest[guest.id] || currentTableId;
                  return <article key={guest.id} className="tables-v2__guest-card">
                    <span className="tables-v2__guest-avatar">{guestInitial(guest)}</span>
                    <div><strong>{guestName(guest)}</strong><small>{guest.group_name || guest.family_side || 'Sin grupo'}{guest.dietary_type && guest.dietary_type !== 'Ninguna' ? ` · ${guest.dietary_type}` : ''}</small></div>
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

            <div className="tables-v2__tables">
              <div className="tables-v2__tables-head"><div><span className="tables-v2__label">Mesas</span><h2>Distribución actual</h2></div><p>Selecciona una mesa para ver y editar sus detalles.</p></div>
              <div className="tables-v2__table-grid">
                {tables.map((table)=>{
                  const occupants=guestsByTable.get(table.id)||[];
                  const full=occupants.length===table.capacity;
                  const over=occupants.length>table.capacity;
                  const progress=Math.min(100,(occupants.length/Math.max(1,table.capacity))*100);
                  return <button key={table.id} type="button" onClick={()=>selectTable(table)} className={`tables-v2__table-card ${selectedTableId===table.id?'tables-v2__table-card--selected':''} ${full?'tables-v2__table-card--full':''}`}>
                    <div className="tables-v2__table-top"><strong>{table.name}</strong><span style={{color:over?'var(--workspace-danger)':undefined}}>{occupants.length}/{table.capacity}</span></div>
                    <div className="tables-v2__progress"><span style={{width:`${progress}%`,background:over?'var(--workspace-danger)':undefined}}/></div>
                    <div className="tables-v2__table-meta"><span>{table.zone || 'Salón principal'}</span><span>{table.locked ? 'Bloqueada' : `${Math.max(0,table.capacity-occupants.length)} lugares`}</span></div>
                    <span className={`tables-v2__status ${full?'tables-v2__status--full':''}`}>{over?'Sobrecupo':full?'Completa':occupants.length?'En progreso':'Vacía'}</span>
                  </button>;
                })}
              </div>
            </div>

            <aside className="tables-v2__panel tables-v2__inspector">
              {!selectedTable ? <div className="tables-v2__empty">Selecciona una mesa para editarla.</div> : <>
                <span className="tables-v2__label">Mesa seleccionada</span><h2>{selectedTable.name}</h2><span className="tables-v2__inspector-sub">{selectedOccupants.length} de {selectedTable.capacity} lugares ocupados</span>
                <div className="tables-v2__divider"/>
                <span className="tables-v2__label">Personas</span><div className="tables-v2__people">
                  {selectedOccupants.slice(0,6).map((guest)=><div key={guest.id} className="tables-v2__person"><span>{guestInitial(guest)}</span><strong>{guestName(guest)}</strong><button type="button" onClick={()=>unassignGuest(guest)} aria-label={`Quitar a ${guestName(guest)}`}><Trash2 size={12}/></button></div>)}
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
          <section className="tables-v2__editor">
            <aside className="tables-v2__palette">
              <span className="tables-v2__label">Elementos</span><h3>Biblioteca</h3>
              {[
                ['Mesas',['Redonda 10','Redonda 8','Mesa imperial']],
                ['Evento',['Pista de baile','Escenario / DJ','Bar','Buffet']],
                ['Espacio',['Entrada','Salida','Baños','Zona libre']],
              ].map(([group,items])=><div key={group as string} className="tables-v2__palette-section"><span>{group}</span>{(items as string[]).map((item)=><button key={item} type="button" className="tables-v2__palette-item"><Plus size={11}/>{item}</button>)}</div>)}
            </aside>

            <div className="tables-v2__canvas-wrap">
              <div className="tables-v2__canvas-toolbar">
                <button type="button" className="tables-v2__tool tables-v2__tool--active">Seleccionar</button><button type="button" className="tables-v2__tool">+ Mesa</button><button type="button" className="tables-v2__tool">+ Zona</button><button type="button" className="tables-v2__tool">+ Objeto</button><span className="tables-v2__zoom">− &nbsp; 86% &nbsp; + &nbsp;&nbsp; Ajustar</span>
              </div>
              <div className="tables-v2__canvas">
                <div className="tables-v2__venue-object tables-v2__venue-object--stage">Escenario / DJ</div>
                <div className="tables-v2__venue-object tables-v2__venue-object--bar">Bar</div>
                <div className="tables-v2__venue-object tables-v2__venue-object--entrance">Entrada</div>
                <div className="tables-v2__dance-floor">Pista de baile</div>
                {tables.map((table,index)=>{
                  const occupants=guestsByTable.get(table.id)?.length||0;
                  const fallback=tableFallbackPositions[index%tableFallbackPositions.length];
                  const left=Math.max(8,Math.min(88,Number(table.position_x)||fallback.left));
                  const top=Math.max(12,Math.min(82,Number(table.position_y)||fallback.top));
                  return <button key={table.id} type="button" onClick={()=>selectTable(table)} className={`tables-v2__floor-table ${selectedTableId===table.id?'tables-v2__floor-table--selected':''}`} style={{left:`${left}%`,top:`${top}%`,transform:'translate(-50%,-50%)'}}>
                    <ChairRing occupied={occupants} capacity={table.capacity}/><strong>{table.name}</strong><span>{occupants}/{table.capacity}</span>
                  </button>;
                })}
              </div>
            </div>

            <aside className="tables-v2__editor-inspector">
              <span className="tables-v2__label">Objeto seleccionado</span><h3>{selectedTable?.name || 'Selecciona una mesa'}</h3>
              {selectedTable ? <>
                <span className="tables-v2__inspector-sub">{selectedOccupants.length} de {selectedTable.capacity} lugares ocupados</span><div className="tables-v2__divider"/>
                <span className="tables-v2__label">Personas</span><div className="tables-v2__people">{selectedOccupants.slice(0,5).map((guest)=><div className="tables-v2__person" key={guest.id}><span>{guestInitial(guest)}</span><strong>{guestName(guest)}</strong></div>)}</div>
                <div className="tables-v2__divider"/>
                <div className="tables-v2__field"><label>Capacidad</label><div className="tables-v2__counter"><button type="button" onClick={()=>adjustCapacity(-1)}><Minus size={14}/></button><span>{Number(tableDraft.capacity||selectedTable.capacity)}</span><button type="button" onClick={()=>adjustCapacity(1)}><Plus size={14}/></button></div></div>
                <div className="tables-v2__field"><label>Zona</label><input value={tableDraft.zone||''} onChange={(event)=>setTableDraft({...tableDraft,zone:event.target.value})}/></div>
                <button type="button" className="tables-v2__button" onClick={()=>toggleTableLock(selectedTable)}>{selectedTable.locked?<Unlock size={13}/>:<Lock size={13}/>} {selectedTable.locked?'Desbloquear posición':'Bloquear posición'}</button>
                <button type="button" className="tables-v2__button tables-v2__button--primary" onClick={saveTable}><Save size={13}/>Guardar propiedades</button>
                <button type="button" className="tables-v2__button" onClick={()=>deleteTable(selectedTable)}><Trash2 size={13}/>Eliminar mesa</button>
              </> : <div className="tables-v2__empty">Haz clic sobre una mesa en el plano para ver sus personas y propiedades.</div>}
            </aside>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
