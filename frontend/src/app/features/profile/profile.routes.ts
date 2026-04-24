import { Routes } from '@angular/router';

export const profileRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'brevetten',
    loadComponent: () =>
      import('./mijn-brevetten.component').then(m => m.MijnBrevettenComponent)
  }
];
