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

// ── Lookup Types (shared: brevet types, specialty types) ──────────────────
// Single canonical schema for all "organisatie + naam + volgorde" lookup tables.
// specialtyTypeSchema and brevetTypeDefFormSchema are kept as aliases for
// existing consumers while the generic LookupTypeManagementComponent uses this.

export const lookupTypeFormSchema = z.object({
  organisatie: z.string().min(1, 'Organisatie is verplicht.'),
  naam: z.string().min(1, 'Naam is verplicht.').max(200, 'Max 200 tekens.'),
  volgorde: z.coerce.number().int().min(0, 'Moet >= 0 zijn.'),
});

export type LookupTypeForm = z.infer<typeof lookupTypeFormSchema>;

/** @deprecated Use lookupTypeFormSchema */
export const specialtyTypeSchema = lookupTypeFormSchema;
export type SpecialtyTypeForm = LookupTypeForm;

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

/** @deprecated Use lookupTypeFormSchema */
export const brevetTypeDefFormSchema = lookupTypeFormSchema;
export type BrevetTypeDefForm = LookupTypeForm;

// ── Locatie ────────────────────────────────────────────────────────────────

export const locatieFormSchema = z.object({
  naam: z.string().min(1, 'Naam is verplicht.').max(200, 'Max 200 tekens.'),
  adres: z.string().optional(),
  kaartLink: z.string().optional(),
  notities: z.string().optional(),
});

export type LocatieForm = z.infer<typeof locatieFormSchema>;

// ── Activiteit ─────────────────────────────────────────────────────────────

export const activiteitFormSchema = z.object({
  titel: z.string().min(1, 'Titel is verplicht.').max(200, 'Max 200 tekens.'),
  startDatumTijd: z.string().min(1, 'Startdatum is verplicht.'),
  eindDatumTijd: z.string().optional(),
  locatieId: z.string().nullable().optional(),
  locatieVrij: z.string().nullable().optional(),
  beschrijving: z.string().optional(),
  inschrijvingenActief: z.boolean().default(false),
  isPubliek: z.boolean().default(false),
  maxDeelnemers: z.coerce.number().int().min(1).nullable().optional(),
  registratiesZichtbaar: z.enum(['iedereen', 'aangemeld', 'beheer']).default('iedereen'),
  gasten: z.boolean().default(false),
  maxGastenPerInschrijving: z.coerce.number().int().min(0).nullable().optional(),
  gastKosten: z.coerce.number().min(0).nullable().optional(),
  lidKosten: z.coerce.number().min(0).nullable().optional(),
  organisatorId: z.string().nullable().optional(),
  organisatorLeden: z.array(z.string()).default([]),
  organisatorGroepId: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  threadId: z.string().nullable().optional(),
  groepId: z.string().nullable().optional(),
  nieuweThreadTitel: z.string().nullable().optional(),
  nieuweThreadBericht: z.string().nullable().optional(),
});

export type ActiviteitForm = z.infer<typeof activiteitFormSchema>;

// ── Activiteit Occurrence Edit ─────────────────────────────────────────────

export const occurrenceEditFormSchema = z.object({
  titel:          z.string().min(1, 'Titel is verplicht.').max(200, 'Max 200 tekens.'),
  startDatumTijd: z.string().min(1, 'Startdatum is verplicht.'),
  eindDatumTijd:  z.string().min(1, 'Einddatum is verplicht.'),
  locatieId:      z.string().nullable().optional(),
  locatieVrij:    z.string().nullable().optional(),
  beschrijving:   z.string().nullable().optional(),
  bannerUrl:      z.string().nullable().optional(),
  maxDeelnemers:  z.coerce.number().int().min(1).nullable().optional(),
  notitie:        z.string().nullable().optional(),
});

export type OccurrenceEditForm = z.infer<typeof occurrenceEditFormSchema>;
