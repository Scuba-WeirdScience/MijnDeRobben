import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideSignalFormsConfig } from '@angular/forms/signals';
import { provideServiceWorker } from '@angular/service-worker';

// Trigger Firebase initialization on app bootstrap
import '@fire';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { ThemeService } from './core/services/theme.service';
import { PwaService } from './core/services/pwa.service';

function initTheme(_theme: ThemeService) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return () => {};
}

function initPwa(_pwa: PwaService) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return () => {};
}

/**
 * In dev mode, unregister any stale service workers left over from a previous
 * production/staging build. Without this, a cached SW keeps intercepting
 * Firestore streaming requests and crashing them.
 */
function unregisterStaleServiceWorkers() {
  return async () => {
    if (isDevMode() && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withXhr(), withInterceptors([authInterceptor, errorInterceptor])),
    provideSignalFormsConfig({ classes: {} }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: unregisterStaleServiceWorkers,
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initTheme,
      deps: [ThemeService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initPwa,
      deps: [PwaService],
      multi: true,
    },
  ],
};
