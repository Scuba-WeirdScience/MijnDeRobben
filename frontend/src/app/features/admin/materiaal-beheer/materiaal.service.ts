import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';
import { from, Observable } from 'rxjs';
import { CustomFieldDef, MateriaalTypeDoc, MateriaalDoc } from '../../../core/models/firestore-types';

export type MateriaalType = MateriaalTypeDoc;
export type { CustomFieldDef, MateriaalDoc };

export interface MateriaalTypeWithMaterialen extends MateriaalType {
  materialen: MateriaalDoc[];
}

export type CreateMateriaalTypeRequest = Omit<MateriaalType, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMateriaalTypeRequest = Partial<CreateMateriaalTypeRequest>;
export type CreateMateriaalRequest = Omit<MateriaalDoc, 'id' | 'actief' | 'createdAt' | 'updatedAt'>;
export type UpdateMateriaalRequest = Partial<CreateMateriaalRequest>;

@Injectable({ providedIn: 'root' })
export class MateriaalService {
  // ── Types ────────────────────────────────────────────────────────────────

  getAllWithMaterialen(): Observable<MateriaalTypeWithMaterialen[]> {
    const fn = httpsCallable<void, MateriaalTypeWithMaterialen[]>(functions, 'getMateriaalTypesWithMaterialen');
    return from(fn().then(r => r.data));
  }

  getAllTypes(): Observable<MateriaalType[]> {
    const fn = httpsCallable<void, MateriaalType[]>(functions, 'getMateriaalTypes');
    return from(fn().then(r => r.data));
  }

  createType(dto: CreateMateriaalTypeRequest): Observable<MateriaalType> {
    const fn = httpsCallable<CreateMateriaalTypeRequest, MateriaalType>(functions, 'createMateriaalType');
    return from(fn(dto).then(r => r.data));
  }

  updateType(id: string, dto: UpdateMateriaalTypeRequest): Observable<MateriaalType> {
    const fn = httpsCallable<{ id: string } & UpdateMateriaalTypeRequest, MateriaalType>(functions, 'updateMateriaalType');
    return from(fn({ id, ...dto }).then(r => r.data));
  }

  deleteType(id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ id: string }, { success: boolean }>(functions, 'deleteMateriaalType');
    return from(fn({ id }).then(r => r.data));
  }

  // ── Materialen ───────────────────────────────────────────────────────────

  createMateriaal(dto: CreateMateriaalRequest): Observable<MateriaalDoc> {
    const fn = httpsCallable<CreateMateriaalRequest, MateriaalDoc>(functions, 'createMateriaal');
    return from(fn(dto).then(r => r.data));
  }

  updateMateriaal(_typeId: string, id: string, dto: UpdateMateriaalRequest): Observable<MateriaalDoc> {
    const fn = httpsCallable<{ id: string } & UpdateMateriaalRequest, MateriaalDoc>(functions, 'updateMateriaal');
    return from(fn({ id, ...dto }).then(r => r.data));
  }

  deleteMateriaal(_typeId: string, id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ id: string }, { success: boolean }>(functions, 'deleteMateriaal');
    return from(fn({ id }).then(r => r.data));
  }
}


