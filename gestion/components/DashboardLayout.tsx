'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  CalendarDays,
  DollarSign,
  ExternalLink,
  FileText,
  Grid,
  LayoutDashboard,
  LogOut,
  Menu,
  Music,
  RefreshCw,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface LayoutProps { children: React.ReactNode; }

type NavItem = { label: string; href: string; icon: LucideIcon; description: string; };

const navigationGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Control',
    items: [
      { label: 'Inicio', href: '/dashboard', icon: LayoutDashboard, description: 'Estado general de la boda' },
      { label: 'Necesita atención', href: '/dashboard/issues', icon: AlertCircle, description: 'Incidencias por resolver' },
      { label: 'Planificación', href: '/dashboard/planning', icon: CalendarDays, description: 'Plan de cierre desde datos reales' },
    ],
  },
  {
    label: 'Personas y espacio',
    items: [
      { label: 'Invitados', href: '/dashboard/guests', icon: Users, description: 'Personas, RSVP y restricciones' },
      { label: 'Mesas', href: '/dashboard/tables', icon: Grid, description: 'Capacidad, grupos y distribución' },
    ],
  },
  {
    label: 'Operación',
    items: [
      { label: 'Cronograma', href: '/dashboard/timeline', icon: CalendarDays, description: 'Secuencia operativa del evento' },
      { label: 'Presupuesto y proveedores', href: '/dashboard/finance', icon: DollarSign, description: 'Gastos, pagos y contratos' },
      { label: 'Actividad', href: '/dashboard/activity', icon: Activity, description: 'Historial de cambios' },
    ],
  },
];

const roadmapItems = [
  { label: 'Salón avanzado', icon: Grid },
  { label: 'Música', icon: Music },
  { label: 'Documentos', icon: FileText },
];

const routeTitles: Record<string, { eyebrow: string; title: string }> = {
  '/dashboard': { eyebrow: 'Centro de Gestión', title: 'Inicio' },
  '/dashboard/issues': { eyebrow: 'Control', title: 'Necesita atención' },
  '/dashboard/planning': { eyebrow: 'Control', title: 'Planificación' },
  '/dashboard/guests': { eyebrow: 'Personas', title: 'Invitados' },
  '/dashboard/tables': { eyebrow: 'Espacio', title: 'Mesas' },
  '/dashboard/timeline': { eyebrow: 'Operación', title: 'Cronograma' },
  '/dashboard/finance': { eyebrow: 'Operación', title: 'Presupuesto y proveedores' },
  '/dashboard/activity': { eyebrow: 'Trazabilidad', title: 'Actividad' },
};

function getDaysUntilWedding() {
  const wedding = new Date('2026-10-23T17:30:00-03:00');
  const now = new Date();
  return Math.max(0, Math.ceil((wedding.getTime() - now.getTime()) / 86_400_000));
}

export default function DashboardLayout({ children }: LayoutProps) {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState('Cargando…');
  const [userRole, setUserRole] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageContext = useMemo(() => {
    if (!pathname) return routeTitles['/dashboard'];
    const exact = routeTitles[pathname];
    if (exact) return exact;
    const parent = Object.keys(routeTitles).filter((route) => route !== '/dashboard' && pathname.startsWith(route)).sort((a, b) => b.length - a.length)[0];
    return routeTitles[parent] || routeTitles['/dashboard'];
  }, [pathname]);

  const daysUntilWedding = useMemo(() => getDaysUntilWedding(), []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }
        setUserEmail(user.email || 'Administrador');
        const { data: profile } = await supabase.from('admin_profiles').select('role').eq('id', user.id).single();
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
      if (!response.ok || !data.ok) throw new Error(data.message || data.error || 'No fue posible sincronizar.');
      window.alert(`Sincronización completada. Registros procesados: ${data.processed || 0}.`);
    } catch (error: any) {
      console.error('Error syncing:', error);
      window.alert(error?.message || 'No fue posible sincronizar con Google Sheets.');
    } finally {
      setSyncing(false);
    }
  }

  const sidebarContent = <>
    <div className="workspace-sidebar-scroll">
      <div className="workspace-brand">
        <div className="workspace-brand-lockup"><span className="workspace-mark">F&amp;C</span><div><strong>Centro de Gestión</strong><span>Felipe &amp; Camila</span></div></div>
        <button type="button" className="workspace-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><X size={19}/></button>
      </div>

      <div className="workspace-event-card">
        <div className="workspace-event-kicker"><span>23 octubre 2026</span><span>{daysUntilWedding === 0 ? 'Hoy' : `${daysUntilWedding} días`}</span></div>
        <strong>El Umbral Vivo</strong>
        <p>Una sola vista para decisiones, personas, espacio y operación.</p>
        <div className="workspace-event-progress" aria-hidden="true"><span/></div>
      </div>

      <nav className="workspace-nav" aria-label="Navegación del Centro de Gestión">
        {navigationGroups.map((group) => <div className="workspace-nav-group" key={group.label}>
          <span className="workspace-nav-label">{group.label}</span>
          <div className="workspace-nav-list">{group.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return <Link key={item.href} href={item.href} className={`workspace-nav-item ${isActive ? 'is-active' : ''}`}><span className="workspace-nav-icon"><Icon size={18} strokeWidth={1.8}/></span><span className="workspace-nav-copy"><strong>{item.label}</strong><small>{item.description}</small></span></Link>;
          })}</div>
        </div>)}
      </nav>

      <div className="workspace-roadmap">
        <div className="workspace-roadmap-heading"><span>En evolución</span><small>Próximos módulos</small></div>
        <div className="workspace-roadmap-list" aria-label="Próximos módulos no disponibles todavía">{roadmapItems.map((item) => { const Icon = item.icon; return <div className="workspace-roadmap-item" key={item.label}><Icon size={14} strokeWidth={1.7}/><span>{item.label}</span><small>Próximamente</small></div>; })}</div>
      </div>
    </div>

    <div className="workspace-sidebar-footer">
      <div className="workspace-assistant-status" aria-label="Asistente de planificación en diseño"><span className="workspace-assistant-icon"><Sparkles size={16}/></span><div><strong>Asistente de planificación</strong><small>Identidad y funciones en diseño</small></div></div>
      <div className="workspace-footer-actions">
        <button type="button" onClick={handleSyncNow} disabled={syncing} className="workspace-sync-button"><RefreshCw size={15} className={syncing ? 'animate-spin' : ''}/><span>{syncing ? 'Sincronizando…' : 'Sincronizar datos'}</span></button>
        <a href="https://felipeycami.cl" target="_blank" rel="noreferrer" className="workspace-invite-link"><ExternalLink size={14}/><span>Ver invitación</span></a>
      </div>
      <div className="workspace-profile">
        <div className="workspace-avatar">{userEmail?.slice(0, 1).toUpperCase() || 'F'}</div>
        <div className="workspace-profile-copy"><strong>{userEmail}</strong><span>{userRole || 'administrador'}</span></div>
        <button type="button" onClick={handleSignOut} aria-label="Cerrar sesión"><LogOut size={16}/></button>
      </div>
    </div>
  </>;

  return <div className="workspace-shell">
    <header className="workspace-mobile-topbar"><button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación"><Menu size={21}/></button><div><span>F&amp;C</span><small>{pageContext.title}</small></div><span className="workspace-mobile-days">{daysUntilWedding}d</span></header>
    {mobileOpen && <button type="button" className="workspace-backdrop" onClick={() => setMobileOpen(false)} aria-label="Cerrar navegación"/>}
    <aside className={`workspace-sidebar ${mobileOpen ? 'is-open' : ''}`}>{sidebarContent}</aside>
    <main className="workspace-main">
      <header className="workspace-contextbar"><div><span>{pageContext.eyebrow}</span><strong>{pageContext.title}</strong></div><div className="workspace-context-meta"><span>23 · 10 · 26</span><span className="workspace-context-dot"/><span>{daysUntilWedding === 0 ? 'Hoy es el día' : `Faltan ${daysUntilWedding} días`}</span></div></header>
      <div className="workspace-main-inner">{children}</div>
    </main>
  </div>;
}
