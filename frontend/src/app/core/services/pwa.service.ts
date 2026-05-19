import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, interval } from 'rxjs';

/** Poll for SW updates every 2 minutes */
const UPDATE_POLL_INTERVAL_MS = 2 * 60 * 1000;

const LAST_SEEN_VERSION_KEY = 'pwa_last_seen_version';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface ReleaseSection {
  heading: string;
  items: string[];
}

export interface ReleaseEntry {
  version: string;
  date: string;
  sections: ReleaseSection[];
}

@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);
  private readonly http = inject(HttpClient);

  /** True when NGSW has detected a new version ready to activate */
  readonly updateAvailable = signal(false);

  /** True when the browser has a deferred install prompt available */
  readonly isInstallable = signal(false);

  private static readonly BANNER_DISMISSED_KEY = 'pwa_banner_dismissed';

  /** True when the user has dismissed the install banner (persisted in localStorage) */
  readonly bannerDismissed = signal(
    localStorage.getItem(PwaService.BANNER_DISMISSED_KEY) === 'true',
  );

  /** True when the app is already running as an installed PWA */
  get isRunningAsApp(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches;
  }

  /** Current app version read from the meta tag injected by the build */
  readonly appVersion: string =
    document.querySelector<HTMLMetaElement>('meta[name="app-version"]')?.content ?? '';

  /**
   * Release notes for the current version, if available and not yet seen.
   * Non-null triggers the release notes dialog.
   */
  readonly releaseNotes = signal<ReleaseEntry | null>(null);

  /** All release entries — populated when the user manually opens the changelog */
  readonly allReleaseEntries = signal<ReleaseEntry[]>([]);

  /** Whether to show the release notes dialog */
  readonly showReleaseNotes = signal(false);

  /** True when the dialog was opened manually (show full changelog, not just latest) */
  readonly showingFullChangelog = signal(false);

  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private readonly boundBeforeInstallPrompt = this.onBeforeInstallPrompt.bind(this);
  private readonly boundAppInstalled = this.onAppInstalled.bind(this);

  constructor() {
    this.initUpdateDetection();
    this.initInstallPrompt();
    this.checkReleaseNotesOnBoot();
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

    // Check after a short delay to ensure the SW is registered before calling
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setTimeout(() => this.swUpdate.checkForUpdate().catch(() => {}), 2000);

    // Then keep polling every 2 minutes for long-running sessions
    interval(UPDATE_POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .subscribe(() => this.swUpdate.checkForUpdate().catch(() => {}));
  }

  /** Activate the waiting service worker and reload the page */
  async activateUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) return;
    await this.swUpdate.activateUpdate();
    document.location.reload();
  }

  // ─── Release Notes ──────────────────────────────────────────────────────────

  /**
   * On boot: compare running version against the last version the user
   * acknowledged. If they differ and the running version has release notes,
   * surface the dialog.
   */
  private checkReleaseNotesOnBoot(): void {
    const currentVersion = this.getAppVersion();
    if (!currentVersion) return;

    const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    if (lastSeen === currentVersion) return; // already seen this version

    this.http
      .get<ReleaseEntry[]>('/assets/release-notes.json')
      .subscribe({
        next: (entries) => {
          const entry = entries.find((e) => e.version === currentVersion) ?? null;
          if (entry) {
            this.releaseNotes.set(entry);
            this.showReleaseNotes.set(true);
          } else {
            // No notes for this version — silently mark as seen
            localStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
          }
        },
        error: () => {
          // Asset missing or network error — fail silently
        },
      });
  }

  /** Dismiss the release notes dialog and persist the seen version */
  dismissReleaseNotes(): void {
    const version = this.releaseNotes()?.version;
    if (version && !this.showingFullChangelog()) {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, version);
    }
    this.showReleaseNotes.set(false);
    this.showingFullChangelog.set(false);
  }

  /**
   * Manually open the full changelog (all versions).
   * Called from the navbar menu item.
   */
  openChangelog(): void {
    this.http.get<ReleaseEntry[]>('/assets/release-notes.json').subscribe({
      next: (entries) => {
        this.allReleaseEntries.set(entries);
        this.showingFullChangelog.set(true);
        this.showReleaseNotes.set(true);
      },
      error: () => { /* fail silently */ },
    });
  }

  /** Returns the version from the NGSW appData, or null when SW is unavailable */
  private getAppVersion(): string | null {
    try {
      // SwUpdate exposes appData on the VERSION_READY event, but we can also
      // read it from the cached ngsw.json or simply fall back to the manifest.
      // The simplest reliable approach: read from the global NGSW state.
      // Angular embeds appData in the registration as a meta tag when using
      // the default ngsw config; we parse it from ngsw-config via a build step.
      // For now, we fetch it lazily from the SW registration if available,
      // otherwise we leave version detection to the VERSION_READY flow.
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Version is injected into index.html as a meta tag by the build step.
        const meta = document.querySelector<HTMLMetaElement>('meta[name="app-version"]');
        if (meta?.content) return meta.content;
      }
      // Fallback: read from the meta tag unconditionally (set by ng build via index transform)
      const meta = document.querySelector<HTMLMetaElement>('meta[name="app-version"]');
      return meta?.content ?? null;
    } catch {
      return null;
    }
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
    localStorage.removeItem(PwaService.BANNER_DISMISSED_KEY);
    this.bannerDismissed.set(false);
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

  /** Dismiss the install banner permanently (persisted in localStorage) */
  dismissInstall(): void {
    localStorage.setItem(PwaService.BANNER_DISMISSED_KEY, 'true');
    this.bannerDismissed.set(true);
  }
}
