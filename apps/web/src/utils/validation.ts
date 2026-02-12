export type ValidationResult = string | null;
export type ValidationRule<T = unknown> = (value: T) => ValidationResult;
export type ValidationSchema<T> = Partial<Record<keyof T, ValidationRule<T[keyof T]>[]>>;

export function validate<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}

// --- Regles generiques ---

export function required(message = 'Ce champ est obligatoire'): ValidationRule {
  return (value: unknown): ValidationResult => {
    if (value === null || value === undefined) return message;
    if (typeof value === 'string' && value.trim() === '') return message;
    if (typeof value === 'number' && isNaN(value)) return message;
    return null;
  };
}

export function minLength(length: number, message?: string): ValidationRule<string> {
  return (value: string): ValidationResult => {
    if (typeof value !== 'string') return null;
    if (value.trim().length < length) {
      return message ?? `Minimum ${String(length)} caractères`;
    }
    return null;
  };
}

export function maxLength(length: number, message?: string): ValidationRule<string> {
  return (value: string): ValidationResult => {
    if (typeof value !== 'string') return null;
    if (value.trim().length > length) {
      return message ?? `Maximum ${String(length)} caractères`;
    }
    return null;
  };
}

export function min(minimum: number, message?: string): ValidationRule<number | string> {
  return (value: number | string): ValidationResult => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return null;
    if (num < minimum) {
      return message ?? `La valeur doit être au moins ${String(minimum)}`;
    }
    return null;
  };
}

export function max(maximum: number, message?: string): ValidationRule<number | string> {
  return (value: number | string): ValidationResult => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return null;
    if (num > maximum) {
      return message ?? `La valeur ne doit pas dépasser ${String(maximum)}`;
    }
    return null;
  };
}

export function pattern(regex: RegExp, message: string): ValidationRule<string> {
  return (value: string): ValidationResult => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    if (!regex.test(value)) return message;
    return null;
  };
}

export function custom<T>(fn: (value: T) => ValidationResult): ValidationRule<T> {
  return fn;
}

// --- Regles metier ---

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+33|0)[1-9](\d{2}){4}$/;
const POSTAL_CODE_REGEX = /^[A-Za-z0-9\s-]{2,10}$/;

export function email(message = "L'adresse email n'est pas valide"): ValidationRule<string> {
  return (value: string): ValidationResult => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    if (!EMAIL_REGEX.test(value)) return message;
    return null;
  };
}

export function phone(message = "Le numéro de téléphone n'est pas valide"): ValidationRule<string> {
  return (value: string): ValidationResult => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    if (!PHONE_REGEX.test(value.replace(/\s/g, ''))) return message;
    return null;
  };
}

export function postalCode(message = "Le code postal n'est pas valide"): ValidationRule<string> {
  return (value: string): ValidationResult => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    if (!POSTAL_CODE_REGEX.test(value)) return message;
    return null;
  };
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}
