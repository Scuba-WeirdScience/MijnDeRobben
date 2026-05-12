import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideSignalFormsConfig } from '@angular/forms/signals';
import { provideServiceWorker } from '@angular/service-worker';

// Trigger Firebase initialization on app bootstrap
import '@fire';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { ThemeService } from './core/services/theme.service';
import { PwaService } from './core/services/pwa.service';

function initTheme(theme: ThemeService) {
  return () => {};
}

function initPwa(pwa: PwaService) {
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
      await Promise.all(registrations.map(r => r.unregister()));
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideSignalFormsConfig({ classes: {} }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately',
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

