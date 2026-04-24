import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';
import { from, Observable } from 'rxjs';

export interface Member {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  joinDate: string;
  endOfMembership: string | null;
  isActive: boolean;
  isValidated: boolean;
  avatarUrl: string | null;
  verzorgerIds: string[];
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateMemberRequest {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  joinDate: string;
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
    const fn = httpsCallable<{ page: number; pageSize: number; search: string }, PagedResult<Member>>(
      functions, 'getMembers'
    );
    return from(fn({ page, pageSize, search }).then(r => r.data));
  }

  getById(id: string): Observable<Member> {
    const fn = httpsCallable<{ memberId: string }, Member>(functions, 'getMember');
    return from(fn({ memberId: id }).then(r => r.data));
  }

  create(member: CreateMemberRequest): Observable<Member> {
    const fn = httpsCallable<CreateMemberRequest, Member>(functions, 'createMember');
    return from(fn(member).then(r => r.data));
  }

  update(id: string, member: UpdateMemberRequest): Observable<Member> {
    const fn = httpsCallable<{ memberId: string } & UpdateMemberRequest, Member>(functions, 'updateMember');
    return from(fn({ memberId: id, ...member }).then(r => r.data));
  }

  delete(id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ memberId: string }, { success: boolean }>(functions, 'deleteMember');
    return from(fn({ memberId: id }).then(r => r.data));
  }

  getMijnKinderen(): Observable<Member[]> {
    const fn = httpsCallable<void, Member[]>(functions, 'getMijnKinderen');
    return from(fn().then(r => r.data));
  }
}


