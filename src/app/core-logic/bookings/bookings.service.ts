import { inject, Injectable } from '@angular/core';
import { BookingService } from '../../../contract';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private _bookingService = inject(BookingService);
}
