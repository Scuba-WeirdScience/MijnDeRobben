import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../core/firebase/callable';
import { LeningDoc } from '../../core/models/firestore-types';

export type { LeningDoc };

export interface MateriaalLeningStatus {
  isLent: boolean;
  isMijnLening: boolean;
  huidigeLeningId?: string;
  huidigeLenerNaam?: string;
  uitgeleendDatum?: string;
  materiaalNaam?: string;
  materiaalTypeNaam?: string;
}

@Injectable({ providedIn: 'root' })
export class LeningService {
  getMyLeningen(): Observable<LeningDoc[]> {
    return from(call<void, LeningDoc[]>('getMyLeningen'));
  }

  getMateriaalStatus(materiaalId: string): Observable<MateriaalLeningStatus> {
    return from(call<{ materiaalId: string }, MateriaalLeningStatus>('getMateriaalStatus', { materiaalId }));
  }

  take(materiaalId: string): Observable<LeningDoc> {
    return from(call<{ materiaalId: string }, LeningDoc>('takeLening', { materiaalId }));
  }

  return$(leningId: string, notities?: string): Observable<{ success: boolean }> {
    return from(call<{ leningId: string; notities?: string }, { success: boolean }>('returnLening', { leningId, notities }));
  }

  getAll(): Observable<LeningDoc[]> {
    return from(call<void, LeningDoc[]>('getAllLeningen'));
  }

  /** Returns leningen history for a specific materiaal (all, including returned). */
  getByMateriaalId(materiaalId: string): Observable<LeningDoc[]> {
    return from(call<{ materiaalId: string }, LeningDoc[]>('getLeningenByMateriaalId', { materiaalId }));
  }

  /** Returns leningen for a specific member (all, including returned). */
  getByMemberId(memberId: string): Observable<LeningDoc[]> {
    return from(call<{ memberId: string }, LeningDoc[]>('getLeningenByMemberId', { memberId }));
  }

  /** Verzorger: returns open leningen for a linked child member. */
  getLeningenVoorLid(memberId: string): Observable<LeningDoc[]> {
    return from(call<{ memberId: string }, LeningDoc[]>('getLeningenVoorLid', { memberId }));
  }
}
