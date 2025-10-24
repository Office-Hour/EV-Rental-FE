import { Routes } from '@angular/router';
import { Layout } from './layout/layout';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'signed-in-redirect', pathMatch: 'full', redirectTo: 'home' },

  // Landing routes
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'landing',
        loadChildren: () => import('./features/landing/landing.route'),
      },
    ],
  },
];
