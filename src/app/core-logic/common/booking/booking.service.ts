import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Booking } from './booking.type';
import { HttpClient } from '@angular/common/http';
import { BOOKING_ENDPOINTS } from '../../api.config';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private _httpClient = inject(HttpClient);
  private _bookings = signal<Booking[]>([]);

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter & Setter for the bookings signal
   */
  get bookings(): Booking[] {
    return this._bookings();
  }
  set bookings(bookings: Booking[]) {
    this._bookings.set(bookings);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get the bookings from the API
   */
  getBookings(): Observable<Booking[]> {
    return this._httpClient
      .get<Booking[]>(BOOKING_ENDPOINTS.list)
      .pipe(tap((bookings) => this._bookings.set(bookings)));
  }
}
