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
  reconciliationPending: number;
  rsvpResponses: number;
  sheetSynced: number;
  sheetPending: number;
  activeGuests: number;
  rsvpMatched: number;
}

interface OfficialPerson {
  rowNumber: number;
  name: string;
  attendance: string;
  dietaryType: string;
  dietaryDetail: string;
  recordStatus: string;
  guestId: string | null;
  rsvpId: string | null;
  confirmedAt: string | null;
  syncStatus: string;
  phone: string;
}

interface TableGroup {
  groupId: string;
  groupName: string;
  linkType: string;
  confirmed: boolean;
  people: string[];
  sourceNotes: string[];
}

interface ConfirmedSource {
  ok: boolean;
  source: string;
  groupsSource: string;
  summary: {
    attending: number;
    declined: number;
    totalResponsesPeople: number;
    associated: number;
    withoutMasterRecord: number;
    dietary: number;
    latestConfirmationName: string | null;
    latestConfirmationAt: string | null;
  };
  people: OfficialPerson[];
  groups: TableGroup[];
}

type GuestFilter = 'all' | 'attending' | 'pending' | 'not_attending' | 'no_phone' | 'no_table' | 'dietary';
type Tab = 'official' | 'directory' | 'rsvps' | 'groups';
type Notice = { type: 'success' | 'error' | 'info'; text: string };

const EMPTY_GUEST: Partial<Guest> = {
  first_name: '', last_name: '', phone_e164: '', group_name: 'General', family_side: 'Compartido',
  guest_category: 'Adulto', invitation_status: 'not_sent', attendance_status: 'pending',
  dietary_type: 'Ninguna', dietary_detail: '', reconfirmation_status: 'pending', guest_status: 'active', notes: '',
};

function fullName(guest: Pick<Guest, 'first_name' | 'last_name'>) {
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || '?';
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    attending: 'Asiste', not_attending: 'No asiste', pending: 'Pendiente', matched: 'Conciliada',
    split_matched: 'Conjunta conciliada', partially_matched: 'Conciliación parcial', unmatched: 'Sin vincular',
    needs_review: 'Requiere revisión', ambiguous: 'Ambigua', conflict: 'Conflicto', synced: 'Sincronizado',
  };
  return labels[status] || status;
}

function formatSourceDate(value: string | null) {
  if (!value) return 'Sin dato';
  if (/^\d{4}-\d{2}-\d{2}[ T]/.test(value) && !value.endsWith('Z') && !/[+-]\d\d:\d\d$/.test(value)) {
    return value.replace('T', ' ');
  }
  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rsvps, setRsvps] = useState<RsvpSummary[]>([]);
  const [summary, setSummary] = useState<ManagementSummary | null>(null);
  const [official, setOfficial] = useState<ConfirmedSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [tab, setTab] = useState<Tab>('official');
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Guest>>({});
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => setPreviewMode(window.location.hostname !== 'gestion.felipeycami.cl'), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const supabase = createClient();
      const [guestsResult, rsvpResult, summaryResponse, officialResponse] = await Promise.all([
        supabase.from('wedding_guests').select('*').order('first_name', { ascending: true }),
        supabase.from('rsvp_management_summary').select('*').order('created_at', { ascending: false }),
        fetch('/api/management-summary', { cache: 'no-store' }),
        fetch('/api/confirmed-source', { cache: 'no-store' }),
      ]);

      const errors = [guestsResult.error, rsvpResult.error].filter(Boolean);
      if (errors.length) throw new Error(errors.map((error) => error?.message).join(' · '));

      const [summaryPayload, officialPayload] = await Promise.all([
        summaryResponse.json().catch(() => null),
        officialResponse.json().catch(() => null),
      ]);

      if (!officialResponse.ok || !officialPayload?.ok) throw new Error(officialPayload?.error || 'No fue posible cargar CONFIRMADOS_ACTUALES.');

      setGuests((guestsResult.data || []) as Guest[]);
      setRsvps((rsvpResult.data || []) as RsvpSummary[]);
      if (summaryResponse.ok && summaryPayload?.ok) setSummary(summaryPayload.summary);
      setOfficial(officialPayload as ConfirmedSource);
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
  }), [activeGuests]);

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

  const filteredOfficial = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return (official?.people || []).filter((person) => !term || `${person.name} ${person.phone} ${person.recordStatus}`.toLowerCase().includes(term));
  }, [official, searchTerm]);

  const filteredRsvps = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return rsvps.filter((rsvp) => !term || `${rsvp.response_name} ${rsvp.phone_e164}`.toLowerCase().includes(term));
  }, [rsvps, searchTerm]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return (official?.groups || []).filter((group) => !term || `${group.groupName} ${group.people.join(' ')}`.toLowerCase().includes(term));
  }, [official, searchTerm]);

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
          notes: editForm.notes || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible guardar la ficha.');
      await loadData(); closeEditor();
      setNotice({ type: 'success', text: `${isCreate ? 'Invitado creado' : 'Ficha actualizada'} correctamente.` });
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No fue posible guardar la ficha.' });
    } finally {
      setSaving(false);
    }
  }

  const editorOpen = Boolean(selectedGuest || creatingGuest);
  const officialAttending = official?.summary.attending ?? 0;
  const officialDeclined = official?.summary.declined ?? 0;
  const withoutMaster = official?.summary.withoutMasterRecord ?? 0;
  const knownGroups = (official?.groups || []).filter((group) => group.confirmed).length;
  const probableGroups = (official?.groups || []).filter((group) => !group.confirmed).length;

  return (
    <DashboardLayout>
      <div className="guests-v2">
        <section className="guests-v2__hero">
          <div>
            <span className="guests-v2__eyebrow">Personas y RSVP</span>
            <h1>Invitados</h1>
            <p>La vista oficial nace de CONFIRMADOS_ACTUALES; Supabase conserva las fichas operativas, RSVP, mesas y conciliación.</p>
          </div>
          <div className="guests-v2__actions">
            {previewMode && <span className="guests-v2__preview-chip">Preview · cambios locales</span>}
            <button type="button" onClick={loadData} className="guests-v2__button"><RefreshCw size={14}/>Actualizar</button>
            <button type="button" onClick={openCreate} className="guests-v2__button guests-v2__button--primary"><Plus size={14}/>Nuevo invitado</button>
          </div>
        </section>

        {notice && <div className={`guests-v2__notice guests-v2__notice--${notice.type}`}>{notice.type === 'success' ? <CheckCircle2 size={16}/> : notice.type === 'error' ? <XCircle size={16}/> : <AlertTriangle size={16}/>}<span>{notice.text}</span></div>}

        <section className="guests-v2__source">
          <div><span>Confirmados oficiales</span><strong>{officialAttending || '—'}</strong><small>Fuente: CONFIRMADOS_ACTUALES</small></div>
          <div><span>No asisten</span><strong>{officialDeclined}</strong><small>Personas informadas como baja</small></div>
          <div className={withoutMaster ? 'is-attention' : ''}><span>Sin ficha maestra</span><strong>{withoutMaster}</strong><small>Confirmados oficiales por conciliar</small></div>
          <div><span>Grupos de mesa</span><strong>{knownGroups} + {probableGroups}</strong><small>{knownGroups} conocidos · {probableGroups} por validar</small></div>
          <div><span>Última confirmación</span><strong className="guests-v2__date">{official?.summary.latestConfirmationName || '—'}</strong><small>{formatSourceDate(official?.summary.latestConfirmationAt || null)}</small></div>
        </section>

        <section className="guests-v2__metrics">
          <article><span>Con ficha asociada</span><strong>{official?.summary.associated || 0}</strong><small>Confirmados oficiales listos para operar</small></article>
          <article><span>Restricciones</span><strong>{official?.summary.dietary || 0}</strong><small>Dentro de confirmados oficiales</small></article>
          <article><span>RSVP integrados</span><strong>{summary?.rsvpAttending || 0}</strong><small>Pipeline técnico actual</small></article>
          <article className={(summary?.reconciliationPending || 0) ? 'is-attention' : ''}><span>RSVP por conciliar</span><strong>{summary?.reconciliationPending || 0}</strong><small>Incidencias del pipeline</small></article>
          <article><span>Sheets</span><strong>{summary ? `${summary.sheetSynced}/${summary.rsvpResponses}` : '—'}</strong><small>{summary?.sheetPending ? `${summary.sheetPending} pendientes` : 'Sincronizado'}</small></article>
        </section>

        <section className="guests-v2__toolbar">
          <div className="guests-v2__tabs">
            <button type="button" className={tab === 'official' ? 'is-active' : ''} onClick={() => setTab('official')}><UserCheck size={15}/>Confirmados <span>{officialAttending}</span></button>
            <button type="button" className={tab === 'directory' ? 'is-active' : ''} onClick={() => setTab('directory')}><Users size={15}/>Directorio</button>
            <button type="button" className={tab === 'rsvps' ? 'is-active' : ''} onClick={() => setTab('rsvps')}><Link2 size={15}/>RSVP <span>{summary?.reconciliationPending || 0}</span></button>
            <button type="button" className={tab === 'groups' ? 'is-active' : ''} onClick={() => setTab('groups')}><Users size={15}/>Grupos <span>{(official?.groups || []).length}</span></button>
          </div>
          <label className="guests-v2__search"><Search size={14}/><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar nombre, grupo o teléfono…"/></label>
        </section>

        {loading ? <div className="guests-v2__loading"><Loader2 className="animate-spin" size={20}/><span>Cargando información real…</span></div> : tab === 'official' ? (
          <section className="guests-v2__directory">
            <div className="guests-v2__list-head"><span>Persona</span><span>Estado de ficha</span><span>Asistencia</span><span>Confirmación</span></div>
            <div className="guests-v2__list">
              {filteredOfficial.map((person) => <article key={`${person.rowNumber}-${person.name}`} className="guests-v2__person-card">
                <div className="guests-v2__person-main"><span className="guests-v2__avatar">{initialsFromName(person.name)}</span><div><strong>{person.name}</strong><small>{person.phone || 'Sin teléfono'}</small></div></div>
                <div className="guests-v2__group"><strong>{person.recordStatus || 'Sin estado'}</strong><small>{person.guestId ? 'Ficha Supabase vinculada' : 'Requiere conciliación'}</small></div>
                <div className="guests-v2__status-cell"><span className={`guests-v2__status guests-v2__status--${person.attendance === 'Asiste' ? 'attending' : 'not_attending'}`}>{person.attendance}</span>{person.dietaryType && person.dietaryType !== 'Ninguna' && <small><Utensils size={11}/>{person.dietaryType}</small>}</div>
                <div className="guests-v2__operation"><span>{formatSourceDate(person.confirmedAt)}</span>{person.guestId ? <span>✓ asociada</span> : <Link href="/dashboard/issues">Conciliar →</Link>}</div>
              </article>)}
              {!filteredOfficial.length && <div className="guests-v2__empty">No hay personas que coincidan con la búsqueda.</div>}
            </div>
          </section>
        ) : tab === 'directory' ? (
          <section className="guests-v2__directory">
            <div className="guests-v2__filters">{([
              ['all', `Todos ${stats.active}`], ['attending', `Asisten ${stats.attending}`], ['pending', `Pendientes ${stats.pending}`], ['not_attending', `No asisten ${stats.declined}`], ['no_phone', 'Sin teléfono'], ['no_table', `Sin mesa ${stats.noTable}`], ['dietary', `Restricciones ${stats.dietary}`],
            ] as Array<[GuestFilter,string]>).map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={filter === value ? 'is-active' : ''}>{label}</button>)}</div>
            <div className="guests-v2__list-head"><span>Persona</span><span>Grupo</span><span>Estado</span><span>Operación</span></div>
            <div className="guests-v2__list">{filteredGuests.map((guest) => <article key={guest.id} className="guests-v2__person-card">
              <div className="guests-v2__person-main"><span className="guests-v2__avatar">{initialsFromName(fullName(guest))}</span><div><strong>{fullName(guest)}</strong><small>{guest.phone_e164 || 'Sin teléfono'}</small></div></div>
              <div className="guests-v2__group"><strong>{guest.group_name || 'Sin grupo'}</strong><small>{guest.family_side} · {guest.guest_category}</small></div>
              <div className="guests-v2__status-cell"><span className={`guests-v2__status guests-v2__status--${guest.attendance_status}`}>{statusLabel(guest.attendance_status)}</span>{guest.dietary_type && guest.dietary_type !== 'Ninguna' && <small><Utensils size={11}/>{guest.dietary_type}</small>}</div>
              <div className="guests-v2__operation"><span>{guest.table_id ? 'Mesa asignada' : guest.attendance_status === 'attending' ? 'Sin mesa' : '—'}</span><button type="button" onClick={() => openEdit(guest)}><Edit3 size={13}/>Editar</button></div>
            </article>)}{!filteredGuests.length && <div className="guests-v2__empty">No hay personas en esta vista.</div>}</div>
          </section>
        ) : tab === 'rsvps' ? (
          <section className="guests-v2__rsvp-grid">
            <div className="guests-v2__rsvp-intro"><div><span className="guests-v2__eyebrow">Evidencia original</span><h2>RSVP y conciliación</h2><p>Las respuestas se conservan tal como llegaron. Una respuesta conjunta puede representar varias personas y sólo se transforma en fichas cuando la conciliación es segura.</p></div>{(summary?.reconciliationPending || 0) > 0 && <Link href="/dashboard/issues" className="guests-v2__button guests-v2__button--primary"><Link2 size={13}/>Resolver {summary?.reconciliationPending} personas</Link>}</div>
            <div className="guests-v2__rsvp-list">{filteredRsvps.map((rsvp) => { const needsReview = rsvp.pending_member_count > 0 || !['matched','split_matched'].includes(rsvp.reconciliation_status); return <article key={rsvp.rsvp_id} className={`guests-v2__rsvp-card ${needsReview ? 'is-attention' : ''}`}><div className="guests-v2__rsvp-top"><div><strong>{rsvp.response_name}</strong><small>{formatSourceDate(rsvp.created_at)} · {rsvp.phone_e164}</small></div><span className={`guests-v2__status ${needsReview ? 'guests-v2__status--pending' : 'guests-v2__status--attending'}`}>{needsReview ? 'Revisar' : 'Conciliada'}</span></div><div className="guests-v2__members">{(rsvp.members || []).map((member) => <span key={member.id} className={member.resolution_status === 'matched' ? 'is-matched' : ''}>{member.display_name}<small>{statusLabel(member.resolution_status)}</small></span>)}</div><div className="guests-v2__rsvp-footer"><span>{rsvp.matched_member_count}/{rsvp.member_count} vinculadas</span><span>{statusLabel(rsvp.sheet_sync_status)}</span>{needsReview ? <Link href="/dashboard/issues">Resolver →</Link> : <CheckCircle2 size={16}/>}</div></article>; })}{!filteredRsvps.length && <div className="guests-v2__empty">No hay RSVP que coincidan con la búsqueda.</div>}</div>
          </section>
        ) : (
          <section className="guests-v2__rsvp-grid">
            <div className="guests-v2__rsvp-intro"><div><span className="guests-v2__eyebrow">GRUPOS_MESA</span><h2>Relaciones para planificar mesas</h2><p>Los grupos confirmados deben mantenerse juntos. Los grupos “Por validar” sirven como sugerencia, pero no se convierten en una regla dura hasta confirmar la relación.</p></div><Link href="/dashboard/tables" className="guests-v2__button guests-v2__button--primary">Abrir mesas</Link></div>
            <div className="guests-v2__rsvp-list">{filteredGroups.map((group) => <article key={group.groupId} className={`guests-v2__rsvp-card ${group.confirmed ? '' : 'is-attention'}`}><div className="guests-v2__rsvp-top"><div><strong>{group.groupName}</strong><small>{group.groupId} · {group.people.length} personas</small></div><span className={`guests-v2__status ${group.confirmed ? 'guests-v2__status--attending' : 'guests-v2__status--pending'}`}>{group.confirmed ? 'Relación conocida' : 'Por validar'}</span></div><div className="guests-v2__members">{group.people.map((person) => <span key={person} className={group.confirmed ? 'is-matched' : ''}>{person}</span>)}</div><div className="guests-v2__rsvp-footer"><span>{group.linkType}</span><span>{group.sourceNotes[0] || 'Sin observación'}</span></div></article>)}{!filteredGroups.length && <div className="guests-v2__empty">No hay grupos que coincidan con la búsqueda.</div>}</div>
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
