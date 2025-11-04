export * from './account.service';
import { AccountService } from './account.service';
export * from './booking.service';
import { BookingService } from './booking.service';
export * from './rental.service';
import { RentalService } from './rental.service';
export * from './stations.service';
import { StationsService } from './stations.service';
export const APIS = [AccountService, BookingService, RentalService, StationsService];
