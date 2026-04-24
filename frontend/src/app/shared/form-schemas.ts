/**
 * Zod validation schemas for Angular signal forms.
 *
 * Usage with Angular 21 signal forms:
 * ```typescript
 * import { form, schema } from '@angular/forms/signals';
 * import { specialtyTypeSchema } from './form-schemas';
 *
 * const model = signal({ organisatie: '', naam: '', volgorde: 0 });
 * const formState = form(model, schema(specialtyTypeSchema));
 * ```
 */
import { z } from 'zod';

// ── Specialty Types ────────────────────────────────────────────────────────

export const specialtyTypeSchema = z.object({
  organisatie: z.string().min(1, 'Organisatie is verplicht.'),
  naam: z.string().min(1, 'Naam is verplicht.').max(200, 'Max 200 tekens.'),
  volgorde: z.coerce.number().int().min(0, 'Moet >= 0 zijn.'),
});

export type SpecialtyTypeForm = z.infer<typeof specialtyTypeSchema>;

// ── Materiaal Types ────────────────────────────────────────────────────────

export const materiaalTypeFormSchema = z.object({
  naam: z.string().min(1, 'Naam is verplicht.').max(100, 'Max 100 tekens.'),
  beschrijving: z.string().max(500, 'Max 500 tekens.').optional(),
  volgorde: z.coerce.number().int().min(0, 'Moet >= 0 zijn.').default(0),
  maxLeningenPerLid: z.coerce.number().int().min(1).nullable().optional(),
  huurprijs: z.coerce.number().min(0).nullable().optional(),
});

export type MateriaalTypeForm = z.infer<typeof materiaalTypeFormSchema>;

// ── Materiaal ─────────────────────────────────────────────────────────────

export const materiaalFormSchema = z.object({
  naam: z.string().min(1, 'Naam is verplicht.').max(100, 'Max 100 tekens.'),
  serienummer: z.string().max(100).optional(),
  aankoopDatum: z.string().optional(),
  notities: z.string().max(500).optional(),
});

export type MateriaalForm = z.infer<typeof materiaalFormSchema>;

// ── Brevet Type Definitions ────────────────────────────────────────────────

export const brevetTypeDefFormSchema = z.object({
  organisatie: z.string().min(1, 'Organisatie is verplicht.'),
  naam: z.string().min(1, 'Naam is verplicht.').max(200, 'Max 200 tekens.'),
  volgorde: z.coerce.number().int().min(0, 'Moet >= 0 zijn.'),
});

export type BrevetTypeDefForm = z.infer<typeof brevetTypeDefFormSchema>;
