import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../core/firebase/callable';
import { BrevetDoc } from '../../core/models/firestore-types';

export type { BrevetDoc };

@Injectable({ providedIn: 'root' })
export class BrevetService {
  /** Returns brevetten for the logged-in user. */
  getMyBrevetten(): Observable<BrevetDoc[]> {
    return from(call<void, BrevetDoc[]>('getMyBrevetten'));
  }
}
