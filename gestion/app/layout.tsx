import './globals.css';
import './workspace-shell.css';
import React from 'react';

export const metadata = {
  metadataBase: new URL('https://gestion.felipeycami.cl'),
  title: {
    default: 'F&C — Centro de Gestión',
    template: '%s · F&C',
  },
  description: 'Centro privado de gestión del matrimonio de Felipe & Camila.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
