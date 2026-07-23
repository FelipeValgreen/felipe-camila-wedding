'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import { Search, Filter, MessageSquare, Edit, UserCheck, UserX, RotateCcw, Plus, X, PhoneOff, Link as LinkIcon, Save } from 'lucide-react';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  full_name_normalized: string;
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
  guest_status: string;
  notes: string | null;
}

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
  const [guests, setGuests] = useState<Guest[]>([]);
  const [unmatchedRSVPs, setUnmatchedRSVPs] = useState<RSVPResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState<string>('all');

  // Drawer / Form state
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [editForm, setEditForm] = useState<Partial<Guest>>({});
  const [reconcileRsvp, setReconcileRsvp] = useState<RSVPResponse | null>(null);

  // Add guest modal
  const [showAddModal, setShowAddModal] = useState(false);
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

      if (gData) setGuests(gData as Guest[]);
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

  function handleSelectGuest(g: Guest) {
    setSelectedGuest(g);
    setEditForm({ ...g });
  }

  async function handleSaveGuestEdit() {
    if (!selectedGuest || !editForm.first_name) return;
    try {
      const updatedData = {
        id: selectedGuest.id,
        first_name: editForm.first_name,
        last_name: editForm.last_name || '',
        full_name_normalized: `${editForm.first_name} ${editForm.last_name || ''}`.trim().toLowerCase(),
        phone_e164: editForm.phone_e164 || null,
        group_name: editForm.group_name || 'General',
        family_side: editForm.family_side || 'Compartido',
        guest_category: editForm.guest_category || 'Adulto',
        invitation_status: editForm.invitation_status || 'not_sent',
        attendance_status: editForm.attendance_status || 'pending',
        dietary_type: editForm.dietary_type || null,
        dietary_detail: editForm.dietary_detail || null,
        reconfirmation_status: editForm.reconfirmation_status || 'pending',
        guest_status: editForm.guest_status || 'active',
        notes: editForm.notes || null,
        version: (selectedGuest as any).version ? (selectedGuest as any).version + 1 : 1
      };

      const res = await fetch('/api/guests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (res.ok) {
        loadData();
        setSelectedGuest(null);
      }
    } catch (err) {
      console.error('Error saving guest edit:', err);
    }
  }

  async function handleManualReconcile(guestId: string, rsvpId: string) {
    try {
      const res = await fetch('/api/rsvp/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_id: guestId, rsvp_id: rsvpId })
      });

      if (res.ok) {
        setReconcileRsvp(null);
        loadData();
      }
    } catch (err) {
      console.error('Error in manual reconcile:', err);
    }
  }

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.first_name) return;
    try {
      const newGuest = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name_normalized: `${formData.first_name} ${formData.last_name}`.toLowerCase(),
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
        body: JSON.stringify(newGuest)
      });

      if (res.ok) {
        setShowAddModal(false);
        setFormData({ first_name: '', last_name: '', phone_e164: '', group_name: 'General', family_side: 'Compartido', guest_category: 'Adulto', notes: '' });
        loadData();
      }
    } catch (err) {
      console.error('Error adding guest:', err);
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
      case 'no_table': return g.attendance_status === 'attending' && !g.table_id && g.guest_status === 'active';
      case 'dietary': return Boolean(g.dietary_type) && g.dietary_type !== 'Ninguna' && g.guest_status === 'active';
      case 'replaced': return g.guest_status === 'replaced';
      case 'por_clasificar': return g.family_side === 'Por clasificar' && g.guest_status === 'active';
      default: return g.guest_status === 'active';
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
              <span>Invitados sin teléfono: <strong>{missingPhoneCount}</strong></span>
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> Nuevo Invitado
            </button>
          </div>
        </div>

        {/* Unmatched RSVP Alert Banner if present */}
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
              className={`px-3 py-1.5 border rounded ${viewFilter === 'all' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              Todos Activos ({guests.filter(g => g.guest_status === 'active').length})
            </button>
            <button
              onClick={() => setViewFilter('no_phone')}
              className={`px-3 py-1.5 border rounded ${viewFilter === 'no_phone' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              Sin Teléfono ({missingPhoneCount})
            </button>
            <button
              onClick={() => setViewFilter('attending')}
              className={`px-3 py-1.5 border rounded ${viewFilter === 'attending' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              Confirmados
            </button>
            <button
              onClick={() => setViewFilter('not_attending')}
              className={`px-3 py-1.5 border rounded ${viewFilter === 'not_attending' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              No Asisten
            </button>
            <button
              onClick={() => setViewFilter('dietary')}
              className={`px-3 py-1.5 border rounded ${viewFilter === 'dietary' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              Con Restricciones
            </button>
            <button
              onClick={() => setViewFilter('replaced')}
              className={`px-3 py-1.5 border rounded ${viewFilter === 'replaced' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
            >
              Reemplazados
            </button>
            <button
              onClick={() => setViewFilter('por_clasificar')}
              className={`px-3 py-1.5 border rounded ${viewFilter === 'por_clasificar' ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-card)]'}`}
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
                <th>Ficha</th>
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
                filteredGuests.map((g) => (
                  <tr key={g.id} className="cursor-pointer" onClick={() => handleSelectGuest(g)}>
                    <td className="font-semibold text-[var(--text-primary)]">{g.first_name} {g.last_name}</td>
                    <td>{g.group_name}</td>
                    <td>{g.family_side}</td>
                    <td>{g.guest_category}</td>
                    <td>
                      {g.phone_e164 ? (
                        <span className="font-mono text-xs">{g.phone_e164}</span>
                      ) : (
                        <span className="text-[#A83232] italic text-xs">Sin teléfono</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${g.attendance_status === 'attending' ? 'badge-confirmed' : g.attendance_status === 'not_attending' ? 'badge-declined' : 'badge-pending'}`}>
                        {g.attendance_status}
                      </span>
                    </td>
                    <td>{g.dietary_type || 'Ninguna'}</td>
                    <td><span className="text-xs">{g.reconfirmation_status}</span></td>
                    <td>
                      <button onClick={() => handleSelectGuest(g)} className="p-1 hover:bg-[var(--bg-secondary)] rounded">
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Drawer Editar Ficha Completa */}
        {selectedGuest && (
          <div className="fixed inset-y-0 right-0 w-96 bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl p-6 z-50 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent-gold)] font-bold">Edición de Ficha</span>
                <h3 className="font-serif text-2xl text-[var(--text-primary)] mt-0.5">{selectedGuest.first_name} {selectedGuest.last_name}</h3>
              </div>
              <button onClick={() => setSelectedGuest(null)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Nombre</label>
                <input
                  type="text"
                  value={editForm.first_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Apellido</label>
                <input
                  type="text"
                  value={editForm.last_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Teléfono E.164 (+569...)</label>
                <input
                  type="tel"
                  value={editForm.phone_e164 || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone_e164: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 focus:outline-none"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Grupo</label>
                  <input
                    type="text"
                    value={editForm.group_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, group_name: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Familia</label>
                  <select
                    value={editForm.family_side || 'Compartido'}
                    onChange={(e) => setEditForm({ ...editForm, family_side: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 focus:outline-none"
                  >
                    <option value="Novio">Novio (Felipe)</option>
                    <option value="Novia">Novia (Camila)</option>
                    <option value="Compartido">Compartido</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Asistencia RSVP (Separado)</label>
                <select
                  value={editForm.attendance_status || 'pending'}
                  onChange={(e) => setEditForm({ ...editForm, attendance_status: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 focus:outline-none font-semibold"
                >
                  <option value="attending">attending (Confirmado)</option>
                  <option value="not_attending">not_attending (No Asiste)</option>
                  <option value="pending">pending (Pendiente)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Estado Reconfirmación</label>
                <select
                  value={editForm.reconfirmation_status || 'pending'}
                  onChange={(e) => setEditForm({ ...editForm, reconfirmation_status: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 focus:outline-none"
                >
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="changed">changed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Restricción Alimentaria</label>
                <select
                  value={editForm.dietary_type || 'Ninguna'}
                  onChange={(e) => setEditForm({ ...editForm, dietary_type: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 focus:outline-none"
                >
                  <option value="Ninguna">Ninguna</option>
                  <option value="Vegetariano">Vegetariano</option>
                  <option value="Vegano">Vegano</option>
                  <option value="Celíaco / libre de gluten">Celíaco / libre de gluten</option>
                  <option value="Alergias">Alergias</option>
                  <option value="Otra">Otra</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Detalle Restricción</label>
                <input
                  type="text"
                  value={editForm.dietary_detail || ''}
                  onChange={(e) => setEditForm({ ...editForm, dietary_detail: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Observaciones</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 focus:outline-none"
                />
              </div>
            </div>

            <div className="border-t border-[var(--border-color)] pt-4 space-y-2">
              <button onClick={handleSaveGuestEdit} className="w-full btn-primary flex items-center justify-center gap-2">
                <Save size={14} /> Guardar Cambios
              </button>
            </div>
          </div>
        )}

        {/* Modal Conciliación Manual RSVP */}
        {reconcileRsvp && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 w-full max-w-lg space-y-4">
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
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 w-full max-w-md space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="font-serif text-xl">Agregar Nuevo Invitado</h3>
                <button onClick={() => setShowAddModal(false)}><X size={16} /></button>
              </div>

              <form onSubmit={handleAddGuest} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Nombre</label>
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
                      <option value="Novio">Novio (Felipe)</option>
                      <option value="Novia">Novia (Camila)</option>
                      <option value="Compartido">Compartido</option>
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
