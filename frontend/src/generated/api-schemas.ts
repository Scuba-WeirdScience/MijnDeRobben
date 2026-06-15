/**
 * API Schemas — single source of truth for all request/response types.
 *
 * These Zod schemas mirror the .NET DTOs exactly.
 * Run `npm run generate:api` (requires the gateway to be running) to
 * regenerate from the live OpenAPI spec and verify alignment.
 *
 * Inferred TypeScript types are re-exported so consumers never import
 * raw interfaces — they always derive from the schema.
 */

import { z } from 'zod';

// ── Auth (api-gateway: AuthController) ───────────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail is verplicht')
    .email('Ongeldig e-mailadres'),
  password: z
    .string()
    .min(1, 'Wachtwoord is verplicht'),
  geboortedatum: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn')
    .optional(),
});

/** Returned by POST /auth/login when the account is not yet validated. */
export const ValidationRequiredResponseSchema = z.object({
  error: z.literal('ValidationRequired'),
  requiresValidation: z.literal(true),
});

export type ValidationRequiredResponse = z.infer<typeof ValidationRequiredResponseSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.string().default('Bearer'),
});

export const RegisterRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail is verplicht')
    .email('Ongeldig e-mailadres'),
  password: z
    .string()
    .min(8, 'Wachtwoord moet minimaal 8 tekens bevatten')
    .regex(/[A-Z]/, 'Wachtwoord moet minimaal één hoofdletter bevatten')
    .regex(/[0-9]/, 'Wachtwoord moet minimaal één cijfer bevatten'),
  roles: z.array(z.string()).optional(),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── Roles (api-gateway: RolesController) ─────────────────────────────────────

export const AssignRoleSchema = z.object({
  role: z.string().min(1, 'Rol is verplicht'),
});

// ── Members (member-api: MembersController, proxied via gateway) ──────────────

export const MemberSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string(), // ISO date string (DateOnly serialised as string)
  joinDate: z.string(),    // ISO date string
  isActive: z.boolean(),
  isValidated: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

export const CreateMemberSchema = z.object({
  userId: z
    .string()
    .min(1, 'UserId is verplicht'),
  firstName: z
    .string()
    .min(1, 'Voornaam is verplicht')
    .max(100, 'Voornaam mag maximaal 100 tekens bevatten'),
  lastName: z
    .string()
    .min(1, 'Achternaam is verplicht')
    .max(100, 'Achternaam mag maximaal 100 tekens bevatten'),
  dateOfBirth: z
    .string()
    .min(1, 'Geboortedatum is verplicht')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn'),
  joinDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn')
    .optional(),
  isActive: z.boolean().optional(),
});

export const UpdateMemberSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Voornaam is verplicht')
    .max(100, 'Voornaam mag maximaal 100 tekens bevatten')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Achternaam is verplicht')
    .max(100, 'Achternaam mag maximaal 100 tekens bevatten')
    .optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn')
    .optional(),
  joinDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn')
    .optional(),
  isActive: z.boolean().optional(),
});

export const PagedResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  });

export const MemberPagedResultSchema = PagedResultSchema(MemberSchema);

// ── Member form schema (used by member-form component) ────────────────────────
// Explicit schema covering all editable fields with full validation rules.
// Note: email is NOT part of this form — it is managed on ApplicationUser via the gateway.
// userId is optional here; it is required for create but injected by the form for new members.
export const MemberFormSchema = z.object({
  userId: z
    .string()
    .min(1, 'Gateway gebruiker is verplicht')
    .optional(),
  firstName: z
    .string()
    .min(1, 'Voornaam is verplicht')
    .max(100, 'Voornaam mag maximaal 100 tekens bevatten'),
  lastName: z
    .string()
    .min(1, 'Achternaam is verplicht')
    .max(100, 'Achternaam mag maximaal 100 tekens bevatten'),
  dateOfBirth: z
    .string()
    .min(1, 'Geboortedatum is verplicht')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn'),
  joinDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn')
    .or(z.literal(''))
    .default(''),
  isActive: z.boolean(),
});

export type MemberFormValue = z.infer<typeof MemberFormSchema>;

// ── Inferred TypeScript types (derive from schema — never write by hand) ──────

export type LoginRequest    = z.infer<typeof LoginRequestSchema>;
export type LoginResponse   = z.infer<typeof LoginResponseSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type AssignRole      = z.infer<typeof AssignRoleSchema>;

export type Member              = z.infer<typeof MemberSchema>;
export type CreateMemberRequest = z.infer<typeof CreateMemberSchema>;
export type UpdateMemberRequest = z.infer<typeof UpdateMemberSchema>;
export type PagedResult<T>      = { items: T[]; total: number; page: number; pageSize: number };

// ── Brevetten (member-api: BrevettensController, proxied via gateway) ─────────

/** Valid organisatie values — must match BrevetOrganisatie enum in backend. */
export const ORGANISATIES = ['CMAS', 'PADI', 'SSI', 'NELOS', 'NOB', 'Anders'] as const;
export type Organisatie = typeof ORGANISATIES[number];

/** Brevet types — distinguishes a standard brevet from a specialty course. */
export const BREVET_TYPES = ['Brevet', 'Specialiteit'] as const;
export type BrevetType = typeof BREVET_TYPES[number];

/** Niveau options per organisatie. */
export const NIVEAUS_PER_ORGANISATIE: Record<Organisatie, string[]> = {
  CMAS:   ['1-ster', '2-ster', '3-ster', 'Instructeur'],
  PADI:   ['Open Water', 'Advanced Open Water', 'Rescue Diver', 'Divemaster', 'Instructor'],
  SSI:    ['Open Water', 'Advanced Open Water', 'Rescue Diver', 'Divemaster', 'Instructor'],
  NELOS:  ['Niveau 1', 'Niveau 2', 'Niveau 3', 'Instructeur'],
  NOB:    ['Niveau 1', 'Niveau 2', 'Niveau 3', 'Niveau 4', 'Instructeur'],
  Anders: [],  // free text
};

export const BrevetSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  organisatie: z.string(),
  organisatieNaam: z.string().nullable().optional(),
  niveau: z.string(),
  brevetType: z.enum(BREVET_TYPES).default('Brevet'),
  behaaldDatum: z.string().nullable().optional(),
  notities: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
});

export const CreateBrevetSchema = z.object({
  organisatie: z.enum(ORGANISATIES, { error: 'Organisatie is verplicht' }),
  organisatieNaam: z.string().max(100).nullable().optional(),
  niveau: z.string().min(1, 'Niveau is verplicht').max(100),
  brevetType: z.enum(BREVET_TYPES).default('Brevet'),
  behaaldDatum: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn')
    .nullable()
    .optional(),
  notities: z.string().max(500).nullable().optional(),
});

export const UpdateBrevetSchema = CreateBrevetSchema;

export type Brevet               = z.infer<typeof BrevetSchema>;
export type CreateBrevetRequest  = z.infer<typeof CreateBrevetSchema>;
export type UpdateBrevetRequest  = z.infer<typeof UpdateBrevetSchema>;

// ── SpecialtyTypes (member-api: SpecialtyTypesController, proxied via gateway) ─

export const SpecialtyTypeSchema = z.object({
  id: z.string().uuid(),
  organisatie: z.enum(ORGANISATIES),
  naam: z.string(),
  volgorde: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
});

export const CreateSpecialtyTypeSchema = z.object({
  organisatie: z.enum(ORGANISATIES, { error: 'Organisatie is verplicht' }),
  naam: z.string().min(1, 'Naam is verplicht').max(200, 'Naam mag maximaal 200 tekens bevatten'),
  volgorde: z.number().int().min(0).default(0),
});

export const UpdateSpecialtyTypeSchema = CreateSpecialtyTypeSchema;

export type SpecialtyType               = z.infer<typeof SpecialtyTypeSchema>;
export type CreateSpecialtyTypeRequest  = z.infer<typeof CreateSpecialtyTypeSchema>;
export type UpdateSpecialtyTypeRequest  = z.infer<typeof UpdateSpecialtyTypeSchema>;

// ── BrevetTypeDefinitions (member-api: BrevetTypeDefinitionsController, proxied via gateway) ─
// NOTE: Named BrevetTypeDefinition (not BrevetType) to avoid collision with
//       the existing BrevetType = 'Brevet' | 'Specialiteit' enum above.

export const BrevetTypeDefinitionSchema = z.object({
  id: z.string().uuid(),
  organisatie: z.enum(ORGANISATIES),
  naam: z.string(),
  volgorde: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
});

export const CreateBrevetTypeDefinitionSchema = z.object({
  organisatie: z.enum(ORGANISATIES, { error: 'Organisatie is verplicht' }),
  naam: z.string().min(1, 'Naam is verplicht').max(200, 'Naam mag maximaal 200 tekens bevatten'),
  volgorde: z.number().int().min(0).default(0),
});

export const UpdateBrevetTypeDefinitionSchema = CreateBrevetTypeDefinitionSchema;

export type BrevetTypeDef                    = z.infer<typeof BrevetTypeDefinitionSchema>;
export type CreateBrevetTypeDefRequest       = z.infer<typeof CreateBrevetTypeDefinitionSchema>;
export type UpdateBrevetTypeDefRequest       = z.infer<typeof UpdateBrevetTypeDefinitionSchema>;

// ── MemberOrganisaties (member-api: MemberOrganisatiesController, proxied via gateway) ─

/**
 * Organisations that support a logbook/member number.
 * Anders is intentionally excluded — no logbook number applicable.
 */
export const ORGANISATIES_MET_LOGBOEK = ['CMAS', 'PADI', 'SSI', 'NELOS', 'NOB'] as const;
export type OrganisatieMetLogboek = typeof ORGANISATIES_MET_LOGBOEK[number];

/** Nested brevet summary returned inside MemberOrganisatieDto. */
export const BrevetSummarySchema = z.object({
  id: z.string().uuid(),
  brevetType: z.enum(BREVET_TYPES),
  niveau: z.string(),
  behaaldDatum: z.string().nullable().optional(),
  notities: z.string().nullable().optional(),
});

export const MemberOrganisatieSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  organisatie: z.enum(ORGANISATIES_MET_LOGBOEK),
  logboeknummer: z.string().nullable().optional(),
  beginDatum: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
  brevetten: z.array(BrevetSummarySchema),
});

export const CreateMemberOrganisatieSchema = z.object({
  organisatie: z.enum(ORGANISATIES_MET_LOGBOEK, { error: 'Organisatie is verplicht' }),
  logboeknummer: z.string().max(100).nullable().optional(),
  beginDatum: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn')
    .nullable()
    .optional(),
});

export const UpdateMemberOrganisatieSchema = z.object({
  logboeknummer: z.string().max(100).nullable().optional(),
  beginDatum: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn')
    .nullable()
    .optional(),
});

export type BrevetSummary                      = z.infer<typeof BrevetSummarySchema>;
export type MemberOrganisatie                  = z.infer<typeof MemberOrganisatieSchema>;
export type CreateMemberOrganisatieRequest     = z.infer<typeof CreateMemberOrganisatieSchema>;
export type UpdateMemberOrganisatieRequest     = z.infer<typeof UpdateMemberOrganisatieSchema>;

// ── MateriaalTypes & Materialen (member-api: MateriaalTypesController, MaterialenController) ──

export const CustomPropertyDefSchema = z.object({
  key: z.string().min(1, 'Veldsleutel is verplicht').max(50),
  label: z.string().min(1, 'Veldlabel is verplicht').max(100),
});

export const MateriaalSchema = z.object({
  id: z.string().uuid(),
  materiaalTypeId: z.string().uuid(),
  naam: z.string(),
  serienummer: z.string().nullable().optional(),
  notities: z.string().nullable().optional(),
  aankoopDatum: z.string().nullable().optional(),
  /** True if this item is currently on loan. */
  actief: z.boolean(),
  /** Key-value pairs for dynamic properties, keyed by the CustomPropertyDef key. */
  customProperties: z.record(z.string(), z.string()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
});

export const CreateMateriaalSchema = z.object({
  materiaalTypeId: z.string().uuid({ message: 'Type is verplicht' }),
  naam: z.string().min(1, 'Naam is verplicht').max(100, 'Naam mag maximaal 100 tekens bevatten'),
  serienummer: z.string().max(100).nullable().optional(),
  notities: z.string().max(500).nullable().optional(),
  aankoopDatum: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet in formaat JJJJ-MM-DD zijn')
    .nullable()
    .optional(),
  /** Dynamic property values keyed by field key. */
  customProperties: z.record(z.string(), z.string()).nullable().optional(),
});

export const UpdateMateriaalSchema = CreateMateriaalSchema;

export const MateriaalTypeSchema = z.object({
  id: z.string().uuid(),
  naam: z.string(),
  beschrijving: z.string().nullable().optional(),
  volgorde: z.number().int(),
  maxLeningenPerLid: z.number().int().nullable().optional(),
  /** Huurprijs per dag/gebruik in euro. Null = gratis. */
  huurprijs: z.number().nullable().optional(),
  /** Borgbedrag in euro. Null = geen borg. */
  borg: z.number().nullable().optional(),
  /** Dynamic field definitions for this type. */
  customProperties: z.array(CustomPropertyDefSchema).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
});

export const CreateMateriaalTypeSchema = z.object({
  naam: z.string().min(1, 'Naam is verplicht').max(100, 'Naam mag maximaal 100 tekens bevatten'),
  beschrijving: z.string().max(500).nullable().optional(),
  volgorde: z.number().int().min(0).optional(),
  maxLeningenPerLid: z.number().int().min(0).nullable().optional(),
  /** Huurprijs per dag/gebruik in euro. Null = gratis. */
  huurprijs: z.number().nullable().optional(),
  /** Borgbedrag in euro. Null = geen borg. */
  borg: z.number().nullable().optional(),
  /** Dynamic field definitions for this type. */
  customProperties: z.array(CustomPropertyDefSchema).nullable().optional(),
});

export const UpdateMateriaalTypeSchema = CreateMateriaalTypeSchema;

export const MateriaalTypeWithMaterialenSchema = MateriaalTypeSchema.extend({
  materialen: z.array(MateriaalSchema),
});

export type CustomPropertyDef              = z.infer<typeof CustomPropertyDefSchema>;
export type Materiaal                       = z.infer<typeof MateriaalSchema>;
export type CreateMateriaalRequest         = z.infer<typeof CreateMateriaalSchema>;
export type UpdateMateriaalRequest         = z.infer<typeof UpdateMateriaalSchema>;
export type MateriaalType                  = z.infer<typeof MateriaalTypeSchema>;
export type CreateMateriaalTypeRequest     = z.infer<typeof CreateMateriaalTypeSchema>;
export type UpdateMateriaalTypeRequest     = z.infer<typeof UpdateMateriaalTypeSchema>;
export type MateriaalTypeWithMaterialen    = z.infer<typeof MateriaalTypeWithMaterialenSchema>;

// ── MateriaalLening (lening/leen) ────────────────────────────────────────────────

export const MijnLeningSchema = z.object({
  id: z.string().uuid(),
  materiaalId: z.string().uuid(),
  materiaalNaam: z.string(),
  materiaalTypeNaam: z.string().nullable().optional(),
  serienummer: z.string().nullable().optional(),
  uitgeleendDatum: z.string(),
  createdAt: z.string(),
});

export const MateriaalLeningStatusSchema = z.object({
  isLent: z.boolean(),
  huidigeLeningId: z.string().uuid().nullable().optional(),
  huidigeLenerNaam: z.string().nullable().optional(),
  uitgeleendDatum: z.string().nullable().optional(),
  isMijnLening: z.boolean(),
  message: z.string().nullable().optional(),
  materiaalNaam: z.string().nullable().optional(),
  materiaalTypeNaam: z.string().nullable().optional(),
});

export const TakeLeningSchema = z.object({
  materiaalId: z.string().uuid(),
});

export const ReturnLeningSchema = z.object({
  notities: z.string().max(500).nullable().optional(),
});

export const LeningSchema = z.object({
  id: z.string().uuid(),
  materiaalId: z.string().uuid(),
  materiaalNaam: z.string(),
  memberId: z.string().uuid(),
  memberNaam: z.string().nullable().optional(),
  /** Minimal member info for display — avatar + name. */
  member: z.object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().nullable().optional(),
  }).nullable().optional(),
  uitgeleendDatum: z.string(),
  retourdatum: z.string().nullable().optional(),
  notities: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type MijnLening = z.infer<typeof MijnLeningSchema>;
export type MateriaalLeningStatus = z.infer<typeof MateriaalLeningStatusSchema>;
export type TakeLeningRequest = z.infer<typeof TakeLeningSchema>;
export type ReturnLeningRequest = z.infer<typeof ReturnLeningSchema>;
export type Lening = z.infer<typeof LeningSchema>;
