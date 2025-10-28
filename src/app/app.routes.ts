import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'signed-in-redirect', pathMatch: 'full', redirectTo: 'home' },

  // Landing routes
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'landing',
        loadChildren: () => import('./features/landing/landing.route'),
      },
      {
        path: 'booking',
        loadChildren: () => import('./features/booking/booking.route'),
      },
    ],
  },
];
