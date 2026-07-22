import crypto from 'crypto';

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

    const fullNameNormalized = normalizeName();

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
