'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import styles from './seating.module.css';

export interface TableModel {
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

interface SeatingTableProps {
  table: TableModel;
  occupancy: number;
  isSelected: boolean;
  isEditMode: boolean;
  onSelect: (table: TableModel) => void;
  onPositionChange: (table: TableModel, nextX: number, nextY: number) => Promise<void>;
  onGuestDrop?: (guestId: string, tableId: string) => void;
}

export default function SeatingTable({
  table,
  occupancy,
  isSelected,
  isEditMode,
  onSelect,
  onPositionChange,
  onGuestDrop
}: SeatingTableProps) {
  const isDraggingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number; posX: number; posY: number }>({ x: 0, y: 0, posX: 0, posY: 0 });

  // Coordinate bounds check
  const rawX = Number(table.position_x);
  const rawY = Number(table.position_y);
  const posX = Number.isFinite(rawX) ? Math.max(6, Math.min(94, rawX)) : 50;
  const posY = Number.isFinite(rawY) ? Math.max(8, Math.min(92, rawY)) : 50;

  // Local drag position state & ref for single PATCH on pointerup
  const [dragPosition, setDragPosition] = useState({ x: posX, y: posY });
  const finalPositionRef = useRef({ x: posX, y: posY });

  useEffect(() => {
    setDragPosition({ x: posX, y: posY });
    finalPositionRef.current = { x: posX, y: posY };
  }, [posX, posY]);

  const isOverCapacity = occupancy > table.capacity;
  const isComplete = occupancy === table.capacity;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onSelect(table);

    if (!isEditMode || table.locked) return;

    const elem = e.currentTarget;
    elem.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;

    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: dragPosition.x,
      posY: dragPosition.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !isEditMode || table.locked) return;

    const parent = e.currentTarget.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const deltaX = ((e.clientX - startPosRef.current.x) / rect.width) * 100;
    const deltaY = ((e.clientY - startPosRef.current.y) / rect.height) * 100;

    const nextX = Math.max(6, Math.min(94, Math.round(startPosRef.current.posX + deltaX)));
    const nextY = Math.max(8, Math.min(92, Math.round(startPosRef.current.posY + deltaY)));

    // ONLY update local visual position state during move - DO NOT call onPositionChange here
    setDragPosition({ x: nextX, y: nextY });
    finalPositionRef.current = { x: nextX, y: nextY };
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe fallback
      }

      // Execute single PATCH on drag completion
      const finalPos = finalPositionRef.current;
      if (finalPos.x !== posX || finalPos.y !== posY) {
        await onPositionChange(table, finalPos.x, finalPos.y);
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setDragPosition({ x: posX, y: posY });
      finalPositionRef.current = { x: posX, y: posY };
    }
  };

  // HTML5 Drag Drop support for Guest Assignment
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const guestId = e.dataTransfer.getData('text/guest-id');
    if (guestId && onGuestDrop) {
      // Pass guestId first, table.id second
      onGuestDrop(guestId, table.id);
    }
  };

  let stateClasses = '';
  if (isSelected) stateClasses += ` ${styles.tableSelected}`;
  if (isOverCapacity) stateClasses += ` ${styles.tableOverCapacity}`;
  else if (isComplete) stateClasses += ` ${styles.tableComplete}`;
  if (table.locked) stateClasses += ` ${styles.tableLocked}`;
  if (isEditMode && !table.locked) stateClasses += ` ${styles.tableElementHover}`;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        left: `${dragPosition.x}%`,
        top: `${dragPosition.y}%`,
        transform: 'translate(-50%, -50%)',
        cursor: table.locked ? 'not-allowed' : isEditMode ? 'grab' : 'pointer'
      }}
      className={`${styles.tableElement}${stateClasses}`}
      title={`${table.name} (${occupancy}/${table.capacity} personas)`}
    >
      <span className={styles.tableNumber}>
        Mesa {table.table_number}
      </span>

      <span className={styles.tableName}>
        {table.name}
      </span>

      <span
        className={styles.tableOccupancy}
        style={{
          color: isOverCapacity ? '#A83232' : isComplete ? '#2D5A27' : 'var(--text-secondary)'
        }}
      >
        {occupancy} / {table.capacity}
      </span>

      {table.locked && (
        <Lock
          size={10}
          style={{ position: 'absolute', top: '8px', right: '10px', color: 'var(--text-muted)' }}
        />
      )}

      {isOverCapacity && (
        <AlertTriangle
          size={10}
          style={{ position: 'absolute', bottom: '6px', color: '#A83232' }}
        />
      )}
    </div>
  );
}
