import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { call } from '../../core/firebase/callable';
import { Member } from '../members/services/member.service';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '@fire';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  /** Returns the member record for the logged-in user. */
  getMe(): Observable<Member> {
    return from(call<void, Member>('getMe'));
  }

  /** Uploads a new avatar to Firebase Storage and returns the updated member. */
  uploadAvatar(file: File): Observable<Member> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const ext = file.name.split('.').pop() ?? 'jpg';
    const storageRef = ref(storage, `avatars/${uid}.${ext}`);

    return from(
      uploadBytes(storageRef, file)
        .then(() => getDownloadURL(storageRef))
        .then(avatarUrl =>
          call<{ memberId: string; avatarUrl: string }, Member>('updateMember', { memberId: uid, avatarUrl })
        )
    );
  }

  /** Removes the current avatar from Storage and clears the avatarUrl on the member doc. */
  deleteAvatar(): Observable<{ success: boolean }> {
    return from(call<void, { success: boolean }>('deleteAvatar'));
  }
}
