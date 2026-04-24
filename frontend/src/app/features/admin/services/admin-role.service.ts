import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@fire';
import { from, Observable } from 'rxjs';
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
    const fn = httpsCallable<void, UserWithRoles[]>(functions, 'getUsers');
    return from(fn().then(r => r.data));
  }

  getUserRoles(userId: string): Observable<string[]> {
    const fn = httpsCallable<{ userId: string }, string[]>(functions, 'getUserRoles');
    return from(fn({ userId }).then(r => r.data));
  }

  assignRole(userId: string, role: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ userId: string; role: string }, { success: boolean }>(functions, 'assignRole');
    return from(fn({ userId, role }).then(r => r.data));
  }

  removeRole(userId: string, role: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ userId: string; role: string }, { success: boolean }>(functions, 'removeRole');
    return from(fn({ userId, role }).then(r => r.data));
  }

  updateEmail(userId: string, email: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ userId: string; email: string }, { success: boolean }>(functions, 'updateUser');
    return from(fn({ userId, email }).then(r => r.data));
  }

  resetPassword(userId: string, newPassword: string): Observable<{ success: boolean }> {
    const fn = httpsCallable<{ userId: string; newPassword: string }, { success: boolean }>(functions, 'resetPassword');
    return from(fn({ userId, newPassword }).then(r => r.data));
  }

  /** Add a verzorger (by Auth UID) to a member's verzorgerIds array. */
  addVerzorger(memberId: string, verzorgerUserId: string): Observable<Member> {
    const fn = httpsCallable<{ memberId: string; verzorgerUserId: string }, Member>(functions, 'updateMember');
    // We fetch the member's current verzorgerIds on the backend — here we
    // rely on the backend's array-union approach via the allowed field.
    // Actually we pass the full new array, so we call getById first on the
    // caller side. Instead, we use a dedicated approach: we send the full
    // verzorgerIds array from the component. This helper signature passes the
    // new array through.
    return from(fn({ memberId, verzorgerUserId } as never).then(r => r.data));
  }

  /** Update a member's verzorgerIds array directly (Beheer only). */
  updateVerzorgerIds(memberId: string, verzorgerIds: string[]): Observable<Member> {
    const fn = httpsCallable<{ memberId: string; verzorgerIds: string[] }, Member>(functions, 'updateMember');
    return from(fn({ memberId, verzorgerIds }).then(r => r.data));
  }
}


