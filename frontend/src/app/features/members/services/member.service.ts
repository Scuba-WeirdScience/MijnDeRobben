import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../../core/firebase/callable';
import { MemberDoc } from '../../../core/models/firestore-types';

export type Member = MemberDoc;

export interface AdminCreateMemberRequest {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  joinDate: string;
  isActive?: boolean;
}

export interface UpdateMemberRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  joinDate?: string;
  isActive?: boolean;
  endOfMembership?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class MemberService {
  getAll(page = 1, pageSize = 20, search = ''): Observable<PagedResult<Member>> {
    return from(call<{ page: number; pageSize: number; search: string }, PagedResult<Member>>(
      'getMembers', { page, pageSize, search }
    ));
  }

  getById(id: string): Observable<Member> {
    return from(call<{ memberId: string }, Member>('getMember', { memberId: id }));
  }

  update(id: string, member: UpdateMemberRequest): Observable<Member> {
    return from(call<{ memberId: string } & UpdateMemberRequest, Member>(
      'updateMember', { memberId: id, ...member }
    ));
  }

  delete(id: string): Observable<{ success: boolean }> {
    return from(call<{ memberId: string }, { success: boolean }>('deleteMember', { memberId: id }));
  }

  getMijnKinderen(): Observable<Member[]> {
    return from(call<void, Member[]>('getMijnKinderen'));
  }

  // ── Admin-only operations ──────────────────────────────────────────────────

  /** Create a member by e-mail address (admin creates the Auth account). */
  adminCreate(member: AdminCreateMemberRequest): Observable<Member> {
    return from(call<AdminCreateMemberRequest, Member>('createMember', member));
  }

  resendUitnodiging(id: string): Observable<{ success: boolean }> {
    return from(call<{ memberId: string }, { success: boolean }>('resendUitnodiging', { memberId: id }));
  }
}
