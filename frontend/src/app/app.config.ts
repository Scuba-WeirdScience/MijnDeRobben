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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideSignalFormsConfig({ classes: {} }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
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


