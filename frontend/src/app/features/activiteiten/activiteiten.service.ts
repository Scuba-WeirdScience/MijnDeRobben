import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../core/firebase/callable';
import {
  RecurrenceFrequency, RecurrenceRule, RegistratiesZichtbaar,
  LocatieDoc, ActiviteitDoc, OccurrenceStatus,
  ActiviteitOccurrenceDoc, ActiviteitRegistratieDoc
} from '../../core/models/firestore-types';

// Re-export for components that import types from this service
export type {
  RecurrenceFrequency, RecurrenceRule, RegistratiesZichtbaar,
  LocatieDoc, ActiviteitDoc, OccurrenceStatus,
  ActiviteitOccurrenceDoc, ActiviteitRegistratieDoc
} from '../../core/models/firestore-types';

/** A fully resolved occurrence — ready for rendering */
export interface ResolvedOccurrence {
  activiteitId: string;
  occurrenceDatum: string;       // yyyy-MM-dd (originele datum)
  isOverridden: boolean;
  titel: string;
  beschrijving: string | null;
  startDatumTijd: string;
  eindDatumTijd: string;
  locatieId: string | null;
  locatieNaam: string | null;
  locatieVrij: string | null;
  bannerUrl: string | null;
  maxDeelnemers: number | null;
  inschrijvingenActief: boolean;
  registratiesZichtbaar: RegistratiesZichtbaar;
  gasten: boolean;
  maxGastenPerInschrijving: number | null;
  gastKosten: number | null;
  lidKosten: number | null;
  organisatorId: string | null;
  organisatorNaam: string | null;
  organisatorLeden: string[];
  organisatorGroepId: string | null;
  threadId: string | null;
  groepId: string | null;
  isPubliek: boolean;
}

export type EditScope = 'single' | 'future' | 'all';

// ── Request / Response types ──────────────────────────────────────────────────

export type CreateLocatieRequest = Omit<LocatieDoc, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateLocatieRequest = Partial<CreateLocatieRequest>;
export type CreateActiviteitRequest = Omit<ActiviteitDoc, 'id' | 'createdAt' | 'updatedAt' | 'createdByUid'>;
export type UpdateActiviteitRequest = {
  id: string;
  scope: EditScope;
  occurrenceDatum?: string;
} & Partial<ActiviteitDoc>;
export type DeleteActiviteitRequest = { id: string; scope: EditScope; occurrenceDatum?: string };

// ── Service ───────────────────────────────────────────────────────────────────

// Re-export the pure recurrence engine for components that need it
export { generateOccurrences } from './recurrence';

@Injectable({ providedIn: 'root' })
export class ActiviteitenService {

  // ── Locaties ────────────────────────────────────────────────────────────

  getLocaties(): Observable<LocatieDoc[]> {
    return from(call<void, LocatieDoc[]>('getLocaties'));
  }

  createLocatie(dto: CreateLocatieRequest): Observable<LocatieDoc> {
    return from(call<CreateLocatieRequest, LocatieDoc>('createLocatie', dto));
  }

  updateLocatie(id: string, dto: UpdateLocatieRequest): Observable<LocatieDoc> {
    return from(call<{ id: string } & UpdateLocatieRequest, LocatieDoc>('updateLocatie', { id, ...dto }));
  }

  deleteLocatie(id: string): Observable<{ success: boolean }> {
    return from(call<{ id: string }, { success: boolean }>('deleteLocatie', { id }));
  }

  // ── Activiteiten ─────────────────────────────────────────────────────────

  getActiviteiten(van?: string, tot?: string): Observable<ActiviteitDoc[]> {
    return from(call<{ van?: string; tot?: string }, ActiviteitDoc[]>('getActiviteiten', { van, tot }));
  }

  getAllActiviteiten(): Observable<ActiviteitDoc[]> {
    return from(call<void, ActiviteitDoc[]>('getAllActiviteiten'));
  }

  getActiviteit(id: string): Observable<ActiviteitDoc> {
    return from(call<{ id: string }, ActiviteitDoc>('getActiviteit', { id }));
  }

  createActiviteit(dto: CreateActiviteitRequest): Observable<ActiviteitDoc> {
    return from(call<CreateActiviteitRequest, ActiviteitDoc>('createActiviteit', dto));
  }

  updateActiviteit(payload: UpdateActiviteitRequest): Observable<ActiviteitDoc | ActiviteitOccurrenceDoc> {
    return from(call<UpdateActiviteitRequest, ActiviteitDoc | ActiviteitOccurrenceDoc>('updateActiviteit', payload));
  }

  deleteActiviteit(payload: DeleteActiviteitRequest): Observable<{ success: boolean }> {
    return from(call<DeleteActiviteitRequest, { success: boolean }>('deleteActiviteit', payload));
  }

  getOccurrenceOverrides(activiteitId: string): Observable<ActiviteitOccurrenceDoc[]> {
    return from(call<{ activiteitId: string }, ActiviteitOccurrenceDoc[]>('getOccurrenceOverrides', { activiteitId }));
  }

  getAllOccurrenceOverrides(): Observable<ActiviteitOccurrenceDoc[]> {
    return from(call<void, ActiviteitOccurrenceDoc[]>('getAllOccurrenceOverrides'));
  }

  // ── Registraties ─────────────────────────────────────────────────────────

  registreer(payload: {
    activiteitId: string;
    occurrenceDatum: string;
    aantalGasten: number;
    opmerking?: string | null;
  }): Observable<ActiviteitRegistratieDoc> {
    return from(call<typeof payload, ActiviteitRegistratieDoc>('registreerVoorActiviteit', payload));
  }

  annuleer(activiteitId: string, occurrenceDatum: string): Observable<{ success: boolean }> {
    return from(call<{ activiteitId: string; occurrenceDatum: string }, { success: boolean }>(
      'annuleerRegistratie', { activiteitId, occurrenceDatum }
    ));
  }

  getRegistraties(activiteitId: string, occurrenceDatum: string): Observable<ActiviteitRegistratieDoc[]> {
    return from(call<{ activiteitId: string; occurrenceDatum: string }, ActiviteitRegistratieDoc[]>(
      'getRegistratiesVoorOccurrence', { activiteitId, occurrenceDatum }
    ));
  }

  getMijnRegistraties(): Observable<ActiviteitRegistratieDoc[]> {
    return from(call<void, ActiviteitRegistratieDoc[]>('getMijnRegistraties'));
  }

  updateRegistratieStatus(registratieId: string, status: ActiviteitRegistratieDoc['status']): Observable<ActiviteitRegistratieDoc> {
    return from(call<{ registratieId: string; status: string }, ActiviteitRegistratieDoc>(
      'updateRegistratieStatus', { registratieId, status }
    ));
  }
}
