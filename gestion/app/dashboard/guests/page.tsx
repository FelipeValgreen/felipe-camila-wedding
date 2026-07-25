'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import {
  AlertTriangle,
  CheckCircle2,
  Edit,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  UserCheck,
  Users,
  X,
  XCircle
} from 'lucide-react';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone_e164: string | null;
  group_name: string;
  family_side: string;
  guest_category: string;
  invitation_status: string;
  attendance_status: string;
  dietary_type: string | null;
  dietary_detail: string | null;
  reconfirmation_status: string;
  table_id: string | null;
  rsvp_id: string | null;
  guest_status: string;
  notes: string | null;
}

interface RsvpMember {
  id: string;
  display_name: string;
  guest_id: string | null;
  resolution_status: string;
  attendance_status: string;
  dietary_type: string | null;
  dietary_detail: string | null;
}

interface RsvpSummary {
  rsvp_id: string;
  response_name: string;
  phone_e164: string;
  attendance_status: string;
  dietary_type: string | null;
  dietary_detail: string | null;
  reconciliation_status: string;
  sheet_sync_status: string;
  created_at: string;
  member_count: number;
  matched_member_count: number;
  pending_member_count: number;
  members: RsvpMember[] | null;
}

type GuestFilter =
  | 'all'
  | 'attending'
  | 'pending'
  | 'not_attending'
  | 'no_phone'
  | 'no_table'
  | 'dietary';

type Notice = { type: 'success' | 'error' | 'info'; text: string };

const EMPTY_GUEST: Partial<Guest> = {
  first_name: '',
  last_name: '',
  phone_e164: '',
  group_name: 'General',
  family_side: 'Compartido',
  guest_category: 'Adulto',
  invitation_status: 'not_sent',
  attendance_status: 'pending',
  dietary_type: 'Ninguna',
  dietary_detail: '',
  reconfirmation_status: 'pending',
  guest_status: 'active',
  notes: ''
};

function fullName(guest: Pick<Guest, 'first_name' | 'last_name'>): string {
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    attending: 'Asiste',
    not_attending: 'No asiste',
    pending: 'Pendiente',
    matched: 'Conciliada',
    split_matched: 'Conjunta conciliada',
    partially_matched: 'Conciliación parcial',
    unmatched: 'Sin vincular',
    ambiguous: 'Ambigua',
    conflict: 'Conflicto'
  };
  return labels[status] || status;
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rsvps, setRsvps] = useState<RsvpSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [tab, setTab] = useState<'guests' | 'rsvps'>('guests');
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Guest>>({});
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [guestsResult, rsvpResult] = await Promise.all([
        supabase.from('wedding_guests').select('*').order('first_name', { ascending: true }),
        supabase.from('rsvp_management_summary').select('*').order('created_at', { ascending: false })
      ]);

      const errors = [guestsResult.error, rsvpResult.error].filter(Boolean);
      if (errors.length > 0) {
        throw new Error(errors.map(error => error?.message).join(' · '));
      }

      setGuests((guestsResult.data || []) as Guest[]);
      setRsvps((rsvpResult.data || []) as RsvpSummary[]);
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible cargar invitados y RSVP.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeGuests = useMemo(
    () => guests.filter(guest => guest.guest_status === 'active'),
    [guests]
  );

  const stats = useMemo(() => ({
    active: activeGuests.length,
    attending: activeGuests.filter(guest => guest.attendance_status === 'attending').length,
    pending: activeGuests.filter(guest => guest.attendance_status === 'pending').length,
    declined: activeGuests.filter(guest => guest.attendance_status === 'not_attending').length,
    noTable: activeGuests.filter(
      guest => guest.attendance_status === 'attending' && !guest.table_id
    ).length,
    dietary: activeGuests.filter(
      guest => guest.dietary_type && guest.dietary_type !== 'Ninguna'
    ).length,
    review: rsvps.filter(rsvp =>
      rsvp.pending_member_count > 0 ||
      ['unmatched', 'partially_matched', 'ambiguous', 'conflict'].includes(rsvp.reconciliation_status)
    ).length,
    joint: rsvps.filter(rsvp => rsvp.member_count > 1).length
  }), [activeGuests, rsvps]);

  const filteredGuests = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return activeGuests.filter(guest => {
      const haystack = `${fullName(guest)} ${guest.group_name} ${guest.phone_e164 || ''}`.toLowerCase();
      if (term && !haystack.includes(term)) return false;
      if (filter === 'attending') return guest.attendance_status === 'attending';
      if (filter === 'pending') return guest.attendance_status === 'pending';
      if (filter === 'not_attending') return guest.attendance_status === 'not_attending';
      if (filter === 'no_phone') return !guest.phone_e164;
      if (filter === 'no_table') return guest.attendance_status === 'attending' && !guest.table_id;
      if (filter === 'dietary') return Boolean(guest.dietary_type && guest.dietary_type !== 'Ninguna');
      return true;
    });
  }, [activeGuests, filter, searchTerm]);

  const filteredRsvps = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return rsvps.filter(rsvp =>
      !term || `${rsvp.response_name} ${rsvp.phone_e164}`.toLowerCase().includes(term)
    );
  }, [rsvps, searchTerm]);

  function openEdit(guest: Guest) {
    setCreatingGuest(false);
    setSelectedGuest(guest);
    setEditForm({ ...guest });
    setNotice(null);
  }

  function openCreate() {
    setCreatingGuest(true);
    setSelectedGuest(null);
    setEditForm({ ...EMPTY_GUEST });
    setNotice(null);
  }

  function closeEditor() {
    if (saving) return;
    setSelectedGuest(null);
    setCreatingGuest(false);
    setEditForm({});
  }

  async function saveGuest() {
    const firstName = String(editForm.first_name || '').trim();
    if (!firstName) {
      setNotice({ type: 'error', text: 'El nombre es obligatorio.' });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const isCreate = creatingGuest;
      const response = await fetch('/api/guests', {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isCreate ? {} : { id: selectedGuest?.id }),
          first_name: firstName,
          last_name: String(editForm.last_name || '').trim(),
          phone_e164: editForm.phone_e164 || null,
          group_name: String(editForm.group_name || 'General').trim(),
          family_side: editForm.family_side || 'Compartido',
          guest_category: editForm.guest_category || 'Adulto',
          invitation_status: editForm.invitation_status || 'not_sent',
          attendance_status: editForm.attendance_status || 'pending',
          dietary_type: editForm.dietary_type || 'Ninguna',
          dietary_detail: editForm.dietary_detail || null,
          reconfirmation_status: editForm.reconfirmation_status || 'pending',
          guest_status: editForm.guest_status || 'active',
          notes: editForm.notes || null
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'No fue posible guardar la ficha.');
      }

      await loadData();

      // Cierre explícito después de un guardado exitoso. No depende del valor
      // asincrónico de `saving`, por lo que el panel no queda abierto.
      setSelectedGuest(null);
      setCreatingGuest(false);
      setEditForm({});

      const hasWarnings = Array.isArray(payload.warnings) && payload.warnings.length > 0;
      setNotice({
        type: hasWarnings ? 'info' : 'success',
        text: hasWarnings
          ? `${isCreate ? 'Invitado creado' : 'Ficha actualizada'} correctamente. La sincronización quedó en cola para reintento.`
          : `${isCreate ? 'Invitado creado' : 'Ficha actualizada'} correctamente.`
      });
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible guardar la ficha.' });
    } finally {
      setSaving(false);
    }
  }

  const editorOpen = Boolean(selectedGuest || creatingGuest);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent-gold)]">
              Directorio canónico de personas
            </span>
            <h1 className="mt-1 font-serif text-3xl text-[var(--text-primary)]">Invitados y RSVP</h1>
            <p className="mt-1 max-w-3xl text-xs text-[var(--text-secondary)]">
              Las personas se administran individualmente. Las respuestas conjuntas se conservan como evidencia y se separan desde Incidencias.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => loadData()} className="btn-secondary flex items-center gap-2">
              <RefreshCw size={14} /> Actualizar
            </button>
            <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> Nuevo invitado
            </button>
          </div>
        </header>

        {notice && (
          <div className={`flex items-start gap-2 border p-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800'
              : notice.type === 'error'
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-800'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-800'
          }`}>
            {notice.type === 'success'
              ? <CheckCircle2 size={17} />
              : notice.type === 'error'
                ? <XCircle size={17} />
                : <AlertTriangle size={17} />}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {[
            ['Activos', stats.active],
            ['Confirmados', stats.attending],
            ['Pendientes', stats.pending],
            ['No asisten', stats.declined],
            ['Sin mesa', stats.noTable],
            ['Restricciones', stats.dietary],
            ['RSVP por revisar', stats.review],
            ['Conjuntas', stats.joint]
          ].map(([label, value]) => (
            <div key={String(label)} className="border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-center">
              <span className="block text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
              <strong className="text-xl">{value}</strong>
            </div>
          ))}
        </div>

        {stats.review > 0 && (
          <div className="flex flex-col gap-3 border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-sm text-amber-900">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <strong className="block">Hay {stats.review} respuestas que requieren revisión.</strong>
                <span>Resuélvelas antes de cerrar cantidades o distribuir mesas.</span>
              </div>
            </div>
            <Link href="/dashboard/issues" className="btn-primary flex items-center justify-center gap-2 text-xs">
              <Link2 size={13} /> Abrir incidencias
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-3 border-b border-[var(--border-color)] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTab('guests')}
              className={`flex items-center gap-2 border px-3 py-2 ${tab === 'guests' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              <Users size={14} /> Personas individuales
            </button>
            <button
              type="button"
              onClick={() => setTab('rsvps')}
              className={`flex items-center gap-2 border px-3 py-2 ${tab === 'rsvps' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              <UserCheck size={14} /> Respuestas originales
            </button>
          </div>
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-3 text-[var(--text-muted)]" />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Buscar nombre, grupo o teléfono…"
              className="w-full border border-[var(--border-color)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="border border-[var(--border-color)] bg-[var(--bg-card)] p-10 text-center text-sm text-[var(--text-secondary)]">
            <Loader2 className="mx-auto mb-2 animate-spin" size={22} /> Cargando información…
          </div>
        ) : tab === 'guests' ? (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                ['all', `Todos (${stats.active})`],
                ['attending', `Confirmados (${stats.attending})`],
                ['pending', `Pendientes (${stats.pending})`],
                ['not_attending', `No asisten (${stats.declined})`],
                ['no_phone', 'Sin teléfono'],
                ['no_table', `Sin mesa (${stats.noTable})`],
                ['dietary', `Restricciones (${stats.dietary})`]
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as GuestFilter)}
                  className={`border px-3 py-1.5 ${filter === value ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto border border-[var(--border-color)] bg-[var(--bg-card)]">
              <table className="w-full min-w-[1050px] text-left text-xs">
                <thead className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Grupo</th>
                    <th className="p-3">Familia</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Teléfono</th>
                    <th className="p-3">Asistencia</th>
                    <th className="p-3">Restricción</th>
                    <th className="p-3">Reconfirmación</th>
                    <th className="p-3">Mesa</th>
                    <th className="p-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredGuests.length === 0 ? (
                    <tr><td colSpan={10} className="p-8 text-center text-[var(--text-secondary)]">No hay invitados en esta vista.</td></tr>
                  ) : filteredGuests.map(guest => (
                    <tr key={guest.id} className="hover:bg-[var(--bg-secondary)]/50">
                      <td className="p-3 font-semibold">{fullName(guest)}</td>
                      <td className="p-3">{guest.group_name}</td>
                      <td className="p-3">{guest.family_side}</td>
                      <td className="p-3">{guest.guest_category}</td>
                      <td className="p-3 font-mono">{guest.phone_e164 || <span className="font-sans text-rose-700">Sin teléfono</span>}</td>
                      <td className="p-3">{statusLabel(guest.attendance_status)}</td>
                      <td className="p-3">{guest.dietary_type && guest.dietary_type !== 'Ninguna' ? `${guest.dietary_type}${guest.dietary_detail ? ` · ${guest.dietary_detail}` : ''}` : 'Ninguna'}</td>
                      <td className="p-3">{guest.reconfirmation_status}</td>
                      <td className="p-3">{guest.table_id ? 'Asignada' : guest.attendance_status === 'attending' ? <span className="text-amber-700">Sin mesa</span> : '—'}</td>
                      <td className="p-3">
                        <button type="button" onClick={() => openEdit(guest)} className="btn-secondary flex items-center gap-1 px-2 py-1 text-[10px]">
                          <Edit size={12} /> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="overflow-x-auto border border-[var(--border-color)] bg-[var(--bg-card)]">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Nombre escrito</th>
                  <th className="p-3">Asistencia</th>
                  <th className="p-3">Personas detectadas</th>
                  <th className="p-3">Conciliación</th>
                  <th className="p-3">Sheets</th>
                  <th className="p-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredRsvps.map(rsvp => (
                  <tr key={rsvp.rsvp_id} className="align-top hover:bg-[var(--bg-secondary)]/50">
                    <td className="whitespace-nowrap p-3">{new Date(rsvp.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3"><strong className="block">{rsvp.response_name}</strong><span className="font-mono text-[10px] text-[var(--text-muted)]">{rsvp.phone_e164}</span></td>
                    <td className="p-3">{statusLabel(rsvp.attendance_status)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(rsvp.members || []).map(member => (
                          <span key={member.id} className={`border px-2 py-1 text-[10px] ${member.resolution_status === 'matched' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800' : 'border-amber-500/40 bg-amber-500/10 text-amber-800'}`}>
                            {member.display_name} · {member.resolution_status}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">{statusLabel(rsvp.reconciliation_status)} · {rsvp.matched_member_count}/{rsvp.member_count}</td>
                    <td className="p-3"><span className={rsvp.sheet_sync_status === 'synced' ? 'text-emerald-700' : 'text-rose-700'}>{rsvp.sheet_sync_status}</span></td>
                    <td className="p-3">
                      {rsvp.pending_member_count > 0 || !['matched', 'split_matched'].includes(rsvp.reconciliation_status) ? (
                        <Link href="/dashboard/issues" className="btn-primary flex items-center justify-center gap-1 px-2 py-1 text-[10px]">
                          <Link2 size={12} /> Resolver
                        </Link>
                      ) : <CheckCircle2 size={16} className="text-emerald-700" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editorOpen && (
          <>
            <button
              type="button"
              aria-label="Cerrar edición"
              onClick={closeEditor}
              className="fixed inset-0 z-40 bg-black/25"
            />
            <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between border-b border-[var(--border-color)] pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
                    {creatingGuest ? 'Nueva persona' : 'Edición de ficha'}
                  </span>
                  <h2 className="font-serif text-2xl">{creatingGuest ? 'Crear invitado' : fullName(selectedGuest!)}</h2>
                </div>
                <button type="button" onClick={closeEditor} disabled={saving}><X size={19} /></button>
              </div>

              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs"><span className="mb-1 block font-semibold uppercase">Nombre *</span><input value={editForm.first_name || ''} onChange={event => setEditForm({ ...editForm, first_name: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" /></label>
                  <label className="text-xs"><span className="mb-1 block font-semibold uppercase">Apellido</span><input value={editForm.last_name || ''} onChange={event => setEditForm({ ...editForm, last_name: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" /></label>
                </div>

                <label className="block text-xs"><span className="mb-1 block font-semibold uppercase">Teléfono</span><input value={editForm.phone_e164 || ''} onChange={event => setEditForm({ ...editForm, phone_e164: event.target.value })} placeholder="+56 9 1234 5678" className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" /></label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs"><span className="mb-1 block font-semibold uppercase">Grupo</span><input value={editForm.group_name || ''} onChange={event => setEditForm({ ...editForm, group_name: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" /></label>
                  <label className="text-xs"><span className="mb-1 block font-semibold uppercase">Familia</span><select value={editForm.family_side || 'Compartido'} onChange={event => setEditForm({ ...editForm, family_side: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2"><option>Felipe</option><option>Camila</option><option>Compartido</option><option>Por clasificar</option></select></label>
                  <label className="text-xs"><span className="mb-1 block font-semibold uppercase">Categoría</span><select value={editForm.guest_category || 'Adulto'} onChange={event => setEditForm({ ...editForm, guest_category: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2"><option>Adulto</option><option>Niño</option><option>Proveedor-Staff</option><option>After 11</option></select></label>
                  <label className="text-xs"><span className="mb-1 block font-semibold uppercase">Asistencia</span><select value={editForm.attendance_status || 'pending'} onChange={event => setEditForm({ ...editForm, attendance_status: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2"><option value="pending">Pendiente</option><option value="attending">Asiste</option><option value="not_attending">No asiste</option></select></label>
                </div>

                <div className="border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900">
                  Cambiar asistencia no modifica automáticamente la reconfirmación. Ambos campos son independientes.
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs"><span className="mb-1 block font-semibold uppercase">Restricción</span><select value={editForm.dietary_type || 'Ninguna'} onChange={event => setEditForm({ ...editForm, dietary_type: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2"><option>Ninguna</option><option>Vegetariano</option><option>Vegano</option><option>Celíaco / libre de gluten</option><option>Alergias</option><option>Otra</option></select></label>
                  <label className="text-xs"><span className="mb-1 block font-semibold uppercase">Detalle</span><input value={editForm.dietary_detail || ''} onChange={event => setEditForm({ ...editForm, dietary_detail: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" /></label>
                  <label className="text-xs"><span className="mb-1 block font-semibold uppercase">Reconfirmación</span><select value={editForm.reconfirmation_status || 'pending'} onChange={event => setEditForm({ ...editForm, reconfirmation_status: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2"><option value="pending">Pendiente</option><option value="confirmed">Confirmada</option><option value="changed">Cambió</option><option value="not_required">No requerida</option></select></label>
                  <label className="text-xs"><span className="mb-1 block font-semibold uppercase">Estado ficha</span><select value={editForm.guest_status || 'active'} onChange={event => setEditForm({ ...editForm, guest_status: event.target.value })} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2"><option value="active">Activa</option><option value="replaced">Reemplazada</option><option value="inactive">Inactiva</option></select></label>
                </div>

                <label className="block text-xs"><span className="mb-1 block font-semibold uppercase">Notas internas</span><textarea value={editForm.notes || ''} onChange={event => setEditForm({ ...editForm, notes: event.target.value })} rows={4} className="w-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2" /></label>

                <button type="button" onClick={saveGuest} disabled={saving} className="btn-primary flex w-full items-center justify-center gap-2 py-3">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Guardando ficha…' : creatingGuest ? 'Crear invitado' : 'Guardar cambios'}
                </button>
              </div>
            </aside>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
