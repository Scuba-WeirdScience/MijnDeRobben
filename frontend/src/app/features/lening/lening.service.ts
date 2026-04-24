import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';
import { from, Observable } from 'rxjs';

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
    const fn = httpsCallable<void, LeningDoc[]>(functions, 'getMyLeningen');
    return from(fn().then(r => r.data));
  }

  getMateriaalStatus(materiaalId: string): Observable<MateriaalLeningStatus> {
    const fn = httpsCallable<{ materiaalId: string }, MateriaalLeningStatus>(functions, 'getMateriaalStatus');
    return from(fn({ materiaalId }).then(r => r.data));
  }

  take(materiaalId: string): Observable<LeningDoc> {
    const fn = httpsCallable<{ materiaalId: string }, LeningDoc>(functions, 'takeLening');
    return from(fn({ materiaalId }).then(r => r.data));
  }

  return$(leningId: string, notities?: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ leningId: string; notities?: string }, { success: boolean }>(functions, 'returnLening');
    return from(fn({ leningId, notities }).then(r => r.data));
  }

  getAll(): Observable<LeningDoc[]> {
    const fn = httpsCallable<void, LeningDoc[]>(functions, 'getAllLeningen');
    return from(fn().then(r => r.data));
  }

  /** Returns leningen history for a specific materiaal (all, including returned). */
  getByMateriaalId(materiaalId: string): Observable<LeningDoc[]> {
    // Filtered client-side from getAll since there's no dedicated backend endpoint yet
    const fn = httpsCallable<void, LeningDoc[]>(functions, 'getAllLeningen');
    return from(fn().then(r => r.data.filter(l => l.materiaalId === materiaalId)));
  }

  /** Returns leningen for a specific member (all, including returned). */
  getByMemberId(memberId: string): Observable<LeningDoc[]> {
    const fn = httpsCallable<void, LeningDoc[]>(functions, 'getAllLeningen');
    return from(fn().then(r => r.data.filter(l => l.memberId === memberId)));
  }

  /** Verzorger: returns open leningen for a linked child member. */
  getLeningenVoorLid(memberId: string): Observable<LeningDoc[]> {
    const fn = httpsCallable<{ memberId: string }, LeningDoc[]>(functions, 'getLeningenVoorLid');
    return from(fn({ memberId }).then(r => r.data));
  }
}


