import { Routes } from '@angular/router';

import { RentalManagement } from './rental-management/rental-management';
import { RenterManagement } from './renter-management/renter-management';
import { VehicleManagement } from './vehicle-management/vehicle-management';
import { StaffDashboard } from './staff-dashboard/staff-dashboard';

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'bookings',
  },
  {
    path: 'fulfillment/:bookingId',
    loadChildren: () => import('./booking-fulfillment/booking-fulfillment.routes'),
  },
  {
    path: 'bookings',
    component: StaffDashboard,
  },
  {
    path: 'vehicles',
    component: VehicleManagement,
  },
  {
    path: 'customers',
    pathMatch: 'full',
    redirectTo: 'renters',
  },
  {
    path: 'renters',
    component: RenterManagement,
  },
  {
    path: 'rentals',
    component: RentalManagement,
  },
] as Routes;
