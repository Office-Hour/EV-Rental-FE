import { Routes } from '@angular/router';
import { StaffDashboard } from './staff-dashboard/staff-dashboard';
import { RentalManagement } from './rental-management/rental-management';
import { VehicleManagement } from './vehicle-management/vehicle-management';
import { RenterManagement } from './renter-management/renter-management';

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'bookings',
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
    path: 'renters',
    component: RenterManagement,
  },
  {
    path: 'rentals',
    component: RentalManagement,
  },
] as Routes;
