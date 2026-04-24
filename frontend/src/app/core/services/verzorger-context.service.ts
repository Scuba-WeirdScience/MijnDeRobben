import { Injectable, signal, computed } from '@angular/core';
import { Member } from '../../features/members/services/member.service';

/**
 * Tracks whether the logged-in verzorger is currently "acting on behalf of"
 * one of their linked children (leden).
 *
 * When activeKind() is non-null, pages like Berichten and Mijn materialen
 * should show data for that child member instead of the logged-in user.
 */
@Injectable({ providedIn: 'root' })
export class VerzorgerContextService {
  private readonly _activeKind = signal<Member | null>(null);

  /** The member the verzorger is currently acting on behalf of, or null. */
  readonly activeKind = this._activeKind.asReadonly();

  /** True when a child context is active. */
  readonly isActingAsKind = computed(() => this._activeKind() !== null);

  /** The member ID to use for data queries (child or self — caller provides own UID). */
  activeMemberId(ownMemberId: string): string {
    return this._activeKind()?.id ?? ownMemberId;
  }

  switchToKind(kind: Member): void {
    this._activeKind.set(kind);
  }

  clearKind(): void {
    this._activeKind.set(null);
  }
}
