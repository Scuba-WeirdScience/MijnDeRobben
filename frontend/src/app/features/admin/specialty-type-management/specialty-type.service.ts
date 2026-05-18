import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../../core/firebase/callable';
import { SpecialtyTypeDoc } from '../../../core/models/firestore-types';

export type SpecialtyType = SpecialtyTypeDoc;

export type CreateSpecialtyTypeRequest = Omit<SpecialtyType, 'id'>;
export type UpdateSpecialtyTypeRequest = Partial<CreateSpecialtyTypeRequest>;

@Injectable({ providedIn: 'root' })
export class SpecialtyTypeService {
  getAll(): Observable<SpecialtyType[]> {
    return from(call<void, SpecialtyType[]>('getSpecialtyTypes'));
  }

  getByOrganisatie(organisatie: string): Observable<SpecialtyType[]> {
    return from(call<{ organisatie: string }, SpecialtyType[]>('getSpecialtyTypes', { organisatie }));
  }

  create(dto: CreateSpecialtyTypeRequest): Observable<SpecialtyType> {
    return from(call<CreateSpecialtyTypeRequest, SpecialtyType>('createSpecialtyType', dto));
  }

  update(id: string, dto: UpdateSpecialtyTypeRequest): Observable<SpecialtyType> {
    return from(call<{ id: string } & UpdateSpecialtyTypeRequest, SpecialtyType>('updateSpecialtyType', { id, ...dto }));
  }

  delete(id: string): Observable<{ success: boolean }> {
    return from(call<{ id: string }, { success: boolean }>('deleteSpecialtyType', { id }));
  }
}
