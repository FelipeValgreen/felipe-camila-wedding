'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgStyles =
    type === 'success'
      ? 'bg-[#2D5A27] text-white'
      : type === 'error'
      ? 'bg-[#A83232] text-white'
      : 'bg-[#11110F] text-[#F3EFE7]';

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-sm shadow-xl text-xs font-semibold tracking-wide transition-all animate-bounce-short ${bgStyles}`}
      role="alert"
    >
      {type === 'success' && <CheckCircle2 size={16} className="shrink-0 text-green-300" />}
      {type === 'error' && <AlertCircle size={16} className="shrink-0 text-red-200" />}
      {type === 'info' && <Info size={16} className="shrink-0 text-amber-300" />}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-white/70 hover:text-white transition-colors"
        aria-label="Cerrar notificación"
      >
        <X size={14} />
      </button>
    </div>
  );
}
