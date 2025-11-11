import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { QRCodeComponent } from 'angularx-qrcode';
import { ActivatedRoute } from '@angular/router';
import { BookingData } from '../checkout/checkout';
import { BookingStorageService } from '../../services/booking-storage.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [MatIcon, QRCodeComponent],
  templateUrl: './booking-detail.html',
  styleUrl: './booking-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingStorage = inject(BookingStorageService);

  private readonly routeBookingId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id')?.trim() ?? '')),
    {
      initialValue: '',
    },
  );

  readonly bookingId = computed(() => this.routeBookingId());
  readonly bookingData = signal<BookingData | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly qrLogoUrl = 'hoang-logo-text-dark.webp';
  readonly hasBookingId = computed(() => !!this.bookingId());

  constructor() {
    effect(() => {
      const id = this.routeBookingId();

      if (!id) {
        this.bookingData.set(null);
        this.error.set(null);
        this.isLoading.set(true);
        return;
      }

      this.isLoading.set(true);
      this.error.set(null);

      const draft = this.bookingStorage.loadDraft(id);
      if (draft) {
        this.bookingData.set(draft);
        this.isLoading.set(false);
        return;
      }

      this.bookingData.set(null);
      this.isLoading.set(false);
      this.error.set('Không tìm thấy thông tin đặt xe cho mã đã cung cấp.');
    });
  }

  readonly vehicleName = computed(() => {
    const vehicle = this.bookingData()?.vehicle;
    if (!vehicle) return '';

    const parts: string[] = [];
    if (vehicle.make) parts.push(vehicle.make);
    if (vehicle.model) parts.push(vehicle.model);
    return parts.length ? parts.join(' ') : 'Xe chưa xác định';
  });

  readonly formatDate = (date: Date | string | null | undefined): string => {
    const normalized = date instanceof Date ? date : date ? new Date(date) : new Date(Number.NaN);

    if (Number.isNaN(normalized.valueOf())) {
      return '';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(normalized);
  };
}
