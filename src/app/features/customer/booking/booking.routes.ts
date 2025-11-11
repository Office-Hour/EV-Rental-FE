import { Routes } from '@angular/router';
import { BookingDetail } from './pages/booking-detail/booking-detail';
import { CarList } from './pages/car-list/car-list';
import { CarsPage } from './pages/cars-page/cars-page';
import { Payment } from './pages/payment/payment';
import { BookingsPage } from './booking';

export default [
  {
    path: 'cars/:id',
    component: CarsPage,
  },
  {
    path: 'cars',
    component: CarList,
  },
  {
    path: 'bookings',
    component: BookingsPage,
  },
  {
    path: 'bookings/:id',
    component: BookingDetail,
  },
  {
    path: 'payment',
    component: Payment,
  },
] as Routes;
