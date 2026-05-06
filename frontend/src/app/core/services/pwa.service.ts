import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent, UnrecoverableStateEvent } from '@angular/service-worker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, interval } from 'rxjs';

/** Poll for SW updates every 5 minutes */
const UPDATE_POLL_INTERVAL_MS = 5 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);

  /** True when NGSW has detected a new version ready to activate */
  readonly updateAvailable = signal(false);

  /** True when the browser has a deferred install prompt available */
  readonly isInstallable = signal(false);

  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private readonly boundBeforeInstallPrompt = this.onBeforeInstallPrompt.bind(this);
  private readonly boundAppInstalled = this.onAppInstalled.bind(this);

  constructor() {
    this.initUpdateDetection();
    this.initInstallPrompt();
  }

  // ─── SW Update Detection ────────────────────────────────────────────────────

  private initUpdateDetection(): void {
    if (!this.swUpdate.isEnabled) return;

    // Show banner when a new version is ready
    this.swUpdate.versionUpdates
      .pipe(
        filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.updateAvailable.set(true);
      });

    // If the SW enters an unrecoverable state, force a hard reload
    this.swUpdate.unrecoverable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        document.location.reload();
      });

    // Check immediately on startup (catches a deploy that happened while the
    // app was closed, before the 5-minute interval fires)
    this.swUpdate.checkForUpdate().catch(() => {});

    // Then keep polling every 5 minutes for long-running sessions
    interval(UPDATE_POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.swUpdate.checkForUpdate().catch(() => {}));
  }

  /** Activate the waiting service worker and reload the page */
  async activateUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) return;
    await this.swUpdate.activateUpdate();
    document.location.reload();
  }

  // ─── Install Prompt ─────────────────────────────────────────────────────────

  private initInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', this.boundBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.boundAppInstalled);

    // Clean up listeners when the service is destroyed (e.g. in tests)
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('beforeinstallprompt', this.boundBeforeInstallPrompt);
      window.removeEventListener('appinstalled', this.boundAppInstalled);
    });
  }

  private onBeforeInstallPrompt(event: Event): void {
    event.preventDefault();
    this.deferredPrompt = event as BeforeInstallPromptEvent;
    this.isInstallable.set(true);
  }

  private onAppInstalled(): void {
    this.deferredPrompt = null;
    this.isInstallable.set(false);
  }

  /** Trigger the native browser install prompt */
  async promptInstall(): Promise<void> {
    if (!this.deferredPrompt) return;
    await this.deferredPrompt.prompt();
    // Consume the outcome — the prompt object cannot be reused regardless of choice
    await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.isInstallable.set(false);
  }

  /** Dismiss the install banner for this session */
  dismissInstall(): void {
    this.deferredPrompt = null;
    this.isInstallable.set(false);
  }
}
