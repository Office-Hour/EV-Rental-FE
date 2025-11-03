import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { NoAuthGuard } from './core-logic/auth/guards/noAuth.guard';
import { AuthGuard } from './core-logic/auth/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'landing' },
  { path: 'signed-in-redirect', pathMatch: 'full', redirectTo: 'booking' },

  //Guest routes
  {
    path: '',
    canActivate: [NoAuthGuard],
    canActivateChild: [NoAuthGuard],
    children: [
      {
        path: 'confirmation-required',
        loadChildren: () =>
          import('./features/auth/confirmation-required/confirmation-required.routes'),
      },
      {
        path: 'forgot-password',
        loadChildren: () => import('./features/auth/forgot-password/forgot-password.routes'),
      },
      {
        path: 'reset-password',
        loadChildren: () => import('./features/auth/reset-password/reset-password.routes'),
      },
      { path: 'sign-in', loadChildren: () => import('./features/auth/sign-in/sign-in.routes') },
      { path: 'sign-up', loadChildren: () => import('./features/auth/sign-up/sign-up.routes') },
    ],
  },

  // Auth shared (sign-out)
  {
    path: '',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    component: LayoutComponent,
    children: [
      { path: 'sign-out', loadChildren: () => import('./features/auth/sign-out/sign-out.routes') },
    ],
  },

  // public routes - guest only access landing
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'landing',
        loadChildren: () => import('./features/landing/landing.routes'),
      },
      {
        path: 'error-page',
        canActivate: [NoAuthGuard],
        canActivateChild: [NoAuthGuard],
        loadChildren: () => import('./features/auth/error-page/error-page.routes'),
      },
    ],
  },

  // Admin area (chỉ Admin)
  {
    path: '',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    data: {
      roles: ['admin'],
    },
    component: LayoutComponent,
    children: [{ path: 'admin', loadChildren: () => import('./features/admin/admin.routes') }],
  },

  // Staff area (Staff hoặc Admin)
  {
    path: '',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    data: {
      roles: ['staff', 'admin'],
    },
    component: LayoutComponent,
    children: [{ path: 'staff', loadChildren: () => import('./features/staff/staff.routes') }],
  },

  // Customer area (Customer hoặc Admin)
  {
    path: '',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    data: {
      roles: ['customer', 'admin'],
    },
    component: LayoutComponent,
    children: [
      { path: 'booking', loadChildren: () => import('./features/customer/booking/booking.routes') },
    ],
  },
];
