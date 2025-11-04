import { Car } from '../car/car.type';
import { User } from '../user/user.types';

export interface Booking {
  id: string;
  car: Car;
  user: User;
  status: BookingStatus;
  startDate: Date;
  endDate: Date;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
