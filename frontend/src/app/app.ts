import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import {
  RouterOutlet,
  Router,
  NavigationEnd,
  NavigationStart,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { UpdateNotificationComponent } from './shared/components/pwa/update-notification.component';
import { InstallPromptBannerComponent } from './shared/components/pwa/install-prompt-banner.component';
import { ReleaseNotesDialogComponent, SpinnerComponent } from './shared/components/design-system';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { CommonModule } from '@angular/common';
import { PwaService } from './core/services/pwa.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NavbarComponent,
    ToastComponent,
    UpdateNotificationComponent,
    InstallPromptBannerComponent,
    CommonModule,
    SpinnerComponent,
    ReleaseNotesDialogComponent,
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  readonly pwa = inject(PwaService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly isFullscreen = computed(() => this.url().startsWith('/berichten'));

  readonly isNavigating = toSignal(
    this.router.events.pipe(
      filter(
        (e) =>
          e instanceof NavigationStart ||
          e instanceof NavigationEnd ||
          e instanceof NavigationCancel ||
          e instanceof NavigationError
      ),
      map((e) => e instanceof NavigationStart)
    ),
    { initialValue: false }
  );
}
