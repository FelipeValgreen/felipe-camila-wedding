'use client';

import React, { useEffect, useState } from 'react';
import { X, Save, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import styles from './GuestEditDrawer.module.css';
import { validateAndNormalizePhone } from '@/lib/phone';

export interface GuestData {
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
  guest_status: string;
  notes: string | null;
}

interface GuestEditDrawerProps {
  guest: GuestData;
  onClose: () => void;
  onSuccess: (updatedGuest: GuestData) => void;
}

export default function GuestEditDrawer({ guest, onClose, onSuccess }: GuestEditDrawerProps) {
  const [formData, setFormData] = useState<GuestData>({ ...guest });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Lock body scroll while open & handle Escape key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Phone validation on change
  const handlePhoneChange = (val: string) => {
    setFormData(prev => ({ ...prev, phone_e164: val }));
    if (!val || val.trim() === '') {
      setPhoneError(null);
      return;
    }
    const result = validateAndNormalizePhone(val);
    if (!result.valid && result.error) {
      setPhoneError(result.error);
    } else {
      setPhoneError(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    // Validate phone
    const phoneResult = validateAndNormalizePhone(formData.phone_e164);
    if (!phoneResult.valid) {
      setPhoneError(phoneResult.error || 'Número de teléfono inválido');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        id: formData.id,
        first_name: formData.first_name.trim(),
        last_name: (formData.last_name || '').trim(),
        full_name_normalized: `${formData.first_name.trim()} ${(formData.last_name || '').trim()}`.trim().toLowerCase(),
        phone_e164: phoneResult.normalized,
        group_name: (formData.group_name || 'General').trim(),
        family_side: formData.family_side || 'Compartido',
        guest_category: formData.guest_category || 'Adulto',
        invitation_status: formData.invitation_status || 'not_sent',
        attendance_status: formData.attendance_status || 'pending',
        dietary_type: formData.dietary_type || 'Ninguna',
        dietary_detail: (formData.dietary_detail || '').trim() || null,
        reconfirmation_status: formData.reconfirmation_status || 'pending',
        guest_status: formData.guest_status || 'active',
        notes: (formData.notes || '').trim() || null
      };

      const response = await fetch('/api/guests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || `Error (${response.status}): No fue posible guardar los cambios.`);
      }

      setSaveSuccess(true);
      const finalGuest = result.guest as GuestData;
      
      // Allow user to see "Cambios guardados" before closing
      setTimeout(() => {
        onSuccess(finalGuest);
      }, 750);
    } catch (err: any) {
      setSaveError(err.message || 'Error inesperado al guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Sticky Header */}
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Ficha de Invitado</span>
            <h2 className={styles.title}>
              {formData.first_name} {formData.last_name}
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar ventana de edición"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form id="guest-drawer-form" onSubmit={handleSave} className={styles.body}>
          {/* Section: Identificación */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>1. Identificación y Contacto</span>
            
            <div className={styles.row}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className={styles.input}
                  placeholder="Ej: Felipe"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Apellido</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className={styles.input}
                  placeholder="Ej: Valverde"
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Teléfono WhatsApp (Formato +56 9...)</label>
              <input
                type="tel"
                value={formData.phone_e164 || ''}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`${styles.input} ${phoneError ? styles.inputError : ''}`}
                placeholder="Ej: +56912345678 o 912345678"
              />
              {phoneError && <span className={styles.errorMessage}>{phoneError}</span>}
            </div>
          </div>

          {/* Section: Clasificación */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>2. Clasificación del Invitado</span>
            
            <div className={styles.row}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Grupo / Familia</label>
                <input
                  type="text"
                  value={formData.group_name || ''}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                  className={styles.input}
                  placeholder="Ej: Familia Valverde"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Familia Origen</label>
                <select
                  value={formData.family_side || 'Compartido'}
                  onChange={(e) => setFormData({ ...formData, family_side: e.target.value })}
                  className={styles.select}
                >
                  <option value="Novio">Felipe (Novio)</option>
                  <option value="Novia">Camila (Novia)</option>
                  <option value="Compartido">Compartido</option>
                  <option value="Por clasificar">Por clasificar</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Categoría</label>
              <select
                value={formData.guest_category || 'Adulto'}
                onChange={(e) => setFormData({ ...formData, guest_category: e.target.value })}
                className={styles.select}
              >
                <option value="Adulto">Adulto</option>
                <option value="Niño">Niño</option>
                <option value="Bebé">Bebé</option>
                <option value="Proveedor / Staff">Proveedor / Staff</option>
              </select>
            </div>
          </div>

          {/* Section: Estados RSVP */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>3. Estado de Asistencia y RSVP</span>

            <div className={styles.row}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Estado Asistencia</label>
                <select
                  value={formData.attendance_status || 'pending'}
                  onChange={(e) => setFormData({ ...formData, attendance_status: e.target.value })}
                  className={styles.select}
                >
                  <option value="pending">Pendiente</option>
                  <option value="attending">Confirmado</option>
                  <option value="not_attending">No asistirá</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Estado Invitación</label>
                <select
                  value={formData.invitation_status || 'not_sent'}
                  onChange={(e) => setFormData({ ...formData, invitation_status: e.target.value })}
                  className={styles.select}
                >
                  <option value="not_sent">No enviada</option>
                  <option value="sent">Enviada</option>
                  <option value="delivered">Entregada</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Estado Reconfirmación</label>
              <select
                value={formData.reconfirmation_status || 'pending'}
                onChange={(e) => setFormData({ ...formData, reconfirmation_status: e.target.value })}
                className={styles.select}
              >
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmado</option>
                <option value="changed">Cambió respuesta</option>
              </select>
            </div>
          </div>

          {/* Section: Restricción Alimentaria */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>4. Preferencias Alimentarias</span>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Restricción Alimentaria</label>
              <select
                value={formData.dietary_type || 'Ninguna'}
                onChange={(e) => setFormData({ ...formData, dietary_type: e.target.value })}
                className={styles.select}
              >
                <option value="Ninguna">Ninguna</option>
                <option value="Vegetariano">Vegetariano</option>
                <option value="Vegano">Vegano</option>
                <option value="Celíaco / libre de gluten">Celíaco / libre de gluten</option>
                <option value="Alergias">Alergias</option>
                <option value="Otra">Otra</option>
              </select>
            </div>

            {formData.dietary_type && formData.dietary_type !== 'Ninguna' && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Detalle de la Restricción</label>
                <input
                  type="text"
                  value={formData.dietary_detail || ''}
                  onChange={(e) => setFormData({ ...formData, dietary_detail: e.target.value })}
                  className={styles.input}
                  placeholder="Ej: Alergia severa a frutos secos"
                />
              </div>
            )}
          </div>

          {/* Section: Observaciones */}
          <div className={styles.section} style={{ borderBottom: 'none' }}>
            <span className={styles.sectionTitle}>5. Observaciones Internas</span>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Notas</label>
              <textarea
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className={styles.textarea}
                placeholder="Notas internas para el equipo de producción..."
              />
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className={styles.footer}>
          {saveError && (
            <div className={styles.saveErrorAlert}>
              <strong>Error al guardar:</strong> {saveError}
            </div>
          )}

          {saveSuccess && (
            <div className={styles.saveSuccessAlert}>
              <CheckCircle2 size={14} style={{ display: 'inline', marginRight: '6px' }} />
              <strong>¡Cambios guardados exitosamente!</strong>
            </div>
          )}

          <button
            type="submit"
            form="guest-drawer-form"
            disabled={isSaving || Boolean(phoneError)}
            className={styles.saveButton}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Guardando cambios...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Guardar Ficha de Invitado</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
