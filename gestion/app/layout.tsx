import './globals.css';
import React from 'react';

export const metadata = {
  title: 'F&C Centro de Gestión — Matrimonio Felipe & Camila',
  description: 'Centro operativo unificado para la gestión de invitados, RSVP, mesas y finanzas de Felipe & Camila.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
