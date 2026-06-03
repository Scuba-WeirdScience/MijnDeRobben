import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../../core/firebase/callable';

export interface VerzorgerInfo {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable({ providedIn: 'root' })
export class VerzorgerService {
  getVerzorgers(memberId: string): Observable<VerzorgerInfo[]> {
    return from(call<{ memberId: string }, VerzorgerInfo[]>('getVerzorgers', { memberId }));
  }

  addVerzorger(memberId: string, verzorgerId: string): Observable<{ success: boolean }> {
    return from(call<{ memberId: string; verzorgerId: string }, { success: boolean }>(
      'addVerzorger', { memberId, verzorgerId }
    ));
  }

  removeVerzorger(memberId: string, verzorgerId: string): Observable<{ success: boolean }> {
    return from(call<{ memberId: string; verzorgerId: string }, { success: boolean }>(
      'removeVerzorger', { memberId, verzorgerId }
    ));
  }

  createVerzorgerUser(
    memberId: string,
    email: string,
    firstName: string,
    lastName: string
  ): Observable<VerzorgerInfo> {
    return from(call<{ memberId: string; email: string; firstName: string; lastName: string }, VerzorgerInfo>(
      'createVerzorgerUser', { memberId, email, firstName, lastName }
    ));
  }
}
