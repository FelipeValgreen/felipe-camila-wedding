'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Edit3,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  Utensils,
  X,
  XCircle,
} from 'lucide-react';
import './guests-v2.css';

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

interface ManagementSummary {
  rsvpAttending: number;
  rsvpDeclined: number;
  rsvpPending: number;
  rsvpPeopleIntegrated: number;
  rsvpMatched: number;
  rsvpNeedsReview: number;
  rsvpUnmatched: number;
  reconciliationPending: number;
  rsvpResponses: number;
  sheetSynced: number;
  sheetPending: number;
  activeGuests: number;
  activeAttendingGuests: number;
  activeDeclinedGuests: number;
  activePendingGuests: number;
  openIssues: number;
  lastRsvpUpdateAt: string | null;
  lastResponseAt: string | null;
  countSemantics: string;
}

type GuestFilter = 'all' | 'attending' | 'pending' | 'not_attending' | 'no_phone' | 'no_table' | 'dietary';
type Notice = { type: 'success' | 'error' | 'info'; text: string };

const EMPTY_GUEST: Partial<Guest> = {
  first_name: '', last_name: '', phone_e164: '', group_name: 'General', family_side: 'Compartido',
  guest_category: 'Adulto', invitation_status: 'not_sent', attendance_status: 'pending',
  dietary_type: 'Ninguna', dietary_detail: '', reconfirmation_status: 'pending', guest_status: 'active', notes: '',
};

function fullName(guest: Pick<Guest, 'first_name' | 'last_name'>) {
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
}

function initials(guest: Pick<Guest, 'first_name' | 'last_name'>) {
  return `${guest.first_name?.[0] || ''}${guest.last_name?.[0] || ''}`.toUpperCase() || '?';
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    attending: 'Asiste', not_attending: 'No asiste', pending: 'Pendiente', matched: 'Conciliada',
    split_matched: 'Conjunta conciliada', partially_matched: 'Conciliación parcial', unmatched: 'Sin vincular',
    needs_review: 'Requiere revisión', ambiguous: 'Ambigua', conflict: 'Conflicto', synced: 'Sincronizado',
  };
  return labels[status] || status;
}

function formatDate(value: string | null) {
  if (!value) return 'Sin dato';
  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
    }).format(new Date(value));
  } catch {
    return 'Actualizado';
  }
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rsvps, setRsvps] = useState<RsvpSummary[]>([]);
  const [summary, setSummary] = useState<ManagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [tab, setTab] = useState<'guests' | 'rsvps'>('guests');
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Guest>>({});
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    setPreviewMode(window.location.hostname !== 'gestion.felipeycami.cl');
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [guestsResult, rsvpResult, summaryResponse] = await Promise.all([
        supabase.from('wedding_guests').select('*').order('first_name', { ascending: true }),
        supabase.from('rsvp_management_summary').select('*').order('created_at', { ascending: false }),
        fetch('/api/management-summary', { cache: 'no-store' }),
      ]);
      const errors = [guestsResult.error, rsvpResult.error].filter(Boolean);
      if (errors.length) throw new Error(errors.map((error) => error?.message).join(' · '));
      const summaryPayload = await summaryResponse.json().catch(() => null);
      setGuests((guestsResult.data || []) as Guest[]);
      setRsvps((rsvpResult.data || []) as RsvpSummary[]);
      if (summaryResponse.ok && summaryPayload?.ok) setSummary(summaryPayload.summary);
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible cargar invitados y RSVP.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const activeGuests = useMemo(() => guests.filter((guest) => guest.guest_status === 'active'), [guests]);

  const stats = useMemo(() => ({
    active: activeGuests.length,
    attending: activeGuests.filter((guest) => guest.attendance_status === 'attending').length,
    pending: activeGuests.filter((guest) => guest.attendance_status === 'pending').length,
    declined: activeGuests.filter((guest) => guest.attendance_status === 'not_attending').length,
    noTable: activeGuests.filter((guest) => guest.attendance_status === 'attending' && !guest.table_id).length,
    dietary: activeGuests.filter((guest) => guest.dietary_type && guest.dietary_type !== 'Ninguna').length,
    reviewResponses: rsvps.filter((rsvp) => rsvp.pending_member_count > 0 || ['unmatched','partially_matched','ambiguous','conflict'].includes(rsvp.reconciliation_status)).length,
    joint: rsvps.filter((rsvp) => rsvp.member_count > 1).length,
  }), [activeGuests, rsvps]);

  const filteredGuests = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return activeGuests.filter((guest) => {
      const haystack = `${fullName(guest)} ${guest.group_name} ${guest.family_side} ${guest.phone_e164 || ''}`.toLowerCase();
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
    return rsvps.filter((rsvp) => !term || `${rsvp.response_name} ${rsvp.phone_e164}`.toLowerCase().includes(term));
  }, [rsvps, searchTerm]);

  function openEdit(guest: Guest) {
    setCreatingGuest(false); setSelectedGuest(guest); setEditForm({ ...guest }); setNotice(null);
  }

  function openCreate() {
    setCreatingGuest(true); setSelectedGuest(null); setEditForm({ ...EMPTY_GUEST }); setNotice(null);
  }

  function closeEditor() {
    if (saving) return;
    setSelectedGuest(null); setCreatingGuest(false); setEditForm({});
  }

  function saveGuestLocally(firstName: string) {
    const isCreate = creatingGuest;
    const next: Guest = {
      id: isCreate ? `preview-${Date.now()}` : selectedGuest!.id,
      first_name: firstName,
      last_name: String(editForm.last_name || '').trim(),
      phone_e164: editForm.phone_e164 || null,
      group_name: String(editForm.group_name || 'General').trim(),
      family_side: String(editForm.family_side || 'Compartido'),
      guest_category: String(editForm.guest_category || 'Adulto'),
      invitation_status: String(editForm.invitation_status || 'not_sent'),
      attendance_status: String(editForm.attendance_status || 'pending'),
      dietary_type: String(editForm.dietary_type || 'Ninguna'),
      dietary_detail: editForm.dietary_detail || null,
      reconfirmation_status: String(editForm.reconfirmation_status || 'pending'),
      table_id: selectedGuest?.table_id || null,
      rsvp_id: selectedGuest?.rsvp_id || null,
      guest_status: String(editForm.guest_status || 'active'),
      notes: editForm.notes || null,
    };
    setGuests((current) => isCreate ? [...current, next] : current.map((guest) => guest.id === next.id ? next : guest));
    closeEditor();
    setNotice({ type: 'info', text: `${isCreate ? 'Invitado creado' : 'Ficha actualizada'} localmente en Preview. Producción no fue modificada.` });
  }

  async function saveGuest() {
    const firstName = String(editForm.first_name || '').trim();
    if (!firstName) { setNotice({ type: 'error', text: 'El nombre es obligatorio.' }); return; }
    if (previewMode) { saveGuestLocally(firstName); return; }

    setSaving(true); setNotice(null);
    try {
      const isCreate = creatingGuest;
      const response = await fetch('/api/guests', {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isCreate ? {} : { id: selectedGuest?.id }), first_name: firstName,
          last_name: String(editForm.last_name || '').trim(), phone_e164: editForm.phone_e164 || null,
          group_name: String(editForm.group_name || 'General').trim(), family_side: editForm.family_side || 'Compartido',
          guest_category: editForm.guest_category || 'Adulto', invitation_status: editForm.invitation_status || 'not_sent',
          attendance_status: editForm.attendance_status || 'pending', dietary_type: editForm.dietary_type || 'Ninguna',
          dietary_detail: editForm.dietary_detail || null, reconfirmation_status: editForm.reconfirmation_status || 'pending',
          guest_status: editForm.guest_status || 'active', notes: editForm.notes || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la ficha.');
      await loadData(); closeEditor();
      setNotice({ type: Array.isArray(payload.warnings) && payload.warnings.length ? 'info' : 'success', text: `${isCreate ? 'Invitado creado' : 'Ficha actualizada'} correctamente.` });
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible guardar la ficha.' });
    } finally { setSaving(false); }
  }

  const editorOpen = Boolean(selectedGuest || creatingGuest);
  const integratedAttending = summary?.rsvpAttending ?? 0;
  const reconciliationPending = summary?.reconciliationPending ?? 0;

  return (
    <DashboardLayout>
      <div className="guests-v2">
        <section className="guests-v2__hero">
          <div>
            <span className="guests-v2__eyebrow">Personas y RSVP</span>
            <h1>Invitados</h1>
            <p>Una ficha por persona, una trazabilidad clara por RSVP y un flujo separado para todo lo que todavía requiere conciliación.</p>
          </div>
          <div className="guests-v2__actions">
            {previewMode && <span className="guests-v2__preview-chip">Preview · cambios locales</span>}
            <button type="button" onClick={loadData} className="guests-v2__button"><RefreshCw size={14}/>Actualizar</button>
            <button type="button" onClick={openCreate} className="guests-v2__button guests-v2__button--primary"><Plus size={14}/>Nuevo invitado</button>
          </div>
        </section>

        {notice && <div className={`guests-v2__notice guests-v2__notice--${notice.type}`}>{notice.type === 'success' ? <CheckCircle2 size={16}/> : notice.type === 'error' ? <XCircle size={16}/> : <AlertTriangle size={16}/>}<span>{notice.text}</span></div>}

        <section className="guests-v2__source">
          <div><span>RSVP integrados · asisten</span><strong>{integratedAttending || '—'}</strong><small>No se presenta como total oficial mientras exista una lista nominal externa sin conciliar.</small></div>
          <div><span>Fichas activas</span><strong>{summary?.activeGuests ?? stats.active}</strong><small>Directorio canónico</small></div>
          <div className={reconciliationPending ? 'is-attention' : ''}><span>Pendientes de conciliación</span><strong>{reconciliationPending}</strong><small>{summary ? `${summary.rsvpMatched} asistentes ya vinculados` : '—'}</small></div>
          <div><span>Google Sheets</span><strong>{summary ? `${summary.sheetSynced}/${summary.rsvpResponses}` : '—'}</strong><small>{summary?.sheetPending ? `${summary.sheetPending} pendientes` : 'Sincronizado'}</small></div>
          <div><span>Último dato integrado</span><strong className="guests-v2__date">{formatDate(summary?.lastRsvpUpdateAt || null)}</strong><small>Hora Santiago</small></div>
        </section>

        <section className="guests-v2__metrics">
          <article><span>Asisten en ficha maestra</span><strong>{stats.attending}</strong><small>Listos para operación</small></article>
          <article><span>Pendientes en ficha</span><strong>{stats.pending}</strong><small>Aún sin respuesta conciliada</small></article>
          <article><span>No asisten</span><strong>{stats.declined}</strong><small>Ficha individual</small></article>
          <article className={stats.noTable ? 'is-attention' : ''}><span>Sin mesa</span><strong>{stats.noTable}</strong><small>Entre asistentes conciliados</small></article>
          <article><span>Restricciones</span><strong>{stats.dietary}</strong><small>Alimentarias registradas</small></article>
        </section>

        <section className="guests-v2__toolbar">
          <div className="guests-v2__tabs">
            <button type="button" className={tab === 'guests' ? 'is-active' : ''} onClick={() => setTab('guests')}><Users size={15}/>Directorio</button>
            <button type="button" className={tab === 'rsvps' ? 'is-active' : ''} onClick={() => setTab('rsvps')}><UserCheck size={15}/>RSVP y conciliación <span>{reconciliationPending}</span></button>
          </div>
          <label className="guests-v2__search"><Search size={14}/><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar nombre, grupo o teléfono…"/></label>
        </section>

        {loading ? <div className="guests-v2__loading"><Loader2 className="animate-spin" size={20}/><span>Cargando información real…</span></div> : tab === 'guests' ? (
          <section className="guests-v2__directory">
            <div className="guests-v2__filters">
              {([
                ['all',`Todos ${stats.active}`], ['attending',`Asisten ${stats.attending}`], ['pending',`Pendientes ${stats.pending}`],
                ['not_attending',`No asisten ${stats.declined}`], ['no_phone','Sin teléfono'], ['no_table',`Sin mesa ${stats.noTable}`], ['dietary',`Restricciones ${stats.dietary}`],
              ] as Array<[GuestFilter,string]>).map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={filter === value ? 'is-active' : ''}>{label}</button>)}
            </div>

            <div className="guests-v2__list-head"><span>Persona</span><span>Grupo</span><span>Estado</span><span>Operación</span></div>
            <div className="guests-v2__list">
              {filteredGuests.map((guest) => (
                <article key={guest.id} className="guests-v2__person-card">
                  <div className="guests-v2__person-main"><span className="guests-v2__avatar">{initials(guest)}</span><div><strong>{fullName(guest)}</strong><small>{guest.phone_e164 || 'Sin teléfono'}</small></div></div>
                  <div className="guests-v2__group"><strong>{guest.group_name || 'Sin grupo'}</strong><small>{guest.family_side} · {guest.guest_category}</small></div>
                  <div className="guests-v2__status-cell"><span className={`guests-v2__status guests-v2__status--${guest.attendance_status}`}>{statusLabel(guest.attendance_status)}</span>{guest.dietary_type && guest.dietary_type !== 'Ninguna' && <small><Utensils size={11}/>{guest.dietary_type}</small>}</div>
                  <div className="guests-v2__operation"><span>{guest.table_id ? 'Mesa asignada' : guest.attendance_status === 'attending' ? 'Sin mesa' : '—'}</span><button type="button" onClick={() => openEdit(guest)}><Edit3 size={13}/>Editar</button></div>
                </article>
              ))}
              {!filteredGuests.length && <div className="guests-v2__empty">No hay personas en esta vista.</div>}
            </div>
          </section>
        ) : (
          <section className="guests-v2__rsvp-grid">
            <div className="guests-v2__rsvp-intro">
              <div><span className="guests-v2__eyebrow">Evidencia original</span><h2>RSVP y conciliación</h2><p>Las respuestas se conservan tal como llegaron. Una respuesta conjunta puede representar varias personas y sólo se transforma en fichas cuando la conciliación es segura.</p></div>
              {reconciliationPending > 0 && <Link href="/dashboard/issues" className="guests-v2__button guests-v2__button--primary"><Link2 size={13}/>Resolver {reconciliationPending} personas</Link>}
            </div>
            <div className="guests-v2__rsvp-list">
              {filteredRsvps.map((rsvp) => {
                const needsReview = rsvp.pending_member_count > 0 || !['matched','split_matched'].includes(rsvp.reconciliation_status);
                return <article key={rsvp.rsvp_id} className={`guests-v2__rsvp-card ${needsReview ? 'is-attention' : ''}`}>
                  <div className="guests-v2__rsvp-top"><div><strong>{rsvp.response_name}</strong><small>{formatDate(rsvp.created_at)} · {rsvp.phone_e164}</small></div><span className={`guests-v2__status ${needsReview ? 'guests-v2__status--pending' : 'guests-v2__status--attending'}`}>{needsReview ? 'Revisar' : 'Conciliada'}</span></div>
                  <div className="guests-v2__members">{(rsvp.members || []).map((member) => <span key={member.id} className={member.resolution_status === 'matched' ? 'is-matched' : ''}>{member.display_name}<small>{statusLabel(member.resolution_status)}</small></span>)}</div>
                  <div className="guests-v2__rsvp-footer"><span>{rsvp.matched_member_count}/{rsvp.member_count} vinculadas</span><span>{statusLabel(rsvp.sheet_sync_status)}</span>{needsReview ? <Link href="/dashboard/issues">Resolver →</Link> : <CheckCircle2 size={16}/>}</div>
                </article>;
              })}
              {!filteredRsvps.length && <div className="guests-v2__empty">No hay RSVP que coincidan con la búsqueda.</div>}
            </div>
          </section>
        )}

        {editorOpen && <>
          <button type="button" aria-label="Cerrar edición" onClick={closeEditor} className="guests-v2__backdrop"/>
          <aside className="guests-v2__drawer">
            <header><div><span className="guests-v2__eyebrow">{creatingGuest ? 'Nueva persona' : 'Ficha individual'}</span><h2>{creatingGuest ? 'Crear invitado' : fullName(selectedGuest!)}</h2></div><button type="button" onClick={closeEditor} disabled={saving}><X size={19}/></button></header>
            <div className="guests-v2__form">
              <div className="guests-v2__form-grid"><label><span>Nombre *</span><input value={editForm.first_name || ''} onChange={(e) => setEditForm({...editForm,first_name:e.target.value})}/></label><label><span>Apellido</span><input value={editForm.last_name || ''} onChange={(e) => setEditForm({...editForm,last_name:e.target.value})}/></label></div>
              <label><span>Teléfono</span><input value={editForm.phone_e164 || ''} onChange={(e) => setEditForm({...editForm,phone_e164:e.target.value})} placeholder="+56 9 1234 5678"/></label>
              <div className="guests-v2__form-grid"><label><span>Grupo</span><input value={editForm.group_name || ''} onChange={(e) => setEditForm({...editForm,group_name:e.target.value})}/></label><label><span>Familia</span><select value={editForm.family_side || 'Compartido'} onChange={(e) => setEditForm({...editForm,family_side:e.target.value})}><option>Felipe</option><option>Camila</option><option>Compartido</option><option>Por clasificar</option></select></label></div>
              <div className="guests-v2__form-grid"><label><span>Categoría</span><select value={editForm.guest_category || 'Adulto'} onChange={(e) => setEditForm({...editForm,guest_category:e.target.value})}><option>Adulto</option><option>Niño</option><option>Proveedor-Staff</option><option>After 11</option></select></label><label><span>Asistencia</span><select value={editForm.attendance_status || 'pending'} onChange={(e) => setEditForm({...editForm,attendance_status:e.target.value})}><option value="pending">Pendiente</option><option value="attending">Asiste</option><option value="not_attending">No asiste</option></select></label></div>
              <div className="guests-v2__form-note"><Clock3 size={14}/><span>Asistencia y reconfirmación son campos independientes. Cambiar uno no altera automáticamente el otro.</span></div>
              <div className="guests-v2__form-grid"><label><span>Restricción</span><select value={editForm.dietary_type || 'Ninguna'} onChange={(e) => setEditForm({...editForm,dietary_type:e.target.value})}><option>Ninguna</option><option>Vegetariano</option><option>Vegano</option><option>Celíaco / libre de gluten</option><option>Alergias</option><option>Otra</option></select></label><label><span>Detalle</span><input value={editForm.dietary_detail || ''} onChange={(e) => setEditForm({...editForm,dietary_detail:e.target.value})}/></label></div>
              <label><span>Reconfirmación</span><select value={editForm.reconfirmation_status || 'pending'} onChange={(e) => setEditForm({...editForm,reconfirmation_status:e.target.value})}><option value="pending">Pendiente</option><option value="confirmed">Confirmado</option><option value="declined">Declinó</option></select></label>
              <label><span>Notas</span><textarea rows={4} value={editForm.notes || ''} onChange={(e) => setEditForm({...editForm,notes:e.target.value})}/></label>
            </div>
            <footer><button type="button" className="guests-v2__button" onClick={closeEditor}>Cancelar</button><button type="button" className="guests-v2__button guests-v2__button--primary" onClick={saveGuest} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}Guardar ficha</button></footer>
          </aside>
        </>}
      </div>
    </DashboardLayout>
  );
}
