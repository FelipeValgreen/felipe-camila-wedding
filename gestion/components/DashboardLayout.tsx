'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Grid, DollarSign, Activity, LogOut, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('filipo.valverde@gmail.com');
  const [userRole, setUserRole] = useState<string>('owner');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        const { data: profile } = await supabase
          .from('admin_profiles')
          .select('role')
          .eq('email', session.user.email)
          .single();
        if (profile?.role) setUserRole(profile.role);
      }
    }
    checkAuth();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync/process', { method: 'POST' });
      const data = await res.json();
      alert(`Sincronización completada. Filas procesadas: ${data.processed || 0}`);
    } catch (err) {
      console.error('Error syncing:', err);
      alert('Sincronización iniciada.');
    } finally {
      setSyncing(false);
    }
  }

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
          <div className="px-3 py-4 border-b border-[var(--border-color)] mb-6 flex items-center justify-between">
            <div>
              <span className="font-serif text-2xl text-[var(--text-primary)] block">F&C</span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)] font-medium block mt-1">
                Centro de Gestión
              </span>
            </div>
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] rounded"
              title="Sincronizar ahora con Google Sheets"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            </button>
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

        {/* Real User Profile */}
        <div className="p-3 border-t border-[var(--border-color)] pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="block text-xs font-semibold text-[var(--text-primary)] truncate">{userEmail}</span>
              <span className="block text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Rol: {userRole}</span>
            </div>
            <span className="badge badge-confirmed">Autenticado</span>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full btn-secondary text-left flex items-center justify-center gap-2 py-2"
          >
            <LogOut size={12} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
