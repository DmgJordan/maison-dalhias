import { computed, ref, type ComputedRef, type Ref } from 'vue';
import {
  validate,
  type ValidationResult,
  type ValidationRule,
  type ValidationSchema,
} from '../utils/validation';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UseFormValidationOptions<T extends {}> {
  schema: ValidationSchema<T>;
  formData: Ref<T> | ComputedRef<T> | (() => T);
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UseFormValidationReturn<T extends {}> {
  errors: ComputedRef<Partial<Record<keyof T, ValidationResult>>>;
  touched: Ref<Partial<Record<keyof T, boolean>>>;
  visibleErrors: ComputedRef<Partial<Record<keyof T, ValidationResult>>>;
  isValid: ComputedRef<boolean>;
  touchField(field: keyof T): void;
  touchAll(): void;
  resetTouched(): void;
  attemptSubmit(): boolean;
  fieldError(field: keyof T): ValidationResult;
  hasFieldError(field: keyof T): boolean;
  errorId(field: keyof T): string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function useFormValidation<T extends {}>(
  options: UseFormValidationOptions<T>
): UseFormValidationReturn<T> {
  const { schema, formData } = options;
  const touched = ref<Partial<Record<keyof T, boolean>>>({}) as Ref<
    Partial<Record<keyof T, boolean>>
  >;
  const submitAttempted = ref(false);

  const getData = (): T => {
    if (typeof formData === 'function') {
      return (formData as () => T)();
    }
    return formData.value;
  };

  const errors = computed((): Partial<Record<keyof T, ValidationResult>> => {
    const data = getData();
    const result: Partial<Record<keyof T, ValidationResult>> = {};

    for (const key of Object.keys(schema) as (keyof T)[]) {
      const rules = schema[key] as ValidationRule<T[keyof T]>[] | undefined;
      if (rules) {
        result[key] = validate(data[key], rules);
      }
    }

    return result;
  });

  const visibleErrors = computed((): Partial<Record<keyof T, ValidationResult>> => {
    const result: Partial<Record<keyof T, ValidationResult>> = {};

    for (const key of Object.keys(schema) as (keyof T)[]) {
      if (touched.value[key] || submitAttempted.value) {
        result[key] = errors.value[key] ?? null;
      } else {
        result[key] = null;
      }
    }

    return result;
  });

  const isValid = computed((): boolean => {
    return Object.values(errors.value).every((error) => error === null);
  });

  function touchField(field: keyof T): void {
    touched.value = { ...touched.value, [field]: true };
  }

  function touchAll(): void {
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    for (const key of Object.keys(schema) as (keyof T)[]) {
      allTouched[key] = true;
    }
    touched.value = allTouched;
    submitAttempted.value = true;
  }

  function resetTouched(): void {
    touched.value = {};
    submitAttempted.value = false;
  }

  function attemptSubmit(): boolean {
    touchAll();
    return isValid.value;
  }

  function fieldError(field: keyof T): ValidationResult {
    return visibleErrors.value[field] ?? null;
  }

  function hasFieldError(field: keyof T): boolean {
    return !!visibleErrors.value[field];
  }

  function errorId(field: keyof T): string {
    return `error-${String(field)}`;
  }

  return {
    errors,
    touched,
    visibleErrors,
    isValid,
    touchField,
    touchAll,
    resetTouched,
    attemptSubmit,
    fieldError,
    hasFieldError,
    errorId,
  };
}
