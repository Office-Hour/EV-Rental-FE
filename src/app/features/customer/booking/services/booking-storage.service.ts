import { Injectable, inject } from '@angular/core';
import { SessionService } from '../../../../core-logic/storage/session.service';
import { BookingData } from '../pages/checkout/checkout';

type StoredBookingDraft = Omit<BookingData, 'startDate' | 'endDate'> & {
  readonly startDate: string;
  readonly endDate: string;
};

@Injectable({ providedIn: 'root' })
export class BookingStorageService {
  private readonly session = inject(SessionService);
  private readonly storageKeyPrefix = 'booking-draft:';

  saveDraft(bookingId: string, data: BookingData): void {
    const payload: StoredBookingDraft = {
      ...data,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
    };
    this.session.setJson(this.composeKey(bookingId), payload);
  }

  loadDraft(bookingId: string): BookingData | null {
    const parsed = this.session.getJson<StoredBookingDraft>(this.composeKey(bookingId));
    if (!parsed) {
      return null;
    }

    const startDate = new Date(parsed.startDate);
    const endDate = new Date(parsed.endDate);

    if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
      return null;
    }

    return {
      ...parsed,
      startDate,
      endDate,
    };
  }

  removeDraft(bookingId: string): void {
    this.session.removeItem(this.composeKey(bookingId));
  }

  private composeKey(bookingId: string): string {
    return `${this.storageKeyPrefix}${bookingId}`;
  }
}
