import { Routes } from '@angular/router';
import { AuthGuard } from '../../../core-logic/auth/guards/auth.guard';

export default [
  {
    path: ':bookingId/fulfillment',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    data: {
      roles: ['staff', 'admin'],
    },
    loadComponent: () =>
      import('./pages/fulfillment-page/fulfillment-page').then((module) => module.FulfillmentPage),
  },
] as Routes;
