import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, take } from 'rxjs';
import { BookingDetailsDto, BookingStatus } from '../../../../contract';
import { UserService } from '../../../core-logic/user/user.service';
import { BookingsService } from '../../../core-logic/bookings/bookings.service';

@Component({
  selector: 'app-bookings-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButton, MatIcon],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'booking-page block',
  },
})
export class BookingsPage {
  private readonly bookingsService = inject(BookingsService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  private currentRenterId: string | null = null;

  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  private readonly allBookings = signal<BookingDetailsDto[]>([]);

  readonly activeBookings = computed(() => this.filterBookings([BookingStatus.Verified]));
  readonly pendingBookings = computed(() =>
    this.filterBookings([BookingStatus.PendingVerification]),
  );
  readonly historyBookings = computed(() => this.filterBookings([BookingStatus.RentalCreated]));
  readonly cancelledBookings = computed(() => this.filterBookings([BookingStatus.Cancelled]));

  constructor() {
    const renterId = this.userService.renterId;
    if (renterId) {
      this.loadBookings(renterId);
      return;
    }

    this.userService
      .getUser()
      .pipe(takeUntilDestroyed(this.destroyRef), take(1))
      .subscribe({
        next: () => {
          const resolvedRenterId = this.userService.renterId ?? null;
          if (!resolvedRenterId) {
            this.error.set('Không tìm thấy mã người thuê.');
            this.isLoading.set(false);
            return;
          }
          this.loadBookings(resolvedRenterId);
        },
        error: () => {
          this.error.set('Không thể tải thông tin người thuê.');
          this.isLoading.set(false);
        },
      });
  }

  refresh(): void {
    if (!this.currentRenterId) {
      this.error.set('Không tìm thấy mã người thuê để tải lại.');
      return;
    }
    this.loadBookings(this.currentRenterId);
  }

  trackByBookingId(_: number, booking: BookingDetailsDto): string {
    return booking.bookingId ?? `${_}`;
  }

  getStatusLabel(status?: string | null): string {
    const normalized = this.normalizeStatus(status);
    if (!normalized) {
      return 'Không xác định';
    }
    return {
      [BookingStatus.PendingVerification]: 'Chờ xác minh',
      [BookingStatus.Verified]: 'Đã xác minh',
      [BookingStatus.RentalCreated]: 'Đã hoàn tất',
      [BookingStatus.Cancelled]: 'Đã hủy',
    }[normalized];
  }

  statusKey(status?: string | null): string {
    return this.normalizeStatus(status) ?? 'unknown';
  }

  formatDateTime(value?: string | null): string {
    if (!value) {
      return 'Không xác định';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) {
      return value;
    }

    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  }

  private loadBookings(renterId: string): void {
    this.currentRenterId = renterId;
    this.isLoading.set(true);
    this.error.set(null);

    this.bookingsService
      .getBookings(renterId, undefined, 100)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        take(1),
        catchError(() => {
          this.error.set('Không thể tải danh sách đặt xe. Vui lòng thử lại.');
          this.isLoading.set(false);
          return of<BookingDetailsDto[] | null>(null);
        }),
      )
      .subscribe((items) => {
        if (!items) {
          return;
        }

        this.allBookings.set(this.sortBookings(items));
        this.isLoading.set(false);
      });
  }

  private filterBookings(statuses: readonly BookingStatus[]): BookingDetailsDto[] {
    const allowed = new Set(statuses);
    return this.allBookings().filter((booking) => {
      const normalized = this.normalizeStatus(booking.status);
      if (!normalized) {
        return false;
      }
      return allowed.has(normalized);
    });
  }

  private sortBookings(bookings: readonly BookingDetailsDto[]): BookingDetailsDto[] {
    return [...(bookings ?? [])].sort(
      (first, second) => this.toTime(second.bookingCreatedAt) - this.toTime(first.bookingCreatedAt),
    );
  }

  private normalizeStatus(status?: string | null): BookingStatus | null {
    if (!status) {
      return null;
    }
    if (this.isKnownStatus(status)) {
      return status;
    }
    return null;
  }

  private isKnownStatus(status: string): status is BookingStatus {
    return Object.values(BookingStatus).includes(status as BookingStatus);
  }

  private toTime(value?: string | null): number {
    if (!value) {
      return 0;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
