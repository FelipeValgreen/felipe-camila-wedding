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

  // Strip spaces, dashes, parentheses
  const cleaned = trimmed.replace(/[\s\-\(\)]/g, '');

  // Chilean formats check:
  // 1. +569XXXXXXXX (12 chars starting with +569)
  // 2. 569XXXXXXXX (11 digits starting with 569)
  // 3. 9XXXXXXXX (9 digits starting with 9)
  
  if (cleaned.startsWith('+569') && cleaned.length === 12 && /^\+569\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }

  if (cleaned.startsWith('569') && cleaned.length === 11 && /^569\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: `+${cleaned}` };
  }

  if (cleaned.length === 9 && /^9\d{8}$/.test(cleaned)) {
    return { valid: true, normalized: `+56${cleaned}` };
  }

  // Generic International E.164 format check (+ followed by 7-15 digits)
  if (/^\+\d{7,15}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }

  // If user entered numbers without +, attempt international parse if digit length is reasonable
  if (/^\d{8,15}$/.test(cleaned)) {
    // If 9 digits starting with 9, treat as Chile
    if (cleaned.length === 9 && cleaned.startsWith('9')) {
      return { valid: true, normalized: `+56${cleaned}` };
    }
  }

  return {
    valid: false,
    normalized: null,
    error: 'Número de teléfono inválido. Ingrese un formato válido (Ej: +56 9 1234 5678 o 912345678).'
  };
}
