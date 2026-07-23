'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Search, Filter, MessageSquare, Edit, UserCheck, UserX, RotateCcw, Download, Plus, X } from 'lucide-react';

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

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAttendance, setFilterAttendance] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  // Drawer / Form state
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

  async function loadGuests() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('wedding_guests').select('*').order('first_name', { ascending: true });
      if (!error && data) {
        setGuests(data as Guest[]);
      }
    } catch (err) {
      console.error('Error loading guests:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGuests();
  }, []);

  async function handleStatusChange(guestId: string, newAttendance: string) {
    try {
      await supabase.from('wedding_guests').update({
        attendance_status: newAttendance,
        reconfirmation_status: 'confirmed',
        reconfirmed_at: new Date().toISOString()
      }).eq('id', guestId);
      
      // Audit log
      await supabase.from('audit_log').insert({
        entity_type: 'wedding_guests',
        entity_id: guestId,
        action: 'UPDATE_ATTENDANCE',
        after_data: { attendance_status: newAttendance },
        origin: 'dashboard'
      });

      loadGuests();
      if (selectedGuest?.id === guestId) {
        setSelectedGuest(prev => prev ? { ...prev, attendance_status: newAttendance } : null);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  async function handleReplaceGuest(guestId: string) {
    const newName = prompt('Nombre del nuevo invitado de reemplazo:');
    if (!newName) return;
    const newParts = newName.trim().split(' ');
    const fName = newParts[0] || newName;
    const lName = newParts.slice(1).join(' ') || '';

    try {
      // 1. Mark original guest as replaced
      await supabase.from('wedding_guests').update({ guest_status: 'replaced' }).eq('id', guestId);
      
      // 2. Create new guest
      await supabase.from('wedding_guests').insert({
        first_name: fName,
        last_name: lName,
        full_name_normalized: newName.toLowerCase(),
        group_name: selectedGuest?.group_name || 'General',
        family_side: selectedGuest?.family_side || 'Compartido',
        replacement_for_guest_id: guestId,
        guest_status: 'active'
      });

      // Audit log
      await supabase.from('audit_log').insert({
        entity_type: 'wedding_guests',
        entity_id: guestId,
        action: 'REPLACE_GUEST',
        after_data: { replaced_by: newName },
        origin: 'dashboard'
      });

      loadGuests();
      setSelectedGuest(null);
    } catch (err) {
      console.error('Error replacing guest:', err);
    }
  }

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.first_name) return;
    try {
      await supabase.from('wedding_guests').insert({
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name_normalized: `${formData.first_name} ${formData.last_name}`.toLowerCase(),
        phone_e164: formData.phone_e164 || null,
        group_name: formData.group_name,
        family_side: formData.family_side,
        guest_category: formData.guest_category,
        notes: formData.notes || null,
        guest_status: 'active'
      });

      setShowAddModal(false);
      setFormData({ first_name: '', last_name: '', phone_e164: '', group_name: 'General', family_side: 'Compartido', guest_category: 'Adulto', notes: '' });
      loadGuests();
    } catch (err) {
      console.error('Error adding guest:', err);
    }
  }

  const filteredGuests = guests.filter(g => {
    const matchesSearch = `${g.first_name} ${g.last_name} ${g.phone_e164 || ''} ${g.group_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAttendance = filterAttendance === 'all' || g.attendance_status === filterAttendance;
    const matchesStatus = filterStatus === 'all' || g.guest_status === filterStatus;
    return matchesSearch && matchesAttendance && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)] font-semibold block">
              Directorio de Invitados
            </span>
            <h1 className="font-serif text-3xl text-[var(--text-primary)] mt-1">
              Invitados & RSVP
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> Nuevo Invitado
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--bg-secondary)] p-4 border border-[var(--border-color)]">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-3 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por nombre, grupo o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[var(--text-primary)]"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={filterAttendance}
              onChange={(e) => setFilterAttendance(e.target.value)}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2 text-xs focus:outline-none"
            >
              <option value="all">Todas las asistencias</option>
              <option value="attending">Confirmados</option>
              <option value="not_attending">No asisten</option>
              <option value="pending">Pendientes</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2 text-xs focus:outline-none"
            >
              <option value="active">Activos</option>
              <option value="replaced">Reemplazados</option>
              <option value="archived">Archivados</option>
              <option value="all">Todos</option>
            </select>
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
                <th>Estado Ficha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-[var(--text-secondary)]">Cargando directorio de invitados...</td>
                </tr>
              ) : filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-[var(--text-secondary)]">No se encontraron invitados con los filtros seleccionados.</td>
                </tr>
              ) : (
                filteredGuests.map((g) => (
                  <tr key={g.id} className="cursor-pointer" onClick={() => setSelectedGuest(g)}>
                    <td className="font-semibold text-[var(--text-primary)]">
                      {g.first_name} {g.last_name}
                    </td>
                    <td>{g.group_name}</td>
                    <td>{g.family_side}</td>
                    <td>{g.guest_category}</td>
                    <td>{g.phone_e164 || '-'}</td>
                    <td>
                      {g.attendance_status === 'attending' && <span className="badge badge-confirmed">Confirmado</span>}
                      {g.attendance_status === 'not_attending' && <span className="badge badge-declined">No Asiste</span>}
                      {g.attendance_status === 'pending' && <span className="badge badge-pending">Pendiente</span>}
                    </td>
                    <td>{g.dietary_type || 'Ninguna'}</td>
                    <td>
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${g.guest_status === 'active' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                        {g.guest_status}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {g.phone_e164 && (
                          <a
                            href={`https://wa.me/${g.phone_e164.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-[var(--bg-secondary)] text-[#25D366] rounded"
                            title="Abrir WhatsApp"
                          >
                            <MessageSquare size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => handleStatusChange(g.id, 'attending')}
                          className="p-1.5 hover:bg-[var(--bg-secondary)] text-[#2D5A27] rounded"
                          title="Confirmar asistencia"
                        >
                          <UserCheck size={14} />
                        </button>
                        <button
                          onClick={() => handleStatusChange(g.id, 'not_attending')}
                          className="p-1.5 hover:bg-[var(--bg-secondary)] text-[#55504A] rounded"
                          title="Marcar No Asiste"
                        >
                          <UserX size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Drawer Ficha Lateral */}
        {selectedGuest && (
          <div className="fixed inset-y-0 right-0 w-96 bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-xl p-6 z-50 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent-gold)] font-bold">Ficha de Invitado</span>
                <h3 className="font-serif text-2xl text-[var(--text-primary)] mt-0.5">{selectedGuest.first_name} {selectedGuest.last_name}</h3>
              </div>
              <button onClick={() => setSelectedGuest(null)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Grupo & Origen</span>
                <p className="mt-1 font-medium">{selectedGuest.group_name} · {selectedGuest.family_side}</p>
              </div>

              <div>
                <span className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Teléfono de Contacto</span>
                <p className="mt-1 font-medium">{selectedGuest.phone_e164 || 'No registrado'}</p>
              </div>

              <div>
                <span className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Estado RSVP</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`badge ${selectedGuest.attendance_status === 'attending' ? 'badge-confirmed' : selectedGuest.attendance_status === 'not_attending' ? 'badge-declined' : 'badge-pending'}`}>
                    {selectedGuest.attendance_status}
                  </span>
                </div>
              </div>

              <div>
                <span className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Restricción Alimentaria</span>
                <p className="mt-1 font-medium">{selectedGuest.dietary_type || 'Ninguna'} {selectedGuest.dietary_detail ? `(${selectedGuest.dietary_detail})` : ''}</p>
              </div>

              <div>
                <span className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Observaciones</span>
                <p className="mt-1 font-medium text-[var(--text-secondary)]">{selectedGuest.notes || 'Sin observaciones registradas.'}</p>
              </div>
            </div>

            <div className="border-t border-[var(--border-color)] pt-4 space-y-2">
              <button onClick={() => handleReplaceGuest(selectedGuest.id)} className="w-full btn-secondary text-center block">
                Reemplazar Invitado
              </button>
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
