import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';
import { from, Observable } from 'rxjs';
import { Member, UpdateMemberRequest, PagedResult } from '../../members/services/member.service';

export interface CreateMemberRequest {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  joinDate: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminMemberService {
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

  resendUitnodiging(id: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ memberId: string }, { success: boolean }>(functions, 'resendUitnodiging');
    return from(fn({ memberId: id }).then(r => r.data));
  }
}


