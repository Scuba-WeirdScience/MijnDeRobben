import { Routes } from '@angular/router';

export const membersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./member-list/member-list.component').then(m => m.MemberListComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./member-detail/member-detail.component').then(m => m.MemberDetailComponent)
  }
];
