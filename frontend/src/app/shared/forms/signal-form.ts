import { computed, signal } from '@angular/core';
import { z } from 'zod';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldErrors = string[];

export interface SignalField<T> {
  /** The current value of the field */
  value: ReturnType<typeof signal<T>>;
  /** Whether the field has been interacted with */
  touched: ReturnType<typeof signal<boolean>>;
  /** Zod validation errors — only populated after touch or submit attempt */
  errors: ReturnType<typeof computed<FieldErrors>>;
  /** True when touched and there are errors */
  invalid: ReturnType<typeof computed<boolean>>;
}

export type SignalFormFields<T extends Record<string, unknown>> = {
  [K in keyof T]: SignalField<T[K]>;
};

export interface SignalForm<T extends Record<string, unknown>> {
  fields: SignalFormFields<T>;
  /** True when all fields are valid (regardless of touched state) */
  valid: ReturnType<typeof computed<boolean>>;
  /** Mark all fields as touched (call before submit to show all errors) */
  markAllTouched(): void;
  /** Returns typed value if valid, null if invalid */
  getValue(): T | null;
  /** Reset all fields to initial values and clear touched state */
  reset(values?: Partial<T>): void;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Creates a fully signal-based form driven by a Zod object schema.
 *
 * @example
 * const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
 * const form = createSignalForm(schema, { email: '', password: '' });
 *
 * // In template:
 * // [value]="form.fields.email.value()"
 * // (input)="form.fields.email.value.set($event.target.value); form.fields.email.touched.set(true)"
 */
export function createSignalForm<T extends Record<string, unknown>>(
  schema: z.ZodObject<{ [K in keyof T]: z.ZodType<T[K]> }>,
  initialValues: T,
): SignalForm<T> {
  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const keys = Object.keys(shape) as (keyof T)[];

  // Build one SignalField per key
  const fields = {} as SignalFormFields<T>;

  for (const key of keys) {
    const fieldSchema = shape[key as string];
    const value = signal<T[typeof key]>(initialValues[key]);
    const touched = signal(false);

    const errors = computed<FieldErrors>(() => {
      if (!touched()) return [];
      const result = fieldSchema.safeParse(value());
      if (result.success) return [];
      return result.error.issues.map(i => i.message);
    });

    const invalid = computed(() => errors().length > 0);

    (fields as Record<string, SignalField<unknown>>)[key as string] = {
      value,
      touched,
      errors,
      invalid,
    };
  }

  // Form-level validity: validate ALL fields against the full schema
  const valid = computed<boolean>(() => {
    const snapshot = {} as Record<string, unknown>;
    for (const key of keys) {
      snapshot[key as string] = fields[key].value();
    }
    return schema.safeParse(snapshot).success;
  });

  function markAllTouched(): void {
    for (const key of keys) {
      fields[key].touched.set(true);
    }
  }

  function getValue(): T | null {
    const snapshot = {} as Record<string, unknown>;
    for (const key of keys) {
      snapshot[key as string] = fields[key].value();
    }
    const result = schema.safeParse(snapshot);
    return result.success ? (result.data as T) : null;
  }

  function reset(values?: Partial<T>): void {
    for (const key of keys) {
      const v = values ? values[key] ?? initialValues[key] : initialValues[key];
      fields[key].value.set(v as T[typeof key]);
      fields[key].touched.set(false);
    }
  }

  return { fields, valid, markAllTouched, getValue, reset };
}
