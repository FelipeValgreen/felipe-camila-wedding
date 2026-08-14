export type OperationalActionType =
  | 'guest.create' | 'guest.update' | 'guest.delete'
  | 'music.create' | 'music.update' | 'music.delete'
  | 'timeline.create' | 'timeline.update' | 'timeline.delete'
  | 'task.create' | 'task.update' | 'task.delete'
  | 'memory.create'
  | 'table.rename' | 'table.create' | 'table.update' | 'table.delete'
  | 'seating.assign' | 'seating.unassign'
  | 'budget.create' | 'budget.update' | 'budget.delete'
  | 'vendor.create' | 'vendor.update' | 'vendor.delete'
  | 'payment.create';

export type OperationalAction = {
  id: string;
  type: OperationalActionType;
  label: string;
  description: string;
  payload: Record<string, any>;
  requiresConfirmation: true;
};

export function normalizeOperationalText(value: string) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function decimal(value: string) {
  return Number(String(value).replace(',', '.'));
}

function money(value: string) {
  const clean = String(value || '').replace(/[$\s]/g, '');
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(clean)) return Number(clean.replace(/\./g, '').replace(',', '.'));
  return Number(clean.replace(',', '.'));
}

function makeAction(type: OperationalActionType, label: string, description: string, payload: Record<string, any>): OperationalAction {
  return { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, label, description, payload, requiresConfirmation: true };
}

function attendance(label: string) {
  const q = normalizeOperationalText(label);
  if (q.includes('no asiste') || q.includes('rechaz')) return 'not_attending';
  if (q.includes('pendiente')) return 'pending';
  return 'attending';
}

function canonicalStatus(value: string, options: Record<string, string>, fallback = value) {
  const q = normalizeOperationalText(value);
  return options[q] || fallback;
}

export function parseOperationalAction(text: string): OperationalAction | null {
  const clean = text.trim().replace(/[.!?]+$/, '');
  let m: RegExpMatchArray | null;

  m = clean.match(/(?:mueve|posiciona)\s+(?:la\s+)?mesa\s+(\d+)\s+(?:a|en)\s+x\s*=?\s*(-?\d+(?:[.,]\d+)?)\s*(?:m|metros?)?\s*(?:,|y)?\s*y\s*=?\s*(-?\d+(?:[.,]\d+)?)/i);
  if (m) return makeAction('table.update', `Mover Mesa ${m[1]}`, `Nueva posición: X ${decimal(m[2])} m · Y ${decimal(m[3])} m`, { tableNumber: Number(m[1]), patch: { position_x_m: decimal(m[2]), position_y_m: decimal(m[3]) } });

  m = clean.match(/(?:gira|rota)\s+(?:la\s+)?mesa\s+(\d+)\s+(?:a\s+)?(-?\d+(?:[.,]\d+)?)\s*(?:°|grados?)?/i);
  if (m) return makeAction('table.update', `Girar Mesa ${m[1]}`, `Nueva rotación: ${decimal(m[2])}°`, { tableNumber: Number(m[1]), patch: { rotation: decimal(m[2]) } });

  m = clean.match(/(?:cambia|ajusta|define|pon)\s+(?:la\s+)?capacidad\s+(?:de\s+)?(?:la\s+)?mesa\s+(\d+)\s+(?:a|en|para)\s+(\d+)/i);
  if (m) return makeAction('table.update', `Cambiar capacidad Mesa ${m[1]}`, `Nueva capacidad: ${Number(m[2])} personas`, { tableNumber: Number(m[1]), patch: { capacity: Number(m[2]) } });

  m = clean.match(/(?:renombra|nombra|llama)\s+(?:la\s+)?mesa\s+(\d+)\s+(?:a|como)?\s*[“\"]?(.+?)[”\"]?$/i);
  if (m) return makeAction('table.rename', `Renombrar Mesa ${m[1]}`, `Nuevo nombre: ${m[2].trim()}`, { tableNumber: Number(m[1]), name: m[2].trim() });

  m = clean.match(/ponle\s+[“\"]?(.+?)[”\"]?\s+a\s+(?:la\s+)?mesa\s+(\d+)$/i);
  if (m) return makeAction('table.rename', `Renombrar Mesa ${m[2]}`, `Nuevo nombre: ${m[1].trim()}`, { tableNumber: Number(m[2]), name: m[1].trim() });

  m = clean.match(/(?:crea|agrega|añade)\s+(?:una\s+)?mesa\s+(\d+)(?:\s+(?:para|de)\s+(\d+)\s*(?:personas|cupos)?)?(?:\s+(?:llamada|como|nombre)\s+[“\"]?(.+?)[”\"]?)?$/i);
  if (m) {
    const capacity = Number(m[2] || 10), name = (m[3] || `Mesa ${m[1]}`).trim();
    return makeAction('table.create', `Crear Mesa ${m[1]}`, `${name} · ${capacity} personas`, { table_number: Number(m[1]), name, capacity, table_type: 'round_guest', zone: 'Principal' });
  }

  m = clean.match(/(?:elimina|borra|quita)\s+(?:la\s+)?mesa\s+(\d+)$/i);
  if (m) return makeAction('table.delete', `Eliminar Mesa ${m[1]}`, 'La mesa se eliminará sólo si no tiene asignaciones que lo impidan.', { tableNumber: Number(m[1]) });

  m = clean.match(/(?:quita|saca|retira)\s+(?:a\s+)?(.+?)\s+de\s+(?:la\s+)?mesa(?:\s+\d+)?$/i);
  if (m) return makeAction('seating.unassign', `Quitar a ${m[1].trim()} de su mesa`, 'La persona quedará sin mesa asignada.', { guestName: m[1].trim() });

  m = clean.match(/(?:asigna|sienta|mueve|pon)\s+(?:a\s+)?(.+?)\s+(?:en|a)\s+(?:la\s+)?mesa\s+(\d+)$/i);
  if (m) return makeAction('seating.assign', `Asignar a ${m[1].trim()} a Mesa ${m[2]}`, 'La capacidad y el estado de asistencia se validarán al confirmar.', { guestName: m[1].trim(), tableNumber: Number(m[2]) });

  m = clean.match(/(?:marca|actualiza|cambia)\s+(?:a\s+)?(.+?)\s+como\s+(confirmad[oa]|asiste|no asiste|pendiente)$/i);
  if (m) {
    const status = attendance(m[2]);
    return makeAction('guest.update', `Actualizar a ${m[1].trim()}`, status === 'attending' ? 'Marcar como asistente confirmado.' : status === 'not_attending' ? 'Marcar como no asistente.' : 'Dejar asistencia pendiente.', { guestName: m[1].trim(), updates: { attendance_status: status } });
  }

  m = clean.match(/(?:elimina|borra)\s+(?:al?\s+|a la\s+)?invitad[oa]\s+(.+)$/i) || clean.match(/(?:elimina|borra)\s+a\s+(.+?)\s+de\s+(?:la\s+)?lista(?:\s+de\s+invitados)?$/i);
  if (m) return makeAction('guest.delete', `Eliminar a ${m[1].trim()}`, 'Se eliminará la ficha operativa. Esta acción requiere confirmación.', { guestName: m[1].trim() });

  m = clean.match(/(?:agrega|añade|crea|incorpora|registra)\s+(?:a\s+)?(.+?)\s+como\s+(?:nuevo\s+)?invitad[oa](?:\s+(?:y\s+)?(?:que\s+)?(asiste|no asiste|pendiente))?$/i);
  if (m) {
    const parts = m[1].trim().split(/\s+/), first_name = parts.shift() || m[1].trim(), last_name = parts.join(' '), status = attendance(m[2] || 'pendiente');
    return makeAction('guest.create', `Agregar a ${m[1].trim()}`, status === 'attending' ? 'Se creará como asistente confirmado.' : status === 'not_attending' ? 'Se registrará como no asistente.' : 'Se creará con asistencia pendiente.', { first_name, last_name, group_name: 'Por clasificar', family_side: 'Por clasificar', guest_category: 'Adulto', attendance_status: status, dietary_type: 'Ninguna', notes: 'Ficha creada desde Copiloto; completar grupo, teléfono y vínculo RSVP si corresponde.' });
  }

  m = clean.match(/(?:marca|actualiza|cambia)\s+(?:la\s+)?(?:canci[oó]n|momento musical)\s+[“\"]?(.+?)[”\"]?\s+como\s+(confirmad[oa]|pendiente|descartad[oa])$/i);
  if (m) {
    const status = canonicalStatus(m[2], { confirmado: 'Confirmado', confirmada: 'Confirmado', pendiente: 'Pendiente', descartado: 'Descartado', descartada: 'Descartado' });
    return makeAction('music.update', `Actualizar música “${m[1].trim()}”`, `Nuevo estado: ${status}`, { musicName: m[1].trim(), updates: { status } });
  }

  m = clean.match(/(?:cambia|ajusta|define)\s+(?:la\s+)?prioridad\s+(?:de\s+)?(?:la\s+)?canci[oó]n\s+[“\"]?(.+?)[”\"]?\s+(?:a|como)\s+(must play|no tocar|alta|normal)$/i);
  if (m) return makeAction('music.update', `Cambiar prioridad “${m[1].trim()}”`, `Nueva prioridad: ${m[2]}`, { musicName: m[1].trim(), updates: { priority: m[2] } });

  m = clean.match(/(?:elimina|borra|quita)\s+(?:la\s+)?(?:canci[oó]n|momento musical)\s+[“\"]?(.+?)[”\"]?$/i);
  if (m) return makeAction('music.delete', `Eliminar música “${m[1].trim()}”`, 'Se quitará el ítem musical seleccionado.', { musicName: m[1].trim() });

  m = clean.match(/(?:marca|actualiza|cambia)\s+(?:el\s+)?(?:bloque|hito)\s+[“\"]?(.+?)[”\"]?\s+como\s+(confirmado|pendiente|en curso|bloqueado)$/i);
  if (m) {
    const status = canonicalStatus(m[2], { confirmado: 'Confirmado', pendiente: 'Pendiente', 'en curso': 'En curso', bloqueado: 'Bloqueado' });
    return makeAction('timeline.update', `Actualizar bloque “${m[1].trim()}”`, `Nuevo estado: ${status}`, { timelineName: m[1].trim(), updates: { status } });
  }

  m = clean.match(/(?:mueve|reprograma|cambia\s+la\s+fecha\s+de)\s+(?:el\s+)?(?:bloque|hito)\s+[“\"]?(.+?)[”\"]?\s+(?:a|para)\s+(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/i);
  if (m) return makeAction('timeline.update', `Reprogramar “${m[1].trim()}”`, `Nuevo inicio: ${m[2]} ${m[3]}`, { timelineName: m[1].trim(), updates: { dateTime: `${m[2]}T${m[3]}` } });

  m = clean.match(/(?:elimina|borra|quita)\s+(?:el\s+)?(?:bloque|hito)\s+[“\"]?(.+?)[”\"]?$/i);
  if (m) return makeAction('timeline.delete', `Eliminar bloque “${m[1].trim()}”`, 'Se quitará el bloque del cronograma.', { timelineName: m[1].trim() });

  m = clean.match(/(?:completa|termina|cierra)\s+(?:la\s+)?tarea\s+[“\"]?(.+?)[”\"]?$/i);
  if (m) return makeAction('task.update', `Completar tarea “${m[1].trim()}”`, 'La tarea quedará marcada como Completada.', { taskName: m[1].trim(), updates: { status: 'Completada' } });

  m = clean.match(/(?:reabre|reabrir)\s+(?:la\s+)?tarea\s+[“\"]?(.+?)[”\"]?$/i);
  if (m) return makeAction('task.update', `Reabrir tarea “${m[1].trim()}”`, 'La tarea volverá a Pendiente.', { taskName: m[1].trim(), updates: { status: 'Pendiente' } });

  m = clean.match(/(?:marca|actualiza|cambia)\s+(?:la\s+)?tarea\s+[“\"]?(.+?)[”\"]?\s+como\s+(pendiente|en curso|completada)$/i);
  if (m) {
    const status = canonicalStatus(m[2], { pendiente: 'Pendiente', 'en curso': 'En curso', completada: 'Completada' });
    return makeAction('task.update', `Actualizar tarea “${m[1].trim()}”`, `Nuevo estado: ${status}`, { taskName: m[1].trim(), updates: { status } });
  }

  m = clean.match(/(?:elimina|borra|quita)\s+(?:la\s+)?tarea\s+[“\"]?(.+?)[”\"]?$/i);
  if (m) return makeAction('task.delete', `Eliminar tarea “${m[1].trim()}”`, 'La tarea se eliminará del checklist.', { taskName: m[1].trim() });

  m = clean.match(/(?:agrega|añade|crea)\s+(?:un\s+)?(?:ítem|item|gasto)\s+(?:de\s+)?(?:presupuesto\s+)?[“\"]?(.+?)[”\"]?(?:\s+(?:por|de)\s+\$?\s*([\d.]+(?:,\d+)?))?$/i);
  if (m) {
    const amount = m[2] ? money(m[2]) : null;
    return makeAction('budget.create', `Agregar presupuesto “${m[1].trim()}”`, amount === null ? 'Monto por completar.' : `Monto proyectado: $${Math.round(amount).toLocaleString('es-CL')}`, { item: m[1].trim(), category: 'General', status: 'Pendiente', currency: 'CLP', projectedQuantity: 1, projectedGross: amount, advance: 0 });
  }

  m = clean.match(/(?:cambia|actualiza|ajusta)\s+(?:el\s+)?(?:monto|presupuesto)\s+(?:de\s+)?[“\"]?(.+?)[”\"]?\s+(?:a|en)\s+\$?\s*([\d.]+(?:,\d+)?)$/i);
  if (m) {
    const amount = money(m[2]);
    return makeAction('budget.update', `Actualizar presupuesto “${m[1].trim()}”`, `Nuevo monto: $${Math.round(amount).toLocaleString('es-CL')}`, { budgetName: m[1].trim(), updates: { projectedGross: amount } });
  }

  m = clean.match(/(?:marca|actualiza)\s+(?:el\s+)?(?:ítem|item|gasto)\s+[“\"]?(.+?)[”\"]?\s+como\s+(pendiente|confirmado|contratado|pagado|descartado)$/i);
  if (m) {
    const status = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    return makeAction('budget.update', `Actualizar presupuesto “${m[1].trim()}”`, `Nuevo estado: ${status}`, { budgetName: m[1].trim(), updates: { status } });
  }

  m = clean.match(/(?:elimina|borra|quita)\s+(?:el\s+)?(?:ítem|item|gasto)\s+[“\"]?(.+?)[”\"]?(?:\s+del\s+presupuesto)?$/i);
  if (m) return makeAction('budget.delete', `Eliminar presupuesto “${m[1].trim()}”`, 'Se quitará el ítem presupuestario.', { budgetName: m[1].trim() });

  m = clean.match(/(?:agrega|añade|crea|registra)\s+(?:un\s+)?proveedor\s+[“\"]?(.+?)[”\"]?(?:\s+categor[ií]a\s+[“\"]?(.+?)[”\"]?)?$/i);
  if (m) return makeAction('vendor.create', `Agregar proveedor “${m[1].trim()}”`, `Categoría: ${(m[2] || 'General').trim()}`, { name: m[1].trim(), category: (m[2] || 'General').trim(), status: 'Evaluando', production_status: 'Por coordinar' });

  m = clean.match(/(?:marca|actualiza|cambia)\s+(?:al\s+)?proveedor\s+[“\"]?(.+?)[”\"]?\s+como\s+(evaluando|contratado|descartado|confirmado)$/i);
  if (m) {
    const status = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    return makeAction('vendor.update', `Actualizar proveedor “${m[1].trim()}”`, `Nuevo estado: ${status}`, { vendorName: m[1].trim(), updates: { status } });
  }

  m = clean.match(/(?:elimina|borra|quita)\s+(?:al\s+)?proveedor\s+[“\"]?(.+?)[”\"]?$/i);
  if (m) return makeAction('vendor.delete', `Eliminar proveedor “${m[1].trim()}”`, 'Se eliminará el proveedor si las reglas de integridad lo permiten.', { vendorName: m[1].trim() });

  m = clean.match(/(?:registra|agrega|anota)\s+(?:un\s+)?pago\s+(?:de\s+)?\$?\s*([\d.]+(?:,\d+)?)\s+(?:para|a|del?|de\s+la)\s+[“\"]?(.+?)[”\"]?$/i);
  if (m) {
    const amount = money(m[1]);
    return makeAction('payment.create', `Registrar pago para “${m[2].trim()}”`, `Monto: $${Math.round(amount).toLocaleString('es-CL')}`, { budgetName: m[2].trim(), amount, currency: 'CLP', status: 'Pagado', payment_method: 'Transferencia' });
  }

  return null;
}
