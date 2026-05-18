import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../../core/firebase/callable';
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
  // 📦 Types ────────────────────────────────────────────────────────────────

  getAllWithMaterialen(): Observable<MateriaalTypeWithMaterialen[]> {
    return from(call<void, MateriaalTypeWithMaterialen[]>('getMateriaalTypesWithMaterialen'));
  }

  getAllTypes(): Observable<MateriaalType[]> {
    return from(call<void, MateriaalType[]>('getMateriaalTypes'));
  }

  createType(dto: CreateMateriaalTypeRequest): Observable<MateriaalType> {
    return from(call<CreateMateriaalTypeRequest, MateriaalType>('createMateriaalType', dto));
  }

  updateType(id: string, dto: UpdateMateriaalTypeRequest): Observable<MateriaalType> {
    return from(call<{ id: string } & UpdateMateriaalTypeRequest, MateriaalType>('updateMateriaalType', { id, ...dto }));
  }

  deleteType(id: string): Observable<{ success: boolean }> {
    return from(call<{ id: string }, { success: boolean }>('deleteMateriaalType', { id }));
  }

  // 🔧 Materialen ────────────────────────────────────────────────────────────

  createMateriaal(dto: CreateMateriaalRequest): Observable<MateriaalDoc> {
    return from(call<CreateMateriaalRequest, MateriaalDoc>('createMateriaal', dto));
  }

  updateMateriaal(_typeId: string, id: string, dto: UpdateMateriaalRequest): Observable<MateriaalDoc> {
    return from(call<{ id: string } & UpdateMateriaalRequest, MateriaalDoc>('updateMateriaal', { id, ...dto }));
  }

  deleteMateriaal(_typeId: string, id: string): Observable<{ success: boolean }> {
    return from(call<{ id: string }, { success: boolean }>('deleteMateriaal', { id }));
  }
}
