'use client';

import React, { useState } from 'react';
import { Search, Move, UserPlus } from 'lucide-react';
import { TableModel } from './SeatingTable';
import styles from './seating.module.css';

export interface UnassignedGuestItem {
  id: string;
  first_name: string;
  last_name: string;
  dietary_type: string | null;
  family_side: string;
}

interface UnassignedGuestsProps {
  unassignedGuests: UnassignedGuestItem[];
  tables: TableModel[];
  onAssignGuest: (guestId: string, tableId: string) => Promise<void>;
}

export default function UnassignedGuests({ unassignedGuests, tables, onAssignGuest }: UnassignedGuestsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTableForGuest, setSelectedTableForGuest] = useState<{ [guestId: string]: string }>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const filtered = unassignedGuests.filter(g =>
    `${g.first_name} ${g.last_name} ${g.family_side}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, guestId: string) => {
    e.dataTransfer.setData('text/guest-id', guestId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDirectAssign = async (guestId: string) => {
    const targetTableId = selectedTableForGuest[guestId];
    if (!targetTableId) return;

    setAssigningId(guestId);
    try {
      await onAssignGuest(guestId, targetTableId);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className={styles.unassignedSection}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
        <div>
          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--gold)' }}>
            Confirmados Sin Asignación
          </span>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', margin: '2px 0 0', color: 'var(--text-primary)' }}>
            Invitados Confirmados Sin Mesa ({unassignedGuests.length})
          </h3>
        </div>

        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Filtrar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '6px 10px 6px 28px', fontSize: '11px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '12px 0', gridColumn: '1 / -1', textAlign: 'center' }}>
            {unassignedGuests.length === 0
              ? 'Todos los invitados confirmados se encuentran asignados a una mesa.'
              : 'No se encontraron invitados sin mesa que coincidan con la búsqueda.'}
          </p>
        ) : (
          filtered.map((g) => (
            <div
              key={g.id}
              draggable
              onDragStart={(e) => handleDragStart(e, g.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '3px',
                cursor: 'grab',
                fontSize: '11px'
              }}
            >
              <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {g.first_name} {g.last_name}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block' }}>
                  Familia: {g.family_side}
                  {g.dietary_type && g.dietary_type !== 'Ninguna' ? ` · ${g.dietary_type}` : ''}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={selectedTableForGuest[g.id] || ''}
                  onChange={(e) => setSelectedTableForGuest({ ...selectedTableForGuest, [g.id]: e.target.value })}
                  style={{ fontSize: '10px', padding: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
                >
                  <option value="">Seleccionar mesa...</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      Mesa {t.table_number}: {t.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleDirectAssign(g.id)}
                  disabled={!selectedTableForGuest[g.id] || assigningId === g.id}
                  className="btn-primary"
                  style={{ padding: '4px 8px', fontSize: '9px', minHeight: '26px' }}
                  title="Asignar a la mesa seleccionada"
                >
                  <UserPlus size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
