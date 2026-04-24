import { Routes } from '@angular/router';

export const berichtenRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./berichten-page.component').then(m => m.BerichtenPageComponent)
  }
];
