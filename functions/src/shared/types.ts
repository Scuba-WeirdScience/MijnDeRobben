// ── Firestore document shapes ───────────────────────────────────────────────
// These mirror the SQL models exactly so the migration script can map 1:1.

export interface UserDoc {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;   // ISO date string yyyy-MM-dd
  joinDate: string;
  endOfMembership: string | null;
  isActive: boolean;
  isValidated: boolean;
  avatarUrl: string | null;
  unreadCount: number;          // maintained by Cloud Function triggers
  unreadPerGroep: { [groepId: string]: number }; // per-group unread counts
  settings: string | null;      // JSON string, e.g. {"theme":"dark"}
  createdAt: string;
  updatedAt: string | null;
}

/** Parsed shape of UserDoc.settings */
export interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
}

export interface MemberDoc {
  id: string;
  userId: string;               // Firebase Auth UID
  email: string;                // Firebase Auth email (denormalised for list views)
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  joinDate: string;
  endOfMembership: string | null;
  isActive: boolean;
  isValidated: boolean;
  avatarUrl: string | null;
  verzorgerIds: string[];       // Firebase Auth UIDs of ouders/verzorgers
  createdAt: string;
  updatedAt: string | null;
}

export interface BrevetDoc {
  id: string;
  memberId: string;
  brevetType: string;           // 'Brevet' | 'Specialiteit'
  organisatie: string;
  organisatieNaam: string | null;
  niveau: string;
  behaaldDatum: string | null;
  notities: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface MemberOrganisatieDoc {
  id: string;
  memberId: string;
  organisatie: string;
  logboeknummer: string | null;
  beginDatum: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface BrevetTypeDoc {
  id: string;
  organisatie: string;
  naam: string;
  volgorde: number;
}

export interface SpecialtyTypeDoc {
  id: string;
  organisatie: string;
  naam: string;
  volgorde: number;
}

export interface MateriaalTypeDoc {
  id: string;
  naam: string;
  beschrijving: string | null;
  volgorde: number;
  maxLeningenPerLid: number | null;
  huurprijs: number | null;
  customProperties: CustomFieldDef[] | null;  // JSON field definitions
  createdAt: string;
  updatedAt: string | null;
}

export interface CustomFieldDef {
  key: string;
  label: string;
}

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

export interface LeningDoc {
  id: string;
  materiaalId: string;
  materiaalTypeId: string;
  materiaalNaam: string;
  materiaalTypeNaam: string;
  memberId: string;             // Firestore member doc ID
  memberUserId: string;         // Firebase Auth UID
  memberNaam: string;
  uitgeleendDatum: string;
  retourdatum: string | null;
  notities: string | null;
  createdAt: string;
}

export interface BerichtDoc {
  id: string;
  onderwerp: string;
  inhoud: string;
  isPinned: boolean;
  zenderId: string;             // Firestore member doc ID
  zenderNaam: string;
  zenderAvatarUrl: string | null;
  aangemaaktOp: string;
  bijgewerktOp: string | null;
}

export interface BerichtLeesDoc {
  memberId: string;
  gelezenOp: string;
}

// ── Groepen ────────────────────────────────────────────────────────────────────

export interface GroepDoc {
  id: string;
  name: string;
  description: string;
  memberUids: string[];
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
}

// ── New Berichten (group-based) ────────────────────────────────────────────────

export interface NieuwBerichtDoc {
  id: string;
  groepId: string | null;        // null = concept (group not yet chosen)
  authorUid: string;
  authorName: string;
  body: string;
  status: 'concept' | 'gepubliceerd';
  pinnedAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  deletedAt?: FirebaseFirestore.Timestamp | null;
}

export interface ReplyDoc {
  id: string;
  authorUid: string;
  authorName: string;
  body: string;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface LezingDoc {
  readAt: FirebaseFirestore.Timestamp;
}

// ── Thread-based messaging (v2) ──────────────────────────────────────────────

export interface ThreadDoc {
  id: string;
  groepId: string;
  title: string;
  authorUid: string;
  authorName: string;
  pinnedAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  lastMessageAt: FirebaseFirestore.Timestamp | null;
  lastMessageBody: string;
  messageCount: number;
  unreadPerUser: { [uid: string]: number };
  threadSeenCount: number;
  threadSeenByUids: string[];
}

export interface MessageDoc {
  id: string;
  threadId: string;
  groepId: string;
  authorUid: string;
  authorName: string;
  body: string;
  status: 'concept' | 'gepubliceerd';
  pinnedAt: FirebaseFirestore.Timestamp | null;
  deletedAt: FirebaseFirestore.Timestamp | null;
  replyToId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface MessageLezingDoc {
  readAt: FirebaseFirestore.Timestamp;
}

// ── Thread Concepten ──────────────────────────────────────────────────────────

export interface ThreadConceptDoc {
  id: string;
  groepId: string;
  authorUid: string;
  authorName: string;
  title: string;
  body: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// ── Activiteiten ──────────────────────────────────────────────────────────────

export interface LocatieDoc {
  id: string;
  naam: string;
  adres: string | null;
  kaartLink: string | null;         // Google Maps URL
  notities: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly-date' | 'monthly-day' | 'yearly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;                 // herhaal elke N dagen/weken/maanden/jaren
  daysOfWeek?: number[];            // weekly: weekdagen (0=Ma … 6=Zo)
  monthlyDayOccurrence?: number;    // monthly-day: 1..5 (5 = laatste)
  monthlyDayOfWeek?: number;        // monthly-day: 0..6
  endsOn?: string | null;           // ISO date yyyy-MM-dd (exclusief)
  endsAfter?: number | null;        // aantal occurrences waarna stopt
}

export type RegistratiesZichtbaar = 'iedereen' | 'aangemeld' | 'beheer';

export interface ActiviteitDoc {
  id: string;
  titel: string;
  beschrijving: string | null;      // HTML (Quill output)
  startDatumTijd: string;           // ISO datetime string (lokale tijd, geen Z)
  eindDatumTijd: string;
  locatieId: string | null;
  locatieNaam: string | null;       // gedenormaliseerd voor weergave
  locatieVrij: string | null;       // vrije tekst locatie (alternatief voor locatieId)
  bannerUrl: string | null;         // Firebase Storage URL
  organisatorId: string | null;     // Firestore member doc ID (legacy, backwards compat)
  organisatorNaam: string | null;   // gedenormaliseerd (legacy)
  organisatorLeden: string[];       // member UIDs (multiselect)
  organisatorGroepId: string | null; // berichten-groep als organisator

  // Inschrijvingen
  inschrijvingenActief: boolean;
  maxDeelnemers: number | null;
  registratiesZichtbaar: RegistratiesZichtbaar;
  gasten: boolean;
  maxGastenPerInschrijving: number | null;
  gastKosten: number | null;        // euro, null = gratis
  lidKosten: number | null;         // euro, null = gratis

  // Herhaling
  isHerhalend: boolean;
  recurrenceRule: RecurrenceRule | null;

  // Publiek (zichtbaar in ICS-feed)
  isPubliek: boolean;

  // Thread-koppeling
  threadId: string | null;
  groepId: string | null;

  createdAt: string;
  updatedAt: string | null;
  createdByUid: string;
}

// Document ID = `${activiteitId}_${occurrenceDatum}` (occurrenceDatum = yyyy-MM-dd originele datum)
export type OccurrenceStatus = 'modified' | 'cancelled';

export interface ActiviteitOccurrenceDoc {
  id: string;
  activiteitId: string;
  occurrenceDatum: string;          // yyyy-MM-dd — originele geplande datum
  status: OccurrenceStatus;

  // Overschreven velden (enkel aanwezig bij status='modified')
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

// Document ID = `${activiteitId}_${occurrenceDatum}_${memberId}`
export interface ActiviteitRegistratieDoc {
  id: string;
  activiteitId: string;
  occurrenceDatum: string;          // yyyy-MM-dd
  memberId: string;
  memberUid: string;
  memberNaam: string;
  aantalGasten: number;
  opmerking: string | null;
  status: 'aangemeld' | 'afgemeld' | 'aanwezig';
  createdAt: string;
  updatedAt: string | null;
}
