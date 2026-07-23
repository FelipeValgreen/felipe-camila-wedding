'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Grid, DollarSign, Activity, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: LayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Invitados & RSVP', href: '/dashboard/guests', icon: Users },
    { label: 'Mapa & Mesas', href: '/dashboard/tables', icon: Grid },
    { label: 'Finanzas & Pagos', href: '/dashboard/finance', icon: DollarSign },
    { label: 'Actividad & Auditoría', href: '/dashboard/activity', icon: Activity },
  ];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div>
          {/* Header Monogram */}
          <div className="px-3 py-4 border-b border-[var(--border-color)] mb-6">
            <span className="font-serif text-2xl text-[var(--text-primary)] block">F&C</span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)] font-medium block mt-1">
              Centro de Gestión
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info / Role */}
        <div className="p-3 border-t border-[var(--border-color)] pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-[var(--text-primary)]">Felipe & Camila</span>
              <span className="block text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Rol: Owner</span>
            </div>
            <span className="badge badge-confirmed">Activo</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
