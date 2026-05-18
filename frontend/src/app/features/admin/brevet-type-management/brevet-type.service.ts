import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../../core/firebase/callable';
import { BrevetTypeDoc } from '../../../core/models/firestore-types';

export type BrevetTypeDef = BrevetTypeDoc;

export type CreateBrevetTypeDefRequest = Omit<BrevetTypeDef, 'id'>;
export type UpdateBrevetTypeDefRequest = Partial<CreateBrevetTypeDefRequest>;

@Injectable({ providedIn: 'root' })
export class BrevetTypeService {
  getAll(): Observable<BrevetTypeDef[]> {
    return from(call<void, BrevetTypeDef[]>('getBrevetTypes'));
  }

  getByOrganisatie(organisatie: string): Observable<BrevetTypeDef[]> {
    return from(call<{ organisatie: string }, BrevetTypeDef[]>('getBrevetTypes', { organisatie }));
  }

  create(dto: CreateBrevetTypeDefRequest): Observable<BrevetTypeDef> {
    return from(call<CreateBrevetTypeDefRequest, BrevetTypeDef>('createBrevetType', dto));
  }

  update(id: string, dto: UpdateBrevetTypeDefRequest): Observable<BrevetTypeDef> {
    return from(call<{ id: string } & UpdateBrevetTypeDefRequest, BrevetTypeDef>('updateBrevetType', { id, ...dto }));
  }

  delete(id: string): Observable<{ success: boolean }> {
    return from(call<{ id: string }, { success: boolean }>('deleteBrevetType', { id }));
  }
}
