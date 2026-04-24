// MemberOrganisatieService — stub implementation.
// The backend functions for member organisaties are not yet implemented.
// This stub exists to keep the Angular build clean.
// TODO: implement getMemberOrganisaties, createMemberOrganisatie, etc. Cloud Functions
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

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
  getByMember(_memberId: string): Observable<MemberOrganisatie[]> {
    return of([]);
  }

  getMyOrganisaties(): Observable<MemberOrganisatie[]> {
    return of([]);
  }

  create(_memberId: string, _dto: CreateMemberOrganisatieRequest): Observable<MemberOrganisatie> {
    throw new Error('Not yet implemented');
  }

  update(_memberId: string, _id: string, _dto: UpdateMemberOrganisatieRequest): Observable<MemberOrganisatie> {
    throw new Error('Not yet implemented');
  }

  delete(_memberId: string, _id: string): Observable<void> {
    throw new Error('Not yet implemented');
  }
}
