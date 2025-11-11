import { Routes } from '@angular/router';
import { StaffDashboard } from './staff-dashboard/staff-dashboard';
import { StaffBookingDetailComponent } from './booking-detail/booking-detail';
import { RentalManagement } from './rental-management/rental-management';
import { RenterManagement } from './renter-management/renter-management';
import { VehicleManagement } from './vehicle-management/vehicle-management';

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
    path: 'bookings/:bookingId',
    component: StaffBookingDetailComponent,
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
