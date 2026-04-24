import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';
import { from, Observable } from 'rxjs';
import { BrevetDoc } from '../../profile/brevet.service';

export type CreateBrevetRequest = Omit<BrevetDoc, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>;
export type UpdateBrevetRequest = Partial<Omit<BrevetDoc, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class BrevetManagementService {
  getByMember(memberId: string): Observable<BrevetDoc[]> {
    const fn = httpsCallable<{ memberId: string }, BrevetDoc[]>(functions, 'getMemberBrevetten');
    return from(fn({ memberId }).then(r => r.data));
  }

  create(memberId: string, dto: CreateBrevetRequest): Observable<BrevetDoc> {
    const fn = httpsCallable<CreateBrevetRequest & { memberId: string }, BrevetDoc>(functions, 'createBrevet');
    return from(fn({ ...dto, memberId }).then(r => r.data));
  }

  update(memberId: string, id: string, dto: UpdateBrevetRequest): Observable<BrevetDoc> {
    const fn = httpsCallable<{ id: string; memberId: string } & UpdateBrevetRequest, BrevetDoc>(functions, 'updateBrevet');
    return from(fn({ id, memberId, ...dto }).then(r => r.data));
  }

  delete(_memberId: string, id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ id: string }, { success: boolean }>(functions, 'deleteBrevet');
    return from(fn({ id }).then(r => r.data));
  }
}


