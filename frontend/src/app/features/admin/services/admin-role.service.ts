import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../../core/firebase/callable';
import { Member } from '../../members/services/member.service';

export interface UserWithRoles {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminRoleService {
  getUsersWithRoles(): Observable<UserWithRoles[]> {
    return from(call<void, UserWithRoles[]>('getUsers'));
  }

  getUserRoles(userId: string): Observable<string[]> {
    return from(call<{ userId: string }, string[]>('getUserRoles', { userId }));
  }

  assignRole(userId: string, role: string): Observable<{ success: boolean }> {
    return from(call<{ userId: string; role: string }, { success: boolean }>('assignRole', { userId, role }));
  }

  removeRole(userId: string, role: string): Observable<{ success: boolean }> {
    return from(call<{ userId: string; role: string }, { success: boolean }>('removeRole', { userId, role }));
  }

  updateEmail(userId: string, email: string): Observable<{ success: boolean }> {
    return from(call<{ userId: string; email: string }, { success: boolean }>('updateUser', { userId, email }));
  }

  resetPassword(userId: string, newPassword: string): Observable<{ success: boolean }> {
    return from(call<{ userId: string; newPassword: string }, { success: boolean }>('resetPassword', { userId, newPassword }));
  }

  /** Update a member's verzorgerIds array directly (Beheer only). */
  updateVerzorgerIds(memberId: string, verzorgerIds: string[]): Observable<Member> {
    return from(call<{ memberId: string; verzorgerIds: string[] }, Member>('updateMember', { memberId, verzorgerIds }));
  }
}
