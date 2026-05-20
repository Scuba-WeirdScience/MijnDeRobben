import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileService } from './profile.service';
import { AvatarStateService } from '../../core/services/avatar-state.service';
import { AuthService } from '../../core/auth/auth.service';
import { VerzorgerContextService } from '../../core/services/verzorger-context.service';
import { MemberService, Member } from '../members/services/member.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { ThemeService } from '../../core/services/theme.service';
import { LocaleDatePipe } from '../../shared/pipes/locale-date.pipe';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent, LocaleDatePipe],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly memberService = inject(MemberService);
  private readonly avatarState = inject(AvatarStateService);
  readonly auth = inject(AuthService);
  readonly verzorgerCtx = inject(VerzorgerContextService);
  readonly theme = inject(ThemeService);

  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly uploadError = signal<string | null>(null);
  readonly uploadSuccess = signal(false);
  readonly member = signal<Member | null>(null);
  readonly avatarPreview = signal<string | null>(null);
  readonly kinderen = signal<Member[]>([]);

  /** First letters of first + last name (or email initial) */
  readonly initials = (): string => {
    const m = this.member();
    if (!m) return '?';
    const f = m.firstName?.trim()[0] ?? '';
    const l = m.lastName?.trim()[0] ?? '';
    return (f + l).toUpperCase() || '?';
  };

  ngOnInit(): void {
    this.profileService.getMe().subscribe({
      next: (m) => {
        this.member.set(m);
        const url = m.avatarUrl ?? null;
        this.avatarPreview.set(url);
        this.avatarState.setAvatarUrl(url);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Kon profielgegevens niet laden. Probeer opnieuw.');
        this.loading.set(false);
      }
    });

    this.memberService.getMijnKinderen().subscribe({
      next: kids => this.kinderen.set(kids),
      error: () => { /* no children or not a verzorger — silently ignore */ },
    });
  }

  switchToKind(kind: Member): void {
    this.verzorgerCtx.switchToKind(kind);
  }

  clearKind(): void {
    this.verzorgerCtx.clearKind();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadError.set(null);
    this.uploadSuccess.set(false);

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.uploadError.set('Alleen JPEG- en PNG-bestanden zijn toegestaan.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.uploadError.set('Het bestand is groter dan 2 MB.');
      return;
    }

    this.uploading.set(true);
    this.profileService.uploadAvatar(file).subscribe({
      next: (m) => {
        this.member.set(m);
        const url = m.avatarUrl ?? null;
        this.avatarPreview.set(url);
        this.avatarState.setAvatarUrl(url);
        this.uploading.set(false);
        this.uploadSuccess.set(true);
        input.value = '';
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err?.error?.error ?? 'Upload mislukt. Probeer opnieuw.');
      }
    });
  }

  onDelete(): void {
    this.uploadError.set(null);
    this.uploadSuccess.set(false);
    this.uploading.set(true);
    this.profileService.deleteAvatar().subscribe({
      next: () => {
        this.member.update(m => m ? { ...m, avatarUrl: null } : m);
        this.avatarPreview.set(null);
        this.avatarState.setAvatarUrl(null);
        this.uploading.set(false);
        this.uploadSuccess.set(true);
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set('Verwijderen mislukt. Probeer opnieuw.');
      }
    });
  }
}
