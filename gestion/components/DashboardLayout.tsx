'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  DollarSign,
  ExternalLink,
  Grid,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Invitados & RSVP', href: '/dashboard/guests', icon: Users },
  { label: 'Incidencias', href: '/dashboard/issues', icon: AlertTriangle },
  { label: 'Mapa & Mesas', href: '/dashboard/tables', icon: Grid },
  { label: 'Finanzas & Pagos', href: '/dashboard/finance', icon: DollarSign },
  { label: 'Actividad', href: '/dashboard/activity', icon: Activity },
];

export default function DashboardLayout({ children }: LayoutProps) {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState('Cargando…');
  const [userRole, setUserRole] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = '/login';
          return;
        }

        setUserEmail(user.email || 'Administrador');

        const { data: profile } = await supabase
          .from('admin_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setUserRole(profile?.role || 'administrador');
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    }

    checkAuth();
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = '/login';
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync/process', { method: 'POST' });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No fue posible sincronizar.');
      }

      window.alert(`Sincronización completada. Registros procesados: ${data.processed || 0}.`);
    } catch (error: any) {
      console.error('Error syncing:', error);
      window.alert(error?.message || 'No fue posible sincronizar con Google Sheets.');
    } finally {
      setSyncing(false);
    }
  }

  const sidebarContent = (
    <>
      <div>
        <div className="sidebar-brand">
          <div>
            <span className="sidebar-date">23 · 10 · 26</span>
            <span className="sidebar-monogram">F&amp;C</span>
            <span className="sidebar-subtitle">Centro de Gestión</span>
          </div>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-wedding-card">
          <Sparkles size={15} />
          <div>
            <strong>El Umbral Vivo</strong>
            <span>Viernes 23 de octubre de 2026</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación del Centro de Gestión">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing}
          className="sidebar-sync"
        >
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          <span>{syncing ? 'Sincronizando…' : 'Sincronizar con Sheets'}</span>
        </button>

        <a
          href="https://felipeycami.cl"
          target="_blank"
          rel="noreferrer"
          className="sidebar-public-link"
        >
          <ExternalLink size={14} />
          <span>Ver invitación</span>
        </a>

        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {userEmail?.slice(0, 1).toUpperCase() || 'F'}
          </div>
          <div className="sidebar-profile-copy">
            <strong>{userEmail}</strong>
            <span>{userRole || 'administrador'}</span>
          </div>
          <button type="button" onClick={handleSignOut} aria-label="Cerrar sesión">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="dashboard-shell">
      <header className="mobile-topbar">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir navegación"
        >
          <Menu size={22} />
        </button>
        <div>
          <span>F&amp;C</span>
          <small>Centro de Gestión</small>
        </div>
        <CalendarDays size={19} />
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar navegación"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        {sidebarContent}
      </aside>

      <main className="main-content">
        <div className="main-content-inner">{children}</div>
      </main>
    </div>
  );
}
