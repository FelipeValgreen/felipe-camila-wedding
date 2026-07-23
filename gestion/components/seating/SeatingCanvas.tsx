'use client';

import React from 'react';
import SeatingLandmark from './SeatingLandmark';
import SeatingTable, { TableModel } from './SeatingTable';
import styles from './seating.module.css';

interface SeatingCanvasProps {
  tables: TableModel[];
  getOccupancy: (tableId: string) => number;
  selectedTableId: string | null;
  isEditMode: boolean;
  onSelectTable: (table: TableModel) => void;
  onTablePositionChange: (table: TableModel, nextX: number, nextY: number) => Promise<void>;
  onGuestDropOnTable?: (guestId: string, tableId: string) => void;
}

export default function SeatingCanvas({
  tables,
  getOccupancy,
  selectedTableId,
  isEditMode,
  onSelectTable,
  onTablePositionChange,
  onGuestDropOnTable
}: SeatingCanvasProps) {
  return (
    <div className={`${styles.canvasWrapper} ${isEditMode ? styles.canvasGrid : ''}`}>
      {/* Salón Landmarks */}
      <SeatingLandmark type="stage" title="Escenario" subtitle="Música / DJ / Show" />
      <SeatingLandmark type="dancefloor" title="Pista de Baile" subtitle="Zona Central" />
      <SeatingLandmark type="bridegroom" title="Mesa de Novios" subtitle="Felipe & Camila" />
      <SeatingLandmark type="desserts" title="Mesón de Postres" subtitle="Buffet & Dulces" />
      <SeatingLandmark type="entrance" title="Entrada" subtitle="Acceso Salón" />

      {/* Render Tables */}
      {tables.map((t) => (
        <SeatingTable
          key={t.id}
          table={t}
          occupancy={getOccupancy(t.id)}
          isSelected={selectedTableId === t.id}
          isEditMode={isEditMode}
          onSelect={onSelectTable}
          onPositionChange={onTablePositionChange}
          onGuestDrop={onGuestDropOnTable}
        />
      ))}
    </div>
  );
}
