import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BookingBriefDto, VehicleDetailsDto } from '../../../../../../contract';

interface CarCardProps {
  readonly car: VehicleDetailsDto;
  readonly stationName?: string;
}

interface Metric {
  readonly icon: string;
  readonly label: string;
  readonly value: string;
}

interface PriceEntry {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
});

@Component({
  selector: 'app-car-card',
  imports: [MatIconModule, RouterLink],
  templateUrl: './car-card.html',
  styleUrl: './car-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class CarCard {
  readonly props = input.required<CarCardProps>();

  readonly detailLink = computed(() => {
    const { car } = this.props();
    const identifier = car.vehicleId ?? car.vehicleAtStationId;
    return identifier ? ['/cars', identifier] : null;
  });

  readonly title = computed(() => {
    const { car } = this.props();
    const { make, model } = car;
    const parts = [make, model].filter(
      (value): value is string => !!value && value.trim().length > 0,
    );
    if (parts.length > 0) {
      return parts.join(' ');
    }

    return 'Xe chưa xác định';
  });

  readonly upcomingStatus = computed(() => {
    const { car } = this.props();
    const bookings = (car.upcomingBookings ?? []).filter(
      (
        booking,
      ): booking is BookingBriefDto & {
        startDate: string;
      } => !!booking.startDate,
    );

    if (bookings.length === 0) {
      return undefined;
    }

    bookings.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const nextBooking = bookings[0];
    const nextBookingDate = new Date(nextBooking.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextBookingDate.setHours(0, 0, 0, 0);

    const daysUntilBooking = Math.ceil(
      (nextBookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Chỉ hiển thị nếu lịch trống trên 1 ngày
    if (daysUntilBooking > 1) {
      const formattedDate = DATE_FORMATTER.format(nextBookingDate);
      return `Trống đến ${formattedDate}`;
    }

    return undefined;
  });

  readonly metrics = computed<Metric[]>(() => {
    const { car, stationName } = this.props();
    const metrics: Metric[] = [];

    if (typeof car.rangeKm === 'number') {
      metrics.push({ icon: 'route', label: 'Phạm vi', value: `${car.rangeKm} km` });
    }

    if (typeof car.currentBatteryCapacityKwh === 'number') {
      metrics.push({
        icon: 'battery_charging_full',
        label: 'Dung lượng pin',
        value: `${car.currentBatteryCapacityKwh} kWh`,
      });
    }

    if (stationName || car.vehicleAtStationId) {
      metrics.push({
        icon: 'location_on',
        label: 'Trạm',
        value: stationName ?? '',
      });
    }

    return metrics;
  });

  readonly pricing = computed<PriceEntry[]>(() => {
    const { car } = this.props();
    const pricing: PriceEntry[] = [];

    const dailyPrice = this._formatCurrency(car.rentalPricePerDay);
    if (dailyPrice) {
      pricing.push({ label: 'Giá theo ngày', value: dailyPrice, unit: '/ngày' });
    }

    return pricing;
  });

  private _formatCurrency(value: number | null | undefined): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    return CURRENCY_FORMATTER.format(value);
  }
}
