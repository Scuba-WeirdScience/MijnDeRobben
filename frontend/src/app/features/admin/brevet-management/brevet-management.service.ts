import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../../core/firebase/callable';
import { BrevetDoc } from '../../../core/models/firestore-types';

export type CreateBrevetRequest = Omit<BrevetDoc, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>;
export type UpdateBrevetRequest = Partial<Omit<BrevetDoc, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class BrevetManagementService {
  getByMember(memberId: string): Observable<BrevetDoc[]> {
    return from(call<{ memberId: string }, BrevetDoc[]>('getMemberBrevetten', { memberId }));
  }

  create(memberId: string, dto: CreateBrevetRequest): Observable<BrevetDoc> {
    return from(call<CreateBrevetRequest & { memberId: string }, BrevetDoc>('createBrevet', { ...dto, memberId }));
  }

  update(memberId: string, id: string, dto: UpdateBrevetRequest): Observable<BrevetDoc> {
    return from(call<{ id: string; memberId: string } & UpdateBrevetRequest, BrevetDoc>('updateBrevet', { id, memberId, ...dto }));
  }

  delete(_memberId: string, id: string): Observable<{ success: boolean }> {
    return from(call<{ id: string }, { success: boolean }>('deleteBrevet', { id }));
  }
}
