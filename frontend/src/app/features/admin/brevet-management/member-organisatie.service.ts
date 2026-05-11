import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../../core/firebase/callable';

export interface MemberOrganisatie {
  id: string;
  memberId: string;
  organisatie: string;
  logboeknummer: string | null;
  beginDatum: string | null;
  createdAt: string;
  updatedAt: string | null;
  /** Brevetten linked to this organisatie (populated by the backend). */
  brevetten: Array<{ id: string; brevetType: string; niveau: string; behaaldDatum?: string | null; notities?: string | null }>;
}

export interface CreateMemberOrganisatieRequest {
  organisatie: string;
  logboeknummer?: string | null;
  beginDatum?: string | null;
}

export interface UpdateMemberOrganisatieRequest extends Partial<CreateMemberOrganisatieRequest> {}

@Injectable({ providedIn: 'root' })
export class MemberOrganisatieService {
  getByMember(memberId: string): Observable<MemberOrganisatie[]> {
    return from(call<{ memberId: string }, MemberOrganisatie[]>('getMemberOrganisaties', { memberId }));
  }

  getMyOrganisaties(): Observable<MemberOrganisatie[]> {
    return from(call<void, MemberOrganisatie[]>('getMyOrganisaties'));
  }

  create(memberId: string, dto: CreateMemberOrganisatieRequest): Observable<MemberOrganisatie> {
    return from(call<{ memberId: string } & CreateMemberOrganisatieRequest, MemberOrganisatie>('createMemberOrganisatie', { memberId, ...dto }));
  }

  update(memberId: string, id: string, dto: UpdateMemberOrganisatieRequest): Observable<MemberOrganisatie> {
    return from(call<{ id: string; memberId: string } & UpdateMemberOrganisatieRequest, MemberOrganisatie>('updateMemberOrganisatie', { id, memberId, ...dto }));
  }

  delete(memberId: string, id: string): Observable<{ success: boolean }> {
    return from(call<{ id: string; memberId: string }, { success: boolean }>('deleteMemberOrganisatie', { id, memberId }));
  }
}
