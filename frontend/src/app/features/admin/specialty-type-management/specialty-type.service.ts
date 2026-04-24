import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';
import { from, Observable } from 'rxjs';

export interface SpecialtyType {
  id: string;
  organisatie: string;
  naam: string;
  volgorde: number;
}

export type CreateSpecialtyTypeRequest = Omit<SpecialtyType, 'id'>;
export type UpdateSpecialtyTypeRequest = Partial<CreateSpecialtyTypeRequest>;

@Injectable({ providedIn: 'root' })
export class SpecialtyTypeService {
  getAll(): Observable<SpecialtyType[]> {
    const fn = httpsCallable<void, SpecialtyType[]>(functions, 'getSpecialtyTypes');
    return from(fn().then(r => r.data));
  }

  getByOrganisatie(organisatie: string): Observable<SpecialtyType[]> {
    const fn = httpsCallable<{ organisatie: string }, SpecialtyType[]>(functions, 'getSpecialtyTypes');
    return from(fn({ organisatie }).then(r => r.data));
  }

  create(dto: CreateSpecialtyTypeRequest): Observable<SpecialtyType> {
    const fn = httpsCallable<CreateSpecialtyTypeRequest, SpecialtyType>(functions, 'createSpecialtyType');
    return from(fn(dto).then(r => r.data));
  }

  update(id: string, dto: UpdateSpecialtyTypeRequest): Observable<SpecialtyType> {
    const fn = httpsCallable<{ id: string } & UpdateSpecialtyTypeRequest, SpecialtyType>(functions, 'updateSpecialtyType');
    return from(fn({ id, ...dto }).then(r => r.data));
  }

  delete(id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ id: string }, { success: boolean }>(functions, 'deleteSpecialtyType');
    return from(fn({ id }).then(r => r.data));
  }
}


