import { Routes } from '@angular/router';
import { AuthGuard } from './core-logic/auth/guards/auth.guard';
import { NoAuthGuard } from './core-logic/auth/guards/noAuth.guard';
import { LayoutComponent } from './layout/layout';

// Auth components
import { ConfirmationRequiredComponent } from './features/auth/confirmation-required/confirmation-required.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { SignInComponent } from './features/auth/sign-in/sign-in.component';
import { SignUpComponent } from './features/auth/sign-up/sign-up.component';
import { SignOutComponent } from './features/auth/sign-out/sign-out.component';
import { ErrorPageComponent } from './features/auth/error-page/error-page';

// Landing component
import { Landing } from './features/landing/landing';

// Customer/Booking components
import { CarList } from './features/customer/booking/pages/car-list/car-list';
import { CarDetail } from './features/customer/booking/pages/car-detail/car-detail';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'landing' },

  // Guest routes
  {
    path: '',
    canActivate: [NoAuthGuard],
    canActivateChild: [NoAuthGuard],
    component: LayoutComponent,
    children: [
      {
        path: 'confirmation-required',
        component: ConfirmationRequiredComponent,
      },
      {
        path: 'forgot-password',
        component: ForgotPasswordComponent,
      },
      {
        path: 'reset-password',
        component: ResetPasswordComponent,
      },
      { path: 'sign-in', component: SignInComponent },
      { path: 'sign-up', component: SignUpComponent },
      {
        path: 'error-page',
        canActivate: [NoAuthGuard],
        canActivateChild: [NoAuthGuard],
        component: ErrorPageComponent,
      },
    ],
  },

  // Auth shared (sign-out)
  {
    path: '',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [{ path: 'sign-out', component: SignOutComponent }],
  },

  // Public routes with layout
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'landing',
        component: Landing,
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
      roles: ['renter', 'admin'],
    },
    component: LayoutComponent,
    children: [
      { path: 'booking', component: CarList },
      { path: 'booking/cars/:id', component: CarDetail },
    ],
  },

  // Wildcard route - catch all unmatched routes and show error page
  {
    path: '**',
    redirectTo: 'error-page?type=404',
  },
];
