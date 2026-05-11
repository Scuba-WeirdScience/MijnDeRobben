import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';
import { from, Observable } from 'rxjs';
import { BrevetTypeDoc } from '../../../core/models/firestore-types';

export type BrevetTypeDef = BrevetTypeDoc;

export type CreateBrevetTypeDefRequest = Omit<BrevetTypeDef, 'id'>;
export type UpdateBrevetTypeDefRequest = Partial<CreateBrevetTypeDefRequest>;

@Injectable({ providedIn: 'root' })
export class BrevetTypeService {
  getAll(): Observable<BrevetTypeDef[]> {
    const fn = httpsCallable<void, BrevetTypeDef[]>(functions, 'getBrevetTypes');
    return from(fn().then(r => r.data));
  }

  getByOrganisatie(organisatie: string): Observable<BrevetTypeDef[]> {
    const fn = httpsCallable<{ organisatie: string }, BrevetTypeDef[]>(functions, 'getBrevetTypes');
    return from(fn({ organisatie }).then(r => r.data));
  }

  create(dto: CreateBrevetTypeDefRequest): Observable<BrevetTypeDef> {
    const fn = httpsCallable<CreateBrevetTypeDefRequest, BrevetTypeDef>(functions, 'createBrevetType');
    return from(fn(dto).then(r => r.data));
  }

  update(id: string, dto: UpdateBrevetTypeDefRequest): Observable<BrevetTypeDef> {
    const fn = httpsCallable<{ id: string } & UpdateBrevetTypeDefRequest, BrevetTypeDef>(functions, 'updateBrevetType');
    return from(fn({ id, ...dto }).then(r => r.data));
  }

  delete(id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ id: string }, { success: boolean }>(functions, 'deleteBrevetType');
    return from(fn({ id }).then(r => r.data));
  }
}


