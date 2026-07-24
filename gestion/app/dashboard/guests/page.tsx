'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import GuestEditDrawer, { GuestData } from '@/components/GuestEditDrawer';
import Toast from '@/components/Toast';
import { Search, Plus, PhoneOff, Link as LinkIcon, Edit, X } from 'lucide-react';

interface RSVPResponse {
  id: string;
  first_name: string;
  last_name: string;
  phone_e164: string;
  attendance_status: string;
  dietary_type: string | null;
  dietary_detail: string | null;
  reconciliation_status: string;
  guest_id: string | null;
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [unmatchedRSVPs, setUnmatchedRSVPs] = useState<RSVPResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState<string>('all');

  // Active drawer & modals
  const [selectedGuest, setSelectedGuest] = useState<GuestData | null>(null);
  const [reconcileRsvp, setReconcileRsvp] = useState<RSVPResponse | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Add guest form
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_e164: '',
    group_name: 'General',
    family_side: 'Compartido',
    guest_category: 'Adulto',
    notes: ''
  });

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: gData } = await supabase.from('wedding_guests').select('*').order('first_name', { ascending: true });
      const { data: rData } = await supabase.from('rsvp_responses').select('*').eq('reconciliation_status', 'unmatched');

      if (gData) setGuests(gData as GuestData[]);
      if (rData) setUnmatchedRSVPs(rData as RSVPResponse[]);
    } catch (err) {
      console.error('Error loading guests:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDrawer = (g: GuestData) => {
    setSelectedGuest(g);
  };

  const handleCloseDrawer = () => {
    setSelectedGuest(null);
  };

  const handleGuestSaveSuccess = (updatedGuest: GuestData, warnings?: string[]) => {
    // Optimistic update of local guest list
    setGuests(prev => prev.map(g => (g.id === updatedGuest.id ? updatedGuest : g)));
    setSelectedGuest(null);
    if (warnings && warnings.length > 0) {
      setToast({ message: `Ficha de ${updatedGuest.first_name} guardada, pero la sincronización outbox quedó pendiente.`, type: 'info' });
    } else {
      setToast({ message: `Ficha de ${updatedGuest.first_name} ${updatedGuest.last_name} actualizada correctamente.`, type: 'success' });
    }
  };

  async function handleManualReconcile(guestId: string, rsvpId: string) {
    try {
      const res = await fetch('/api/rsvp/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guestId, rsvp_id: rsvpId })
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setReconcileRsvp(null);
        setToast({ message: 'RSVP conciliado correctamente con la lista de invitados.', type: 'success' });
        loadData();
      } else {
        setToast({ message: data?.error || 'No se pudo conciliar el RSVP.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error al conciliar RSVP.', type: 'error' });
    }
  }

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.first_name) return;
    try {
      const newGuestPayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_e164: formData.phone_e164 || null,
        group_name: formData.group_name,
        family_side: formData.family_side,
        guest_category: formData.guest_category,
        notes: formData.notes || null,
        guest_status: 'active'
      };

      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuestPayload)
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setShowAddModal(false);
        setFormData({ first_name: '', last_name: '', phone_e164: '', group_name: 'General', family_side: 'Compartido', guest_category: 'Adulto', notes: '' });
        setToast({ message: `Invitado ${data.guest.first_name} agregado correctamente.`, type: 'success' });
        loadData();
      } else {
        setToast({ message: data?.error || 'No se pudo crear el invitado.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error creando nuevo invitado.', type: 'error' });
    }
  }

  // Filtered views logic
  const missingPhoneCount = guests.filter(g => !g.phone_e164 && g.guest_status === 'active').length;

  const filteredGuests = guests.filter(g => {
    const matchesSearch = `${g.first_name} ${g.last_name} ${g.phone_e164 || ''} ${g.group_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (viewFilter) {
      case 'no_phone': return !g.phone_e164 && g.guest_status === 'active';
      case 'no_response': return g.attendance_status === 'pending' && g.guest_status === 'active';
      case 'attending': return g.attendance_status === 'attending' && g.guest_status === 'active';
      case 'not_attending': return g.attendance_status === 'not_attending' && g.guest_status === 'active';
      case 'pending': return g.attendance_status === 'pending' && g.guest_status === 'active';
      case 'dietary': return Boolean(g.dietary_type) && g.dietary_type !== 'Ninguna' && g.guest_status === 'active';
      case 'replaced': return g.guest_status === 'replaced';
      case 'por_clasificar': return g.family_side === 'Por clasificar' && g.guest_status === 'active';
      default: return g.guest_status === 'active';
    }
  });

  const mapAttendanceLabel = (status: string) => {
    switch (status) {
      case 'attending': return { label: 'Confirmado', style: 'badge-confirmed' };
      case 'not_attending': return { label: 'No asistirá', style: 'badge-declined' };
      default: return { label: 'Pendiente', style: 'badge-pending' };
    }
  };

  const mapReconfirmationLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'changed': return 'Cambió respuesta';
      default: return 'Pendiente';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Toast feedback */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)] font-semibold block">
              Directorio Interactivo de Invitados
            </span>
            <h1 className="font-serif text-3xl text-[var(--text-primary)] mt-1">
              Invitados & RSVP
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[var(--status-pending-bg)] border border-[var(--border-color)] px-3 py-1.5 rounded flex items-center gap-2 text-xs">
              <PhoneOff size={14} className="text-[#8E703E]" />
              <span>Sin teléfono: <strong>{missingPhoneCount}</strong></span>
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> Nuevo Invitado
            </button>
          </div>
        </div>

        {/* Unmatched RSVP Alert Banner */}
        {unmatchedRSVPs.length > 0 && (
          <div className="bg-[#8E703E]/10 border border-[#8E703E] p-4 rounded-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LinkIcon size={16} className="text-[#8E703E]" />
              <div>
                <span className="block text-xs font-bold text-[#8E703E] uppercase tracking-wider">RSVP Pendiente por Conciliar</span>
                <span className="block text-xs text-[var(--text-primary)]">
                  Hay {unmatchedRSVPs.length} confirmación web sin vincular a ficha de invitado.
                </span>
              </div>
            </div>
            <button onClick={() => setReconcileRsvp(unmatchedRSVPs[0])} className="btn-secondary text-xs py-1.5">
              Conciliar Manualmente
            </button>
          </div>
        )}

        {/* Filters & Views Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--bg-secondary)] p-4 border border-[var(--border-color)]">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-3 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar invitado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] pl-9 pr-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
            <button
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1.5 border rounded transition-colors ${viewFilter === 'all' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              Todos Activos ({guests.filter(g => g.guest_status === 'active').length})
            </button>
            <button
              onClick={() => setViewFilter('no_phone')}
              className={`px-3 py-1.5 border rounded transition-colors ${viewFilter === 'no_phone' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              Sin Teléfono ({missingPhoneCount})
            </button>
            <button
              onClick={() => setViewFilter('attending')}
              className={`px-3 py-1.5 border rounded transition-colors ${viewFilter === 'attending' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              Confirmados
            </button>
            <button
              onClick={() => setViewFilter('not_attending')}
              className={`px-3 py-1.5 border rounded transition-colors ${viewFilter === 'not_attending' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              No Asisten
            </button>
            <button
              onClick={() => setViewFilter('dietary')}
              className={`px-3 py-1.5 border rounded transition-colors ${viewFilter === 'dietary' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              Con Restricciones
            </button>
            <button
              onClick={() => setViewFilter('por_clasificar')}
              className={`px-3 py-1.5 border rounded transition-colors ${viewFilter === 'por_clasificar' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              Por Clasificar ({guests.filter(g => g.family_side === 'Por clasificar').length})
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Grupo</th>
                <th>Familia</th>
                <th>Categoría</th>
                <th>Teléfono</th>
                <th>Asistencia</th>
                <th>Restricción</th>
                <th>Reconfirmación</th>
                <th className="text-right">Ficha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-[var(--text-secondary)]">Cargando directorio...</td>
                </tr>
              ) : filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-[var(--text-secondary)]">No hay invitados en esta vista.</td>
                </tr>
              ) : (
                filteredGuests.map((g) => {
                  const attInfo = mapAttendanceLabel(g.attendance_status);
                  return (
                    <tr
                      key={g.id}
                      className="cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
                      onClick={() => handleOpenDrawer(g)}
                    >
                      <td className="font-semibold text-[var(--text-primary)]">{g.first_name} {g.last_name}</td>
                      <td>{g.group_name}</td>
                      <td>{g.family_side}</td>
                      <td>{g.guest_category}</td>
                      <td>
                        {g.phone_e164 ? (
                          <span className="font-mono text-xs">{g.phone_e164}</span>
                        ) : (
                          <span className="text-[#A83232] italic text-xs font-semibold">Sin teléfono</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${attInfo.style}`}>
                          {attInfo.label}
                        </span>
                      </td>
                      <td>{g.dietary_type || 'Ninguna'}</td>
                      <td><span className="text-xs">{mapReconfirmationLabel(g.reconfirmation_status)}</span></td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDrawer(g);
                          }}
                          className="p-1.5 hover:bg-[var(--border-color)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          aria-label={`Editar ficha de ${g.first_name} ${g.last_name}`}
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Guest Edit Drawer Component */}
        {selectedGuest && (
          <GuestEditDrawer
            guest={selectedGuest}
            onClose={handleCloseDrawer}
            onSuccess={handleGuestSaveSuccess}
          />
        )}

        {/* Modal Conciliación Manual RSVP */}
        {reconcileRsvp && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 w-full max-w-lg space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="font-serif text-xl">Conciliación Manual de RSVP</h3>
                <button onClick={() => setReconcileRsvp(null)}><X size={16} /></button>
              </div>

              <div className="p-3 bg-[var(--bg-secondary)] text-xs space-y-1">
                <p><strong>Confirmado Web:</strong> {reconcileRsvp.first_name} {reconcileRsvp.last_name}</p>
                <p><strong>Teléfono:</strong> {reconcileRsvp.phone_e164}</p>
                <p><strong>Asistencia:</strong> {reconcileRsvp.attendance_status}</p>
              </div>

              <div className="space-y-2 text-xs">
                <label className="block font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Selecciona el invitado correspondiente de la lista maestra:
                </label>
                <select
                  id="reconcile-target-select"
                  className="w-full bg-transparent border border-[var(--border-color)] p-2 focus:outline-none"
                >
                  {guests.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.first_name} {g.last_name} ({g.group_name} · {g.family_side})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setReconcileRsvp(null)} className="btn-secondary">Cancelar</button>
                <button
                  onClick={() => {
                    const sel = document.getElementById('reconcile-target-select') as HTMLSelectElement;
                    if (sel) handleManualReconcile(sel.value, reconcileRsvp.id);
                  }}
                  className="btn-primary"
                >
                  Vincular RSVP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nuevo Invitado */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 w-full max-w-md space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="font-serif text-xl">Agregar Nuevo Invitado</h3>
                <button onClick={() => setShowAddModal(false)}><X size={16} /></button>
              </div>

              <form onSubmit={handleAddGuest} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-transparent border border-[var(--border-color)] p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Apellido</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-transparent border border-[var(--border-color)] p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Teléfono (+569...)</label>
                  <input
                    type="tel"
                    value={formData.phone_e164}
                    onChange={(e) => setFormData({ ...formData, phone_e164: e.target.value })}
                    className="w-full bg-transparent border border-[var(--border-color)] p-2 focus:outline-none"
                    placeholder="Ej: +56912345678"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Grupo</label>
                    <input
                      type="text"
                      value={formData.group_name}
                      onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                      className="w-full bg-transparent border border-[var(--border-color)] p-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Origen</label>
                    <select
                      value={formData.family_side}
                      onChange={(e) => setFormData({ ...formData, family_side: e.target.value })}
                      className="w-full bg-transparent border border-[var(--border-color)] p-2 focus:outline-none"
                    >
                      <option value="Felipe">Felipe</option>
                      <option value="Camila">Camila</option>
                      <option value="Compartido">Compartido</option>
                      <option value="Por clasificar">Por clasificar</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
