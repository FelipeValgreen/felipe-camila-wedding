'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  Plus,
  RefreshCw,
  UserPlus,
  Users,
  XCircle
} from 'lucide-react';

type MemberStatus = 'unmatched' | 'candidate' | 'matched' | 'needs_review' | 'ignored';

interface RsvpMember {
  id: string;
  display_name: string;
  guest_id: string | null;
  resolution_status: MemberStatus;
  attendance_status: string;
  dietary_type: string | null;
  dietary_detail: string | null;
  notes: string | null;
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

interface ManagementIssue {
  id: string;
  issue_type: string;
  entity_type: string;
  entity_id: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'resolved' | 'ignored';
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface GuestOption {
  id: string;
  first_name: string;
  last_name: string;
  group_name: string;
  attendance_status: string;
  rsvp_id: string | null;
  guest_status: string;
}

const ISSUE_LABELS: Record<string, string> = {
  unmatched_rsvp: 'Sin vincular',
  joint_rsvp: 'Respuesta conjunta',
  malformed_match: 'Conciliación inválida',
  sheet_sync_failed: 'Fallo de Sheets'
};

function fullGuestName(guest: GuestOption): string {
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<ManagementIssue[]>([]);
  const [summaries, setSummaries] = useState<RsvpSummary[]>([]);
  const [guests, setGuests] = useState<GuestOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'rsvp' | 'critical' | 'sync' | 'all'>('rsvp');
  const [selectedGuestByMember, setSelectedGuestByMember] = useState<Record<string, string>>({});
  const [newMemberByRsvp, setNewMemberByRsvp] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [issuesResult, summaryResult, guestsResult] = await Promise.all([
        supabase
          .from('management_issues')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false }),
        supabase
          .from('rsvp_management_summary')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('wedding_guests')
          .select('id, first_name, last_name, group_name, attendance_status, rsvp_id, guest_status')
          .eq('guest_status', 'active')
          .order('first_name', { ascending: true })
      ]);

      const errors = [issuesResult.error, summaryResult.error, guestsResult.error].filter(Boolean);
      if (errors.length > 0) {
        throw new Error(errors.map(error => error?.message).join(' · '));
      }

      setIssues((issuesResult.data || []) as ManagementIssue[]);
      setSummaries((summaryResult.data || []) as RsvpSummary[]);
      setGuests((guestsResult.data || []) as GuestOption[]);
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible cargar las incidencias.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summaryByRsvp = useMemo(
    () => new Map(summaries.map(summary => [summary.rsvp_id, summary])),
    [summaries]
  );

  const visibleIssues = useMemo(() => {
    return issues.filter(issue => {
      if (filter === 'critical') return issue.severity === 'critical';
      if (filter === 'sync') return issue.issue_type === 'sheet_sync_failed';
      if (filter === 'rsvp') return issue.issue_type !== 'sheet_sync_failed';
      return true;
    });
  }, [issues, filter]);

  const counts = useMemo(() => ({
    open: issues.length,
    critical: issues.filter(issue => issue.severity === 'critical').length,
    joint: issues.filter(issue => issue.issue_type === 'joint_rsvp').length,
    unmatched: issues.filter(issue => issue.issue_type === 'unmatched_rsvp').length,
    sync: issues.filter(issue => issue.issue_type === 'sheet_sync_failed').length
  }), [issues]);

  async function refreshIssues() {
    setBusyKey('refresh');
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('refresh_management_issues');
      if (error) throw error;
      await loadData();
      setMessage({ type: 'success', text: 'Incidencias actualizadas con el estado real de Supabase.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible actualizar las incidencias.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function resolveMember(member: RsvpMember) {
    const guestId = selectedGuestByMember[member.id];
    if (!guestId) {
      setMessage({ type: 'error', text: `Selecciona la ficha correspondiente a ${member.display_name}.` });
      return;
    }

    setBusyKey(member.id);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('resolve_rsvp_member', {
        p_member_id: member.id,
        p_guest_id: guestId,
        p_note: 'Vinculado manualmente desde la Bandeja de Incidencias.'
      });
      if (error) throw error;
      await refreshIssues();
      setMessage({ type: 'success', text: `${member.display_name} quedó vinculado a su ficha individual.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible vincular a la persona.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function createGuestAndResolve(member: RsvpMember) {
    const normalized = member.display_name.trim().replace(/\s+/g, ' ');
    const parts = normalized.split(' ');
    const firstName = parts.shift() || normalized;
    const lastName = parts.join(' ');

    setBusyKey(`create-${member.id}`);
    setMessage(null);
    try {
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          group_name: 'Por clasificar',
          family_side: 'Por clasificar',
          guest_category: 'Adulto',
          attendance_status: member.attendance_status,
          dietary_type: member.dietary_type || 'Ninguna',
          dietary_detail: member.dietary_detail,
          notes: 'Ficha creada desde una respuesta RSVP conjunta. Revisar grupo y datos de contacto.'
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok || !payload.guest?.id) {
        throw new Error(payload.error || 'No fue posible crear la ficha.');
      }

      const supabase = createClient();
      const { error } = await supabase.rpc('resolve_rsvp_member', {
        p_member_id: member.id,
        p_guest_id: payload.guest.id,
        p_note: 'Ficha individual creada y vinculada desde la Bandeja de Incidencias.'
      });
      if (error) throw error;

      await refreshIssues();
      setMessage({
        type: 'success',
        text: `Se creó la ficha de ${member.display_name}. Quedó en “Por clasificar” para completar su grupo.`
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible crear y vincular la ficha.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function addMember(summary: RsvpSummary) {
    const displayName = (newMemberByRsvp[summary.rsvp_id] || '').trim();
    if (!displayName) {
      setMessage({ type: 'error', text: 'Escribe el nombre de la persona que falta en la respuesta.' });
      return;
    }

    setBusyKey(`add-${summary.rsvp_id}`);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('add_rsvp_member', {
        p_rsvp_id: summary.rsvp_id,
        p_display_name: displayName,
        p_guest_id: null,
        p_attendance_status: summary.attendance_status,
        p_dietary_type: summary.dietary_type,
        p_dietary_detail: summary.dietary_detail,
        p_note: 'Integrante agregado manualmente desde la Bandeja de Incidencias.'
      });
      if (error) throw error;
      setNewMemberByRsvp(current => ({ ...current, [summary.rsvp_id]: '' }));
      await refreshIssues();
      setMessage({ type: 'success', text: `${displayName} fue agregado como persona individual de la respuesta.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible agregar a la persona.' });
    } finally {
      setBusyKey(null);
    }
  }

  async function closeIssue(issue: ManagementIssue) {
    setBusyKey(`issue-${issue.id}`);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('management_issues')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_note: 'Incidencia revisada manualmente desde el dashboard.'
        })
        .eq('id', issue.id);
      if (error) throw error;
      await loadData();
      setMessage({ type: 'success', text: 'Incidencia marcada como revisada.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No fue posible cerrar la incidencia.' });
    } finally {
      setBusyKey(null);
    }
  }

  function suggestedGuests(member: RsvpMember): GuestOption[] {
    const memberName = normalizeName(member.display_name);
    const available = guests.filter(guest => !guest.rsvp_id || guest.rsvp_id === summaryByRsvp.get(member.id)?.rsvp_id);
    return [...available].sort((a, b) => {
      const aName = normalizeName(fullGuestName(a));
      const bName = normalizeName(fullGuestName(b));
      const aScore = aName === memberName ? 0 : aName.includes(memberName.split(' ')[0]) ? 1 : 2;
      const bScore = bName === memberName ? 0 : bName.includes(memberName.split(' ')[0]) ? 1 : 2;
      return aScore - bScore || aName.localeCompare(bName, 'es');
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-[var(--border-color)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent-gold)]">
              Control de calidad de datos
            </span>
            <h1 className="mt-1 font-serif text-3xl text-[var(--text-primary)]">Bandeja de Incidencias</h1>
            <p className="mt-1 max-w-3xl text-xs text-[var(--text-secondary)]">
              Revisa respuestas conjuntas, personas sin ficha, conciliaciones incompletas y fallos de sincronización antes de exportar información a proveedores.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshIssues}
            disabled={busyKey === 'refresh'}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} className={busyKey === 'refresh' ? 'animate-spin' : ''} />
            Actualizar revisión
          </button>
        </div>

        {message && (
          <div className={`flex items-start gap-2 border p-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-800'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['Abiertas', counts.open],
            ['Críticas', counts.critical],
            ['Conjuntas', counts.joint],
            ['Sin vincular', counts.unmatched],
            ['Sheets', counts.sync]
          ].map(([label, value]) => (
            <div key={String(label)} className="border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
              <strong className="text-xl text-[var(--text-primary)]">{value}</strong>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ['rsvp', 'RSVP operativas'],
            ['critical', 'Solo críticas'],
            ['sync', 'Sincronización'],
            ['all', 'Todas']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value as typeof filter)}
              className={`border px-3 py-1.5 ${filter === value ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-secondary)]">
            Cargando incidencias…
          </div>
        ) : visibleIssues.length === 0 ? (
          <div className="border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-2 text-emerald-700" size={28} />
            <strong className="block text-emerald-800">No hay incidencias en esta vista.</strong>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleIssues.map(issue => {
              const summary = summaryByRsvp.get(issue.entity_id);
              const members = summary?.members || [];
              const isDataIssue = issue.issue_type !== 'sheet_sync_failed';

              return (
                <article key={issue.id} className="border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <AlertTriangle
                        size={20}
                        className={issue.severity === 'critical' ? 'text-rose-700' : 'text-amber-700'}
                      />
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            issue.severity === 'critical'
                              ? 'bg-rose-500/15 text-rose-800'
                              : 'bg-amber-500/15 text-amber-800'
                          }`}>
                            {issue.severity}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                            {ISSUE_LABELS[issue.issue_type] || issue.issue_type}
                          </span>
                        </div>
                        <h2 className="font-serif text-xl text-[var(--text-primary)]">{issue.title}</h2>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{issue.description}</p>
                        {summary && (
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            Respuesta: {summary.response_name} · {summary.member_count} persona(s) · Estado {summary.reconciliation_status}
                          </p>
                        )}
                      </div>
                    </div>
                    {isDataIssue && summary?.pending_member_count === 0 && (
                      <button
                        type="button"
                        onClick={() => closeIssue(issue)}
                        disabled={busyKey === `issue-${issue.id}`}
                        className="btn-secondary text-xs"
                      >
                        Marcar revisada
                      </button>
                    )}
                  </div>

                  {summary && isDataIssue && (
                    <div className="mt-5 space-y-3 border-t border-[var(--border-color)] pt-4">
                      {members.map(member => {
                        const linkedGuest = member.guest_id
                          ? guests.find(guest => guest.id === member.guest_id)
                          : null;
                        const candidates = suggestedGuests(member);

                        return (
                          <div key={member.id} className="border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Users size={14} />
                                  <strong>{member.display_name}</strong>
                                  <span className={`px-2 py-0.5 text-[10px] uppercase ${
                                    member.resolution_status === 'matched'
                                      ? 'bg-emerald-500/15 text-emerald-800'
                                      : 'bg-amber-500/15 text-amber-800'
                                  }`}>
                                    {member.resolution_status}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  {linkedGuest
                                    ? `Ficha: ${fullGuestName(linkedGuest)} · ${linkedGuest.group_name}`
                                    : member.notes || 'Pendiente de identificar en la lista maestra.'}
                                </p>
                              </div>

                              {member.resolution_status !== 'matched' && (
                                <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                                  <select
                                    value={selectedGuestByMember[member.id] || ''}
                                    onChange={event => setSelectedGuestByMember(current => ({
                                      ...current,
                                      [member.id]: event.target.value
                                    }))}
                                    className="min-w-64 border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs"
                                  >
                                    <option value="">Seleccionar ficha existente…</option>
                                    {candidates.map(guest => (
                                      <option key={guest.id} value={guest.id}>
                                        {fullGuestName(guest)} — {guest.group_name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => resolveMember(member)}
                                    disabled={busyKey === member.id}
                                    className="btn-primary flex items-center justify-center gap-1 text-xs"
                                  >
                                    <Link2 size={13} /> Vincular
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => createGuestAndResolve(member)}
                                    disabled={busyKey === `create-${member.id}`}
                                    className="btn-secondary flex items-center justify-center gap-1 text-xs"
                                  >
                                    <UserPlus size={13} /> Crear ficha
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={newMemberByRsvp[summary.rsvp_id] || ''}
                          onChange={event => setNewMemberByRsvp(current => ({
                            ...current,
                            [summary.rsvp_id]: event.target.value
                          }))}
                          placeholder="Nombre de otra persona incluida en esta respuesta"
                          className="flex-1 border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => addMember(summary)}
                          disabled={busyKey === `add-${summary.rsvp_id}`}
                          className="btn-secondary flex items-center justify-center gap-1 text-xs"
                        >
                          <Plus size={13} /> Agregar persona
                        </button>
                      </div>
                    </div>
                  )}

                  {issue.issue_type === 'sheet_sync_failed' && (
                    <div className="mt-4 border-t border-[var(--border-color)] pt-3 text-xs text-[var(--text-secondary)]">
                      Esta alerta se cerrará cuando el registro sea exportado correctamente. No se reintentará de forma masiva hasta validar el espejo de Google Sheets.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-[var(--border-color)] pt-4 text-xs">
          <Link href="/dashboard/guests" className="btn-secondary">Abrir invitados y RSVP</Link>
          <Link href="/dashboard/tables" className="btn-secondary">Continuar a mesas</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
