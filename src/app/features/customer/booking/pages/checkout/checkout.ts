import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { UserService } from '../../../../../core-logic/user/user.service';
import { BookingsService } from '../../../../../core-logic/bookings/bookings.service';
import { PaymentsService } from '../../../../../core-logic/payments/payments.service';
import { Currency, CreateBookingRequest } from '../../../../../../contract';
import { VehicleDetailsDto } from '../../../../../../contract';
import { Station } from '../../../../../core-logic/station/station.type';
import { catchError, of, switchMap } from 'rxjs';
import { BookingStorageService } from '../../services/booking-storage.service';

export interface BookingData {
  vehicle: VehicleDetailsDto;
  station: Station;
  bookingEstimate: {
    days: number;
    dayTotal: number;
    hours: number;
    hourTotal: number;
    total: number;
  };
  depositPrice: number | null;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [MatButton, MatIcon],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkout {
  private readonly userService = inject(UserService);
  private readonly bookingsService = inject(BookingsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly bookingStorage = inject(BookingStorageService);

  readonly stepIndex = input<number>(0);
  readonly stepKey = input<'details' | 'checkout' | 'payment' | 'deposit'>('checkout');
  readonly bookingData = input<BookingData | null>(null);

  readonly nextStep = output<void>();
  readonly previousStep = output<void>();

  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly isActiveStep = computed(() => this.stepKey() === 'checkout');

  readonly user = computed(() => this.userService.user);
  readonly userName = computed(() => this.user()?.userName ?? '');
  readonly phoneNumber = computed(() => this.user()?.phoneNumber ?? '');

  readonly vehicleName = computed(() => {
    const vehicle = this.bookingData()?.vehicle;
    if (!vehicle) return '';

    const parts: string[] = [];
    if (vehicle.make) parts.push(vehicle.make);
    if (vehicle.model) parts.push(vehicle.model);
    return parts.length ? parts.join(' ') : 'Xe chưa xác định';
  });

  readonly formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  readonly formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  private combineDateAndTime(date: Date, time: string): Date | null {
    if (!time) {
      return null;
    }

    const [hoursStr, minutesStr = '0'] = time.split(':');
    const hours = Number.parseInt(hoursStr ?? '', 10);
    const minutes = Number.parseInt(minutesStr ?? '', 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }

    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  private formatDateTimeISO(date: Date | null): string | undefined {
    if (!date) return undefined;
    return date.toISOString();
  }

  confirmBooking(): void {
    const data = this.bookingData();
    const renterId = this.userService.renterId;

    if (!data || !renterId) {
      this.error.set('Thiếu thông tin đặt xe hoặc mã người thuê.');
      return;
    }

    const startDateTime = this.combineDateAndTime(data.startDate, data.startTime);
    const endDateTime = this.combineDateAndTime(data.endDate, data.endTime);

    if (!startDateTime || !endDateTime) {
      this.error.set('Thông tin thời gian không hợp lệ.');
      return;
    }

    const request: CreateBookingRequest = {
      renterId,
      vehicleAtStationId: data.vehicle.vehicleAtStationId ?? undefined,
      startTime: this.formatDateTimeISO(startDateTime),
      endTime: this.formatDateTimeISO(endDateTime),
      depositAmount: data.depositPrice ?? undefined,
      depositCurrency: data.depositPrice ? Currency.Vnd : undefined,
      depositDescription: data.depositPrice
        ? `Đặt cọc cho thuê xe ${this.vehicleName()}`
        : undefined,
      // Payment fields will be handled in deposit step
      paymentMethod: undefined,
      amountPaid: undefined,
      paidAt: undefined,
      providerReference: undefined,
    };

    this.isLoading.set(true);
    this.error.set(null);
    this.cdr.markForCheck();

    this.bookingsService
      .createBooking(request)
      .pipe(
        switchMap((bookingResponse) => {
          if (!bookingResponse?.isSuccess) {
            throw new Error(bookingResponse?.message ?? 'Không thể tạo đặt xe.');
          }

          // Extract bookingId from response
          // The data field might be a string (bookingId) or an object with bookingId
          let bookingId: string | undefined;
          if (typeof bookingResponse.data === 'string') {
            bookingId = bookingResponse.data;
          } else if (bookingResponse.data && typeof bookingResponse.data === 'object') {
            bookingId = (bookingResponse.data as { bookingId?: string }).bookingId;
          }

          if (!bookingId) {
            throw new Error('Không thể lấy mã đặt xe từ phản hồi.');
          }

          this.bookingStorage.saveDraft(bookingId, data);

          // Create payment using PaymentsService
          return this.paymentsService.createPayment(
            bookingId,
            data.bookingEstimate.total,
            this.vehicleName(),
          );
        }),
        catchError((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : 'Không thể tạo thanh toán. Vui lòng thử lại.';
          this.error.set(errorMessage);
          this.isLoading.set(false);
          this.cdr.markForCheck();
          return of(null);
        }),
      )
      .subscribe({
        next: (paymentResponse) => {
          if (!paymentResponse) {
            return;
          }

          if (paymentResponse.isSuccess && paymentResponse.data?.paymentUrl) {
            // Emit nextStep to notify parent to move to payment step
            // Use setTimeout to ensure parent processes the event before redirect
            this.nextStep.emit();
            const paymentUrl = paymentResponse.data.paymentUrl.trim();
            if (paymentUrl) {
              // Small delay to allow parent to update step before redirect
              setTimeout(() => {
                window.location.href = paymentUrl;
              }, 100);
            } else {
              this.error.set('URL thanh toán không hợp lệ.');
              this.isLoading.set(false);
              this.cdr.markForCheck();
            }
          } else {
            this.error.set(
              paymentResponse.message ?? 'Không thể tạo liên kết thanh toán. Vui lòng thử lại.',
            );
            this.isLoading.set(false);
            this.cdr.markForCheck();
          }
        },
        error: (error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo thanh toán.';
          this.error.set(errorMessage);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }
}
