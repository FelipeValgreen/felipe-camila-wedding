import crypto from 'crypto';
import {
    createRSVPRecord,
    getRSVPById,
    getRSVPByPhoneAndName,
    getRSVPsByPhone,
    updateRSVPRecord,
    createRSVPEvent
} from './supabase-admin.js';
import { syncToGoogleSheets } from './google-sheets.js';

export function normalizeName(name) {
    if (!name) return '';
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

export function normalizePhone(rawPhone) {
    if (!rawPhone || typeof rawPhone !== 'string') return null;
    const trimmed = rawPhone.trim();
    if (!trimmed) return null;

    const isLeadingPlus = trimmed.startsWith('+');
    const rest = isLeadingPlus ? trimmed.slice(1) : trimmed;

    if (/[a-zA-Z]/.test(trimmed)) return null;
    if (/[^0-9\s().-]/.test(rest)) return null;
    if ((trimmed.match(/\+/g) || []).length > 1) return null;

    const digits = trimmed.replace(/[^\d]/g, '');
    if (digits.length < 8 || digits.length > 15) return null;

    return (isLeadingPlus ? '+' : '') + digits;
}

export function generateManageToken() {
    return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export function validateRSVPInput({ first_name, last_name, phone, attendance_status, dietary_type, dietary_detail }) {
    const fName = (first_name || '').trim();
    const lName = (last_name || '').trim();

    if (fName.length < 2) return { valid: false, error: 'Nombre inválido (mínimo 2 caracteres).' };
    if (lName.length < 2) return { valid: false, error: 'Apellido inválido (mínimo 2 caracteres).' };

    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) return { valid: false, error: 'Número de WhatsApp inválido (entre 8 y 15 dígitos).' };

    const validStatuses = ['attending', 'not_attending', 'pending'];
    if (!validStatuses.includes(attendance_status)) {
        return { valid: false, error: 'Estado de asistencia no válido.' };
    }

    let finalDietaryType = null;
    let finalDietaryDetail = null;

    if (attendance_status === 'attending') {
        const validDietary = ['Ninguna', 'Vegetariano', 'Vegano', 'Celíaco / libre de gluten', 'Alergias', 'Otra'];
        if (!dietary_type || !validDietary.includes(dietary_type)) {
            return { valid: false, error: 'Opción de restricción alimentaria inválida.' };
        }
        finalDietaryType = dietary_type;

        if (dietary_type === 'Alergias' || dietary_type === 'Otra') {
            const detail = (dietary_detail || '').trim();
            if (!detail || detail.length < 2 || detail.toLowerCase() === 'alergias' || detail.toLowerCase() === 'otra') {
                return { valid: false, error: 'Especifique el detalle de su restricción alimentaria.' };
            }
            finalDietaryDetail = detail;
        }
    }

    const fullNameNormalized = normalizeName(fName + ' ' + lName);

    return {
        valid: true,
        data: {
            first_name: fName,
            last_name: lName,
            full_name_normalized: fullNameNormalized,
            phone_e164: phoneE164,
            attendance_status,
            dietary_type: finalDietaryType,
            dietary_detail: finalDietaryDetail
        }
    };
}

export async function createRSVP(input, source = 'web') {
    const val = validateRSVPInput(input);
    if (!val.valid) return { ok: false, status: 400, error: val.error };

    const existing = await getRSVPByPhoneAndName(val.data.phone_e164, val.data.full_name_normalized);
    if (existing) {
        return {
            ok: false,
            status: 409,
            error: 'RSVP_ALREADY_EXISTS',
            user_message: 'Ya existe una respuesta con estos datos. Puedes modificarla desde el dispositivo donde la registraste o escribir al WhatsApp del matrimonio.'
        };
    }

    const rawToken = generateManageToken();
    const tokenHash = hashToken(rawToken);

    const recordPayload = {
        ...val.data,
        source,
        reconfirmation_status: 'not_started',
        manage_token_hash: tokenHash,
        sheet_sync_status: 'pending'
    };

    const inserted = await createRSVPRecord(recordPayload);
    if (!inserted) {
        return { ok: false, status: 500, error: 'NO_SE_PUDO_REGISTRAR' };
    }

    await createRSVPEvent(inserted.id, 'created', source);

    let sheetsStatus = 'pending';
    let sheetRowNumber = null;

    try {
        const syncRes = await syncToGoogleSheets(inserted, false);
        if (syncRes.synced) {
            sheetsStatus = 'synced';
            sheetRowNumber = syncRes.sheet_row_number;
            await updateRSVPRecord(inserted.id, { sheet_sync_status: 'synced', sheet_row_number: sheetRowNumber });
        } else {
            sheetsStatus = 'failed';
            await updateRSVPRecord(inserted.id, { sheet_sync_status: 'failed' });
        }
    } catch (err) {
        console.error('Sheets sync error:', err.message);
    }

    return {
        ok: true,
        rsvp_id: inserted.id,
        manage_token: rawToken,
        attendance_status: inserted.attendance_status,
        dietary_type: inserted.dietary_type,
        dietary_detail: inserted.dietary_detail,
        sheet_sync_status: sheetsStatus
    };
}

export async function updateRSVP(rsvpId, manageToken, updates) {
    if (!rsvpId || !manageToken) {
        return { ok: false, status: 400, error: 'Credenciales de modificación faltantes.' };
    }

    const existing = await getRSVPById(rsvpId);
    if (!existing) {
        return { ok: false, status: 401, error: 'No se encontró el registro o token inválido.' };
    }

    const providedHash = hashToken(manageToken);
    if (existing.manage_token_hash !== providedHash) {
        return { ok: false, status: 401, error: 'No se encontró el registro o token inválido.' };
    }

    const val = validateRSVPInput({
        first_name: existing.first_name,
        last_name: existing.last_name,
        phone: existing.phone_e164,
        attendance_status: updates.attendance_status,
        dietary_type: updates.dietary_type,
        dietary_detail: updates.dietary_detail
    });

    if (!val.valid) return { ok: false, status: 400, error: val.error };

    const updatePayload = {
        attendance_status: val.data.attendance_status,
        dietary_type: val.data.dietary_type,
        dietary_detail: val.data.dietary_detail
    };

    const updated = await updateRSVPRecord(rsvpId, updatePayload);
    if (!updated) return { ok: false, status: 500, error: 'NO_SE_PUDO_ACTUALIZAR' };

    await createRSVPEvent(rsvpId, 'updated', 'web');

    try {
        const syncRes = await syncToGoogleSheets(updated, true);
        if (syncRes.synced) {
            await updateRSVPRecord(rsvpId, { sheet_sync_status: 'synced' });
        }
    } catch (err) {
        console.error('Sheets update sync error:', err.message);
    }

    return {
        ok: true,
        rsvp_id: rsvpId,
        attendance_status: updated.attendance_status,
        dietary_type: updated.dietary_type,
        dietary_detail: updated.dietary_detail
    };
}
