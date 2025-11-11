import { Routes } from '@angular/router';
import { StaffDashboard } from './staff-dashboard/staff-dashboard';
import { RentalManagement } from './rental-management/rental-management';
import { StaffBookingDetailComponent } from './booking-detail/booking-detail';

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'bookings',
  },
  {
    path: 'bookings/:bookingId',
    component: StaffBookingDetailComponent,
  },
  {
    path: 'bookings',
    component: StaffDashboard,
  },
  {
    path: 'rentals',
    component: RentalManagement,
  },
] as Routes;
