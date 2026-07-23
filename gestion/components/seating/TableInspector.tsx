'use client';

import React, { useState, useEffect } from 'react';
import { TableModel } from './SeatingTable';
import { Lock, Unlock, Save, Trash2, X, Users, AlertTriangle } from 'lucide-react';
import styles from './seating.module.css';

export interface AssignedGuest {
  id: string;
  first_name: string;
  last_name: string;
  dietary_type: string | null;
  family_side: string;
}

interface TableInspectorProps {
  table: TableModel;
  assignedGuests: AssignedGuest[];
  onClose: () => void;
  onSaveProperties: (updated: Partial<TableModel>) => Promise<void>;
  onToggleLock: (table: TableModel) => Promise<void>;
  onRemoveGuest: (guestId: string) => Promise<void>;
  onDeleteTable?: (tableId: string) => Promise<void>;
}

export default function TableInspector({
  table,
  assignedGuests,
  onClose,
  onSaveProperties,
  onToggleLock,
  onRemoveGuest,
  onDeleteTable
}: TableInspectorProps) {
  const [form, setForm] = useState<Partial<TableModel>>({ ...table });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setForm({ ...table });
    setSaveSuccess(false);
    setErrorMsg(null);
  }, [table]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      await onSaveProperties({
        id: table.id,
        table_number: Number(form.table_number) || table.table_number,
        name: (form.name || '').trim() || table.name,
        capacity: Number(form.capacity) || 10,
        zone: (form.zone || 'Principal').trim()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudieron guardar las propiedades.');
    } finally {
      setIsSaving(false);
    }
  };

  const isOverCapacity = assignedGuests.length > table.capacity;

  return (
    <div className={styles.inspectorPanel}>
      {/* Inspector Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--gold)', fontWeight: 700 }}>
            Inspector de Mesa
          </span>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', margin: '2px 0 0', color: 'var(--text-primary)' }}>
            Mesa {table.table_number}: {table.name}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onToggleLock(table)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
            title={table.locked ? 'Desbloquear posición de mesa' : 'Bloquear posición de mesa'}
          >
            {table.locked ? <Lock size={16} color="#A83232" /> : <Unlock size={16} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Property Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Número Mesa
            </label>
            <input
              type="number"
              min={1}
              required
              value={form.table_number || ''}
              onChange={(e) => setForm({ ...form, table_number: Number(e.target.value) })}
              style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Capacidad (Max 30)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              required
              value={form.capacity || 10}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Nombre de Identificación
          </label>
          <input
            type="text"
            required
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
            placeholder="Ej: Familia Garay"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Zona del Salón
          </label>
          <input
            type="text"
            value={form.zone || ''}
            onChange={(e) => setForm({ ...form, zone: e.target.value })}
            style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
            placeholder="Ej: Principal, Terraza, etc."
          />
        </div>

        {errorMsg && (
          <div style={{ fontSize: '11px', color: '#A83232', padding: '6px 8px', background: 'rgba(168, 50, 50, 0.08)' }}>
            {errorMsg}
          </div>
        )}

        {saveSuccess && (
          <div style={{ fontSize: '11px', color: '#2D5A27', padding: '6px 8px', background: 'rgba(45, 90, 39, 0.08)' }}>
            Propiedades actualizadas correctamente.
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary"
          style={{ width: '100%', minHeight: '38px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Save size={14} />
          <span>{isSaving ? 'Guardando...' : 'Guardar Propiedades'}</span>
        </button>
      </form>

      {/* Guests Assigned Section */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
            Invitados Asignados ({assignedGuests.length} / {table.capacity})
          </span>
          {isOverCapacity && (
            <span style={{ fontSize: '9px', color: '#A83232', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
              <AlertTriangle size={10} /> Sobrecapacidad
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
          {assignedGuests.length === 0 ? (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
              No hay invitados asignados a esta mesa aún.
            </span>
          ) : (
            assignedGuests.map((g) => (
              <div
                key={g.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '2px',
                  fontSize: '11px'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                    {g.first_name} {g.last_name}
                  </span>
                  {g.dietary_type && g.dietary_type !== 'Ninguna' && (
                    <span style={{ fontSize: '9px', color: '#A83232', display: 'block' }}>
                      Restricción: {g.dietary_type}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveGuest(g.id)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                  title="Quitar de esta mesa"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
