/**
 * Phone number validation and normalization helper for Chilean & International numbers.
 */

export interface PhoneValidationResult {
  valid: boolean;
  normalized: string | null;
  error?: string;
}

export function validateAndNormalizePhone(input: string | null | undefined): PhoneValidationResult {
  if (!input || input.trim() === '') {
    return { valid: true, normalized: null };
  }

  const trimmed = input.trim();
  const cleaned = trimmed.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+569') && cleaned.length === 12 && /^\+569\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }

  if (cleaned.startsWith('569') && cleaned.length === 11 && /^569\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: `+${cleaned}` };
  }

  if (cleaned.length === 9 && /^9\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: `+56${cleaned}` };
  }

  if (/^\+\d{7,15}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }

  return {
    valid: false,
    normalized: null,
    error: 'Número de teléfono inválido. Ingrese un formato válido (Ej: +56 9 1234 5678 o 912345678).'
  };
}
