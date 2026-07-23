'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Plus, Lock, Unlock, AlertTriangle, Users, Move, Trash2, Edit, Save, X } from 'lucide-react';

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
}

interface GuestItem {
  id: string;
  first_name: string;
  last_name: string;
  table_id: string | null;
  attendance_status: string;
  dietary_type: string | null;
}

interface SeatingAssignment {
  id: string;
  guest_id: string;
  table_id: string;
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [assignments, setAssignments] = useState<SeatingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection and edit
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [editTableForm, setEditTableForm] = useState<Partial<TableItem>>({});
  const [draggingGuestId, setDraggingGuestId] = useState<string | null>(null);
  const [movingTableId, setMovingTableId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const { data: tData } = await supabase.from('wedding_tables').select('*').order('table_number', { ascending: true });
      const { data: gData } = await supabase.from('wedding_guests').select('*').eq('attendance_status', 'attending');
      const { data: sData } = await supabase.from('seating_assignments').select('*');

      if (tData) setTables(tData as TableItem[]);
      if (gData) setGuests(gData as GuestItem[]);
      if (sData) setAssignments(sData as SeatingAssignment[]);
    } catch (err) {
      console.error('Error loading tables:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleSelectTable(t: TableItem) {
    setSelectedTable(t);
    setEditTableForm({ ...t });
  }

  async function handleCreateTable() {
    const nextNumber = tables.length + 1;
    try {
      const newTable = {
        table_number: nextNumber,
        name: `Mesa ${nextNumber}`,
        capacity: 10,
        table_type: 'round_guest',
        zone: 'Principal',
        position_x: 35 + (nextNumber * 8) % 40,
        position_y: 20 + (nextNumber * 12) % 60,
        locked: false
      };

      const { data } = await supabase.from('wedding_tables').insert(newTable).select();
      
      if (data && data[0]) {
        await supabase.from('sync_outbox').insert({
          entity_type: 'wedding_tables',
          entity_id: data[0].id,
          operation: 'INSERT',
          payload: newTable
        });
      }

      loadData();
    } catch (err) {
      console.error('Error creating table:', err);
    }
  }

  async function handleSaveTableEdit() {
    if (!selectedTable || !editTableForm.name) return;
    try {
      const updatedData = {
        table_number: editTableForm.table_number || selectedTable.table_number,
        name: editTableForm.name,
        capacity: Number(editTableForm.capacity) || 10,
        table_type: editTableForm.table_type || 'round_guest',
        zone: editTableForm.zone || 'Principal',
        locked: Boolean(editTableForm.locked)
      };

      await supabase.from('wedding_tables').update(updatedData).eq('id', selectedTable.id);

      await supabase.from('sync_outbox').insert({
        entity_type: 'wedding_tables',
        entity_id: selectedTable.id,
        operation: 'UPDATE',
        payload: updatedData
      });

      loadData();
      setSelectedTable(null);
    } catch (err) {
      console.error('Error updating table:', err);
    }
  }

  async function handleAssignGuest(guestId: string, tableId: string | null) {
    try {
      if (tableId) {
        // Delete any existing assignment for this guest
        await supabase.from('seating_assignments').delete().eq('guest_id', guestId);
        
        // Insert new primary assignment
        await supabase.from('seating_assignments').insert({
          guest_id: guestId,
          table_id: tableId
        });

        // Sync helper column on guest
        await supabase.from('wedding_guests').update({ table_id: tableId }).eq('id', guestId);
      } else {
        await supabase.from('seating_assignments').delete().eq('guest_id', guestId);
        await supabase.from('wedding_guests').update({ table_id: null }).eq('id', guestId);
      }

      loadData();
    } catch (err) {
      console.error('Error assigning guest:', err);
    }
  }

  async function handleToggleLock(table: TableItem) {
    try {
      await supabase.from('wedding_tables').update({ locked: !table.locked }).eq('id', table.id);
      loadData();
    } catch (err) {
      console.error('Error toggling lock:', err);
    }
  }

  async function handleFloorplanDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!movingTableId) return;

    const canvas = e.currentTarget.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - canvas.left) / canvas.width) * 100);
    const yPct = Math.round(((e.clientY - canvas.top) / canvas.height) * 100);

    const targetTable = tables.find(t => t.id === movingTableId);
    if (targetTable && !targetTable.locked) {
      try {
        await supabase.from('wedding_tables').update({
          position_x: Math.max(5, Math.min(90, xPct)),
          position_y: Math.max(5, Math.min(90, yPct))
        }).eq('id', movingTableId);

        loadData();
      } catch (err) {
        console.error('Error updating table position:', err);
      }
    }
    setMovingTableId(null);
  }

  // Derive assigned guests from seating_assignments primary source of truth
  const getTableAssignedGuests = (tableId: string) => {
    const tableAssignments = assignments.filter(s => s.table_id === tableId);
    const assignedGuestIds = new Set(tableAssignments.map(s => s.guest_id));
    return guests.filter(g => assignedGuestIds.has(g.id));
  };

  const assignedGuestIdsAll = new Set(assignments.map(s => s.guest_id));
  const unassignedGuests = guests.filter(g => !assignedGuestIdsAll.has(g.id));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)] font-semibold block">
              Plano Interactivo del Evento
            </span>
            <h1 className="font-serif text-3xl text-[var(--text-primary)] mt-1">
              Mapa & Distribución de Mesas
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-secondary)] italic">
              Distribución preliminar — no a escala
            </span>
            <button onClick={handleCreateTable} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> Nueva Mesa
            </button>
          </div>
        </div>

        {/* Floorplan + Sidebar Container */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Floorplan Canvas */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFloorplanDrop}
            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] p-6 min-h-[560px] relative overflow-hidden select-none"
          >
            {/* Visual Floor Layout Landmarks */}
            <div className="absolute top-6 left-6 w-32 h-44 bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col items-center justify-center text-center p-2 rounded-sm">
              <span className="font-serif text-sm font-semibold">Escenario</span>
              <span className="text-[10px] text-[var(--text-secondary)] uppercase mt-1">Música / Show</span>
            </div>

            <div className="absolute top-6 left-44 w-36 h-44 border-2 border-dashed border-[var(--accent-gold)] bg-[var(--status-pending-bg)] flex flex-col items-center justify-center text-center p-2 rounded-sm">
              <span className="font-serif text-sm font-semibold text-[var(--accent-gold)]">Pista de Baile</span>
              <span className="text-[10px] text-[var(--text-secondary)] uppercase mt-1">Zona Central</span>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 h-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-center rounded-sm">
              <span className="font-serif text-xs font-semibold">Mesón de Postres</span>
            </div>

            <div className="absolute top-6 right-6 w-40 h-16 bg-[#2D5A27]/10 border border-[#2D5A27] flex items-center justify-center text-center rounded-sm">
              <span className="font-serif text-sm font-semibold text-[#2D5A27]">Mesa de Novios</span>
            </div>

            {/* Tables Render */}
            {tables.map((table) => {
              const tableGuests = getTableAssignedGuests(table.id);
              const occupancy = tableGuests.length;
              const isOverCapacity = occupancy > table.capacity;

              return (
                <div
                  key={table.id}
                  draggable={!table.locked}
                  onDragStart={() => setMovingTableId(table.id)}
                  onClick={() => handleSelectTable(table)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.stopPropagation();
                    if (draggingGuestId) {
                      handleAssignGuest(draggingGuestId, table.id);
                      setDraggingGuestId(null);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: `${table.position_x}%`,
                    top: `${table.position_y}%`,
                  }}
                  className={`w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-sm ${
                    table.locked ? 'cursor-not-allowed border-dashed' : 'cursor-move'
                  } ${
                    isOverCapacity
                      ? 'border-[#A83232] bg-[#A83232]/10'
                      : selectedTable?.id === table.id
                      ? 'border-[var(--text-primary)] bg-[var(--bg-secondary)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-card)]'
                  }`}
                >
                  <span className="font-serif text-base font-semibold">{table.name}</span>
                  <span className={`text-[11px] font-semibold mt-0.5 ${isOverCapacity ? 'text-[#A83232]' : 'text-[var(--text-secondary)]'}`}>
                    {occupancy} / {table.capacity} cupos
                  </span>
                  {isOverCapacity && (
                    <span className="text-[9px] uppercase tracking-wider text-[#A83232] font-bold mt-0.5 flex items-center gap-0.5">
                      <AlertTriangle size={10} /> Sobrecapacidad
                    </span>
                  )}
                  {table.locked && <Lock size={10} className="text-[var(--text-muted)] absolute top-2 right-3" />}
                </div>
              );
            })}
          </div>

          {/* Lateral Drawer: Confirmados sin Mesa */}
          <div className="w-full lg:w-80 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent-gold)] font-bold">Sin Asignación</span>
                <h3 className="font-serif text-xl text-[var(--text-primary)]">Confirmados Sin Mesa</h3>
              </div>
              <span className="badge badge-pending">{unassignedGuests.length}</span>
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {unassignedGuests.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] py-4 text-center">Todos los invitados confirmados están asignados a una mesa.</p>
              ) : (
                unassignedGuests.map((g) => (
                  <div
                    key={g.id}
                    draggable
                    onDragStart={() => setDraggingGuestId(g.id)}
                    className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-sm flex items-center justify-between cursor-move hover:border-[var(--text-primary)] transition-all"
                  >
                    <div>
                      <span className="block text-xs font-semibold text-[var(--text-primary)]">{g.first_name} {g.last_name}</span>
                      {g.dietary_type && g.dietary_type !== 'Ninguna' && (
                        <span className="block text-[10px] text-[#A83232] font-medium mt-0.5">
                          Restricción: {g.dietary_type}
                        </span>
                      )}
                    </div>
                    <Move size={14} className="text-[var(--text-muted)]" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Selected Table Detail Drawer */}
        {selectedTable && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-serif text-2xl">{selectedTable.name}</h3>
                <button onClick={() => handleToggleLock(selectedTable)} className="text-[var(--text-secondary)]">
                  {selectedTable.locked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
              </div>
              <button onClick={() => setSelectedTable(null)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cerrar detalle</button>
            </div>

            {/* Table Properties Edit */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-[var(--text-secondary)] mb-1">Nombre Mesa</label>
                <input
                  type="text"
                  value={editTableForm.name || ''}
                  onChange={(e) => setEditTableForm({ ...editTableForm, name: e.target.value })}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] p-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-[var(--text-secondary)] mb-1">Capacidad</label>
                <input
                  type="number"
                  value={editTableForm.capacity || 10}
                  onChange={(e) => setEditTableForm({ ...editTableForm, capacity: Number(e.target.value) })}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] p-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-[var(--text-secondary)] mb-1">Zona</label>
                <input
                  type="text"
                  value={editTableForm.zone || ''}
                  onChange={(e) => setEditTableForm({ ...editTableForm, zone: e.target.value })}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] p-2 focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button onClick={handleSaveTableEdit} className="btn-primary w-full py-2">
                  Guardar Propiedades
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-2">
                Invitados Asignados ({getTableAssignedGuests(selectedTable.id).length} / {selectedTable.capacity})
              </h4>
              <div className="flex flex-wrap gap-2">
                {getTableAssignedGuests(selectedTable.id).map(g => (
                  <div key={g.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 rounded text-xs flex items-center gap-2">
                    <span>{g.first_name} {g.last_name}</span>
                    <button onClick={() => handleAssignGuest(g.id, null)} className="text-[var(--text-muted)] hover:text-[#A83232]">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
