import { Routes } from '@angular/router';
import { CarList } from './pages/car-list/car-list';
import { CarDetail } from './pages/car-detail/car-detail';
import { Checkout } from './pages/checkout/checkout';
import { Deposit } from './pages/deposit/deposit';

export default [
  {
    path: 'cars',
    component: CarList,
  },
  {
    path: 'cars/:id',
    component: CarDetail,
  },
  {
    path: 'checkout',
    component: Checkout,
  },
  {
    path: 'deposit',
    component: Deposit,
  },
] as Routes;
