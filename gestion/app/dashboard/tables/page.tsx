'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import SeatingCanvas from '@/components/seating/SeatingCanvas';
import { TableModel } from '@/components/seating/SeatingTable';
import TableInspector, { AssignedGuest } from '@/components/seating/TableInspector';
import UnassignedGuests, { UnassignedGuestItem } from '@/components/seating/UnassignedGuests';
import Toast from '@/components/Toast';
import { Plus, Eye, Edit3, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import styles from '@/components/seating/seating.module.css';

interface GuestItem {
  id: string;
  first_name: string;
  last_name: string;
  table_id: string | null;
  attendance_status: string;
  dietary_type: string | null;
  family_side: string;
  guest_status: string;
}

interface SeatingAssignment {
  id: string;
  guest_id: string;
  table_id: string;
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableModel[]>([]);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [assignments, setAssignments] = useState<SeatingAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor modes: 'view' (read-only, click to inspect) vs 'edit' (draggable, position saving)
  const [editorMode, setEditorMode] = useState<'view' | 'edit'>('view');
  
  // Selection
  const [selectedTable, setSelectedTable] = useState<TableModel | null>(null);

  // Save status badge
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: tData } = await supabase.from('wedding_tables').select('*').order('table_number', { ascending: true });
      const { data: gData } = await supabase.from('wedding_guests').select('*').eq('attendance_status', 'attending').eq('guest_status', 'active');
      const { data: sData } = await supabase.from('seating_assignments').select('*');

      if (tData) setTables(tData as TableModel[]);
      if (gData) setGuests(gData as GuestItem[]);
      if (sData) setAssignments(sData as SeatingAssignment[]);
    } catch (err) {
      console.error('Error cargando mapa de mesas:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Calculate unique next table number
  const handleCreateTable = async () => {
    const nextTableNumber =
      tables.length === 0
        ? 1
        : Math.max(...tables.map((table) => Number(table.table_number) || 0)) + 1;

    try {
      const newTablePayload = {
        table_number: nextTableNumber,
        name: `Mesa ${nextTableNumber}`,
        capacity: 10,
        table_type: 'round_guest',
        zone: 'Principal',
        position_x: 35 + (nextTableNumber * 8) % 40,
        position_y: 25 + (nextTableNumber * 12) % 45,
        locked: false
      };

      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTablePayload)
      });

      const result = await res.json().catch(() => null);
      if (res.ok && result?.ok) {
        setTables(prev => [...prev, result.table]);
        setSelectedTable(result.table);
        setToast({ message: `Mesa ${result.table.table_number} creada exitosamente.`, type: 'success' });
      } else {
        setToast({ message: result?.error || 'No se pudo crear la mesa.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error al crear la mesa.', type: 'error' });
    }
  };

  // Optimistic table drag position save with rollback
  const handleTablePositionChange = async (table: TableModel, nextX: number, nextY: number) => {
    const previousTable = { ...table };

    // 1. Optimistically update local state
    setTables((current) =>
      current.map((item) =>
        item.id === table.id
          ? { ...item, position_x: nextX, position_y: nextY }
          : item
      )
    );

    // Keep selected table updated if inspecting
    if (selectedTable?.id === table.id) {
      setSelectedTable(prev => prev ? { ...prev, position_x: nextX, position_y: nextY } : null);
    }

    setSaveStatus('saving');
    setSaveMessage('Guardando posición...');

    try {
      const response = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: table.id,
          position_x: nextX,
          position_y: nextY,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        // Rollback position
        setTables((current) =>
          current.map((item) =>
            item.id === previousTable.id ? previousTable : item
          )
        );

        throw new Error(result?.error || 'No se pudo guardar la posición.');
      }

      setTables((current) =>
        current.map((item) =>
          item.id === result.table.id ? result.table : item
        )
      );

      setSaveStatus('saved');
      setSaveMessage('Posición guardada');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveMessage(err.message || 'Error al guardar posición');
      setToast({ message: err.message || 'Error al guardar la posición.', type: 'error' });
      setTimeout(() => setSaveStatus('idle'), 3500);
    }
  };

  // Table property edit
  const handleSaveTableProperties = async (updated: Partial<TableModel>) => {
    if (!updated.id) return;
    const res = await fetch('/api/tables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });

    const result = await res.json().catch(() => null);
    if (res.ok && result?.ok) {
      setTables(prev => prev.map(t => (t.id === result.table.id ? result.table : t)));
      setSelectedTable(result.table);
      setToast({ message: `Propiedades de ${result.table.name} actualizadas.`, type: 'success' });
    } else {
      throw new Error(result?.error || 'Error actualizando propiedades.');
    }
  };

  // Toggle lock
  const handleToggleLock = async (table: TableModel) => {
    const nextLocked = !table.locked;
    const res = await fetch('/api/tables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: table.id, locked: nextLocked })
    });

    const result = await res.json().catch(() => null);
    if (res.ok && result?.ok) {
      setTables(prev => prev.map(t => (t.id === result.table.id ? result.table : t)));
      setSelectedTable(result.table);
      setToast({ message: nextLocked ? `Mesa ${table.table_number} bloqueada.` : `Mesa ${table.table_number} desbloqueada.`, type: 'info' });
    } else {
      setToast({ message: result?.error || 'Error al cambiar bloqueo.', type: 'error' });
    }
  };

  // Assign Guest to Table
  const handleAssignGuestToTable = async (guestId: string, tableId: string) => {
    try {
      const res = await fetch('/api/seating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guestId, table_id: tableId })
      });

      const result = await res.json().catch(() => null);
      if (res.ok && result?.ok) {
        const guestName = guests.find(g => g.id === guestId)?.first_name || 'Invitado';
        const tableName = tables.find(t => t.id === tableId)?.name || 'mesa';
        setToast({ message: `${guestName} asignado/a a ${tableName}.`, type: 'success' });
        loadData();
      } else {
        setToast({ message: result?.error || 'Error al asignar invitado.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error al asignar invitado.', type: 'error' });
    }
  };

  // Remove Guest from Table
  const handleRemoveGuestFromTable = async (guestId: string) => {
    try {
      const res = await fetch(`/api/seating?guest_id=${guestId}`, { method: 'DELETE' });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.ok) {
        setToast({ message: 'Invitado removido de la mesa.', type: 'info' });
        loadData();
      } else {
        setToast({ message: result?.error || 'Error al quitar invitado.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error al quitar invitado.', type: 'error' });
    }
  };

  // Helper getters
  const getTableOccupancy = (tableId: string) => {
    return assignments.filter(s => s.table_id === tableId).length;
  };

  const getTableAssignedGuests = (tableId: string): AssignedGuest[] => {
    const tableAssignments = assignments.filter(s => s.table_id === tableId);
    const guestIds = new Set(tableAssignments.map(s => s.guest_id));
    return guests.filter(g => guestIds.has(g.id));
  };

  const assignedGuestIdsAll = new Set(assignments.map(s => s.guest_id));
  const unassignedGuestsList: UnassignedGuestItem[] = guests.filter(g => !assignedGuestIdsAll.has(g.id));

  // Check for duplicate table numbers
  const tableNumbers = tables.map(t => t.table_number);
  const hasDuplicateNumbers = new Set(tableNumbers).size !== tableNumbers.length;

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* Toast Feedback */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
              {tables.length} mesas · {assignments.length} invitados asignados
            </span>
            <button onClick={handleCreateTable} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> Nueva Mesa
            </button>
          </div>
        </div>

        {/* Duplicate Table Number Alert */}
        {hasDuplicateNumbers && (
          <div className="bg-[#A83232]/10 border border-[#A83232] p-3 rounded-sm flex items-center gap-3 text-xs text-[#A83232]">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              <strong>Advertencia de Numeración:</strong> Se detectaron números de mesa duplicados. Por favor ajusta los números desde el Inspector de Mesa.
            </span>
          </div>
        )}

        {/* Mode & Status Toolbar */}
        <div className={styles.modeBar}>
          <div className={styles.modeToggle}>
            <button
              onClick={() => setEditorMode('view')}
              className={`${styles.modeButton} ${editorMode === 'view' ? styles.modeButtonActive : ''}`}
            >
              <Eye size={12} style={{ display: 'inline', marginRight: '6px' }} />
              Visualización
            </button>

            <button
              onClick={() => setEditorMode('edit')}
              className={`${styles.modeButton} ${editorMode === 'edit' ? styles.modeButtonActive : ''}`}
            >
              <Edit3 size={12} style={{ display: 'inline', marginRight: '6px' }} />
              Editar Plano
            </button>
          </div>

          <div>
            {saveStatus === 'saving' && (
              <span className={`${styles.saveBadge} ${styles.saveBadgeSaving}`}>
                <Loader2 size={12} className="animate-spin" /> {saveMessage}
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className={`${styles.saveBadge} ${styles.saveBadgeSuccess}`}>
                <CheckCircle2 size={12} /> {saveMessage}
              </span>
            )}
            {saveStatus === 'error' && (
              <span className={`${styles.saveBadge} ${styles.saveBadgeError}`}>
                <AlertTriangle size={12} /> {saveMessage}
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className={`${styles.saveBadge} ${styles.saveBadgeIdle}`}>
                {editorMode === 'edit' ? 'Modo Editar Activo' : 'Modo Visualización'}
              </span>
            )}
          </div>
        </div>

        {/* Main Canvas & Lateral Inspector Grid Layout */}
        <div className={styles.mainLayout}>
          {/* Seating Canvas Component */}
          <div>
            <SeatingCanvas
              tables={tables}
              getOccupancy={getTableOccupancy}
              selectedTableId={selectedTable?.id || null}
              isEditMode={editorMode === 'edit'}
              onSelectTable={(t) => setSelectedTable(t)}
              onTablePositionChange={handleTablePositionChange}
              onGuestDropOnTable={handleAssignGuestToTable}
            />
          </div>

          {/* Lateral Inspector Drawer */}
          <div>
            {selectedTable ? (
              <TableInspector
                table={selectedTable}
                assignedGuests={getTableAssignedGuests(selectedTable.id)}
                onClose={() => setSelectedTable(null)}
                onSaveProperties={handleSaveTableProperties}
                onToggleLock={handleToggleLock}
                onRemoveGuest={handleRemoveGuestFromTable}
              />
            ) : (
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 text-center space-y-2 rounded-sm shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] block">
                  Sin Selección
                </span>
                <p className="font-serif text-lg text-[var(--text-primary)]">
                  Selecciona una mesa en el mapa
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Haz clic sobre cualquier mesa para inspeccionar y editar sus propiedades o gestionar los invitados asignados.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Unassigned Guests Section */}
        <UnassignedGuests
          unassignedGuests={unassignedGuestsList}
          tables={tables}
          onAssignGuest={handleAssignGuestToTable}
        />
      </div>
    </DashboardLayout>
  );
}
