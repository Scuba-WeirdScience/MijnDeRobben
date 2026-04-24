import { Routes } from '@angular/router';

export const leningRoutes: Routes = [
  {
    path: ':id',
    loadComponent: () =>
      import('./scan-materiaal.component').then(m => m.ScanMateriaalComponent)
  }
];
