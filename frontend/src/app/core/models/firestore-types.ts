import { Timestamp } from 'firebase/firestore';

// ── Activiteiten ──────────────────────────────────────────────────────────

// Mirrors functions/src/shared/types.ts:RecurrenceFrequency
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly-date' | 'monthly-day' | 'yearly';

// Mirrors functions/src/shared/types.ts:RecurrenceExclusionPeriod
export interface RecurrenceExclusionPeriod {
  startDate: string;
  endDate: string;
}

// Mirrors functions/src/shared/types.ts:RecurrenceRule
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  monthlyDayOccurrence?: number;
  monthlyDayOfWeek?: number;
  endsOn?: string | null;
  endsAfter?: number | null;
  exclusionPeriods?: RecurrenceExclusionPeriod[];
}

// Mirrors functions/src/shared/types.ts:RegistratiesZichtbaar
export type RegistratiesZichtbaar = 'iedereen' | 'aangemeld' | 'beheer';

// Mirrors functions/src/shared/types.ts:LocatieDoc
export interface LocatieDoc {
  id: string;
  naam: string;
  adres: string | null;
  kaartLink: string | null;
  notities: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// Mirrors functions/src/shared/types.ts:ActiviteitDoc
export interface ActiviteitDoc {
  id: string;
  titel: string;
  beschrijving: string | null;
  startDatumTijd: string;
  eindDatumTijd: string;
  locatieId: string | null;
  locatieNaam: string | null;
  locatieVrij: string | null;
  bannerUrl: string | null;
  organisatorId: string | null;
  organisatorNaam: string | null;
  organisatorLeden: string[];
  organisatorGroepId: string | null;
  inschrijvingenActief: boolean;
  maxDeelnemers: number | null;
  registratiesZichtbaar: RegistratiesZichtbaar;
  gasten: boolean;
  maxGastenPerInschrijving: number | null;
  gastKosten: number | null;
  lidKosten: number | null;
  isHerhalend: boolean;
  recurrenceRule: RecurrenceRule | null;
  isPubliek: boolean;
  threadId: string | null;
  groepId: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdByUid: string;
}

// Mirrors functions/src/shared/types.ts:OccurrenceStatus
export type OccurrenceStatus = 'modified' | 'cancelled';

// Mirrors functions/src/shared/types.ts:ActiviteitOccurrenceDoc
export interface ActiviteitOccurrenceDoc {
  id: string;
  activiteitId: string;
  occurrenceDatum: string;
  status: OccurrenceStatus;
  titel?: string;
  beschrijving?: string | null;
  startDatumTijd?: string;
  eindDatumTijd?: string;
  locatieId?: string | null;
  locatieNaam?: string | null;
  locatieVrij?: string | null;
  bannerUrl?: string | null;
  maxDeelnemers?: number | null;
  notitie?: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// Mirrors functions/src/shared/types.ts:ActiviteitRegistratieDoc
export interface ActiviteitRegistratieDoc {
  id: string;
  activiteitId: string;
  occurrenceDatum: string;
  memberId: string;
  memberUid: string | null;
  memberNaam: string;
  aantalGasten: number;
  opmerking: string | null;
  status: 'aangemeld' | 'afgemeld' | 'aanwezig' | 'afwezig';
  createdAt: string;
  updatedAt: string | null;
}

// ── Leden ──────────────────────────────────────────────────────────────────

// Mirrors functions/src/shared/types.ts:MemberDoc
export interface MemberDoc {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  joinDate: string;
  endOfMembership: string | null;
  isActive: boolean;
  isValidated: boolean;
  avatarUrl: string | null;
  verzorgerIds: string[];
  createdAt: string;
  updatedAt: string | null;
}

// ── Brevetten ──────────────────────────────────────────────────────────────

// Mirrors functions/src/shared/types.ts:DashboardWidgetConfig
export interface DashboardWidgetConfig {
  id: string;
  visible: boolean;
  collapsed: boolean;
}

// Mirrors functions/src/shared/types.ts:BrevetDoc
export interface BrevetDoc {
  id: string;
  memberId: string;
  brevetType: string;
  organisatie: string;
  organisatieNaam: string | null;
  niveau: string;
  behaaldDatum: string | null;
  notities: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// ── Brevet types ──────────────────────────────────────────────────────────

// Mirrors functions/src/shared/types.ts:BrevetTypeDoc
export interface BrevetTypeDoc {
  id: string;
  organisatie: string;
  naam: string;
  volgorde: number;
}

// ── Specialty types ───────────────────────────────────────────────────────

// Mirrors functions/src/shared/types.ts:SpecialtyTypeDoc
export interface SpecialtyTypeDoc {
  id: string;
  organisatie: string;
  naam: string;
  volgorde: number;
}

// ── Materiaal ─────────────────────────────────────────────────────────────

// Mirrors functions/src/shared/types.ts:CustomFieldDef
export interface CustomFieldDef {
  key: string;
  label: string;
}

// Mirrors functions/src/shared/types.ts:MateriaalTypeDoc
export interface MateriaalTypeDoc {
  id: string;
  naam: string;
  beschrijving: string | null;
  volgorde: number;
  maxLeningenPerLid: number | null;
  huurprijs: number | null;
  borg: number | null;
  customProperties: CustomFieldDef[] | null;
  createdAt: string;
  updatedAt: string | null;
}

// Mirrors functions/src/shared/types.ts:MateriaalDoc
export interface MateriaalDoc {
  id: string;
  materiaalTypeId: string;
  naam: string;
  serienummer: string | null;
  notities: string | null;
  aankoopDatum: string | null;
  actief: boolean;
  customProperties: Record<string, string> | null;
  createdAt: string;
  updatedAt: string | null;
}

// ── Leningen ──────────────────────────────────────────────────────────────

// Mirrors functions/src/shared/types.ts:LeningDoc
export interface LeningDoc {
  id: string;
  materiaalId: string;
  materiaalTypeId: string;
  materiaalNaam: string;
  materiaalTypeNaam: string;
  memberId: string;
  memberUserId: string;
  memberNaam: string;
  uitgeleendDatum: string;
  retourdatum: string | null;
  notities: string | null;
  createdAt: string;
}

// ── Berichten (thread-based) ──────────────────────────────────────────────

// Mirrors functions/src/shared/types.ts:ThreadDoc
export interface ThreadDoc {
  id: string;
  groepId: string;
  title: string;
  authorUid: string;
  authorName: string;
  pinnedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt: Timestamp | null;
  lastMessageBody: string;
  messageCount: number;
  unreadPerUser: { [uid: string]: number };
  threadSeenCount: number;
  threadSeenByUids: string[];
}

// Mirrors functions/src/shared/types.ts:MessageDoc
export interface MessageDoc {
  id: string;
  threadId: string;
  groepId: string;
  authorUid: string;
  authorName: string;
  body: string;
  status: 'concept' | 'gepubliceerd';
  pinnedAt: Timestamp | null;
  deletedAt: Timestamp | null;
  replyToId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Mirrors functions/src/shared/types.ts:ThreadConceptDoc
export interface ThreadConceptDoc {
  id: string;
  groepId: string;
  authorUid: string;
  authorName: string;
  title: string;
  body: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
