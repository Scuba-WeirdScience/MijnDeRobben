import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { functions, storage } from '@fire';
import { auth } from '@fire';
import { from, Observable } from 'rxjs';
import { Member } from '../members/services/member.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  /** Returns the member record for the logged-in user. */
  getMe(): Observable<Member> {
    const fn = httpsCallable<void, Member>(functions, 'getMe');
    return from(fn().then(r => r.data));
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
        .then(avatarUrl => {
          const fn = httpsCallable<{ avatarUrl: string }, Member>(functions, 'updateMember');
          return fn({ id: uid, avatarUrl } as unknown as { avatarUrl: string }).then(r => r.data as Member);
        })
    );
  }

  /** Removes the current avatar from Storage and clears the avatarUrl on the member doc. */
  deleteAvatar(): Observable<{ success: boolean }> {
    const fn = httpsCallable<void, { success: boolean }>(functions, 'deleteAvatar');
    return from(fn().then(r => r.data));
  }
}


