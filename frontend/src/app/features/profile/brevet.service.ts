import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';
import { from, Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class BrevetService {
  /** Returns brevetten for the logged-in user. */
  getMyBrevetten(): Observable<BrevetDoc[]> {
    const fn = httpsCallable<void, BrevetDoc[]>(functions, 'getMyBrevetten');
    return from(fn().then(r => r.data));
  }
}


