import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';
import { from, Observable } from 'rxjs';

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
    const fn = httpsCallable<{ memberId: string }, MemberOrganisatie[]>(functions, 'getMemberOrganisaties');
    return from(fn({ memberId }).then(r => r.data));
  }

  getMyOrganisaties(): Observable<MemberOrganisatie[]> {
    const fn = httpsCallable<void, MemberOrganisatie[]>(functions, 'getMyOrganisaties');
    return from(fn().then(r => r.data));
  }

  create(memberId: string, dto: CreateMemberOrganisatieRequest): Observable<MemberOrganisatie> {
    const fn = httpsCallable<{ memberId: string } & CreateMemberOrganisatieRequest, MemberOrganisatie>(functions, 'createMemberOrganisatie');
    return from(fn({ memberId, ...dto }).then(r => r.data));
  }

  update(memberId: string, id: string, dto: UpdateMemberOrganisatieRequest): Observable<MemberOrganisatie> {
    const fn = httpsCallable<{ id: string; memberId: string } & UpdateMemberOrganisatieRequest, MemberOrganisatie>(functions, 'updateMemberOrganisatie');
    return from(fn({ id, memberId, ...dto }).then(r => r.data));
  }

  delete(memberId: string, id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ id: string; memberId: string }, { success: boolean }>(functions, 'deleteMemberOrganisatie');
    return from(fn({ id, memberId }).then(r => r.data));
  }
}
