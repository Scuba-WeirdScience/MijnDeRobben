import { Routes } from '@angular/router';

export const berichtenRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./berichten-page.component').then(m => m.BerichtenPageComponent),
    children: [
      { path: '', pathMatch: 'full', children: [] },
      { path: ':groepId', children: [] },
      { path: ':groepId/:threadId', children: [] },
    ]
  }
];
