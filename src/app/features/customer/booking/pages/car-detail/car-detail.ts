import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import {
  DateRange,
  MatCalendarCellClassFunction,
  MatDateRangeInput,
  MatDateRangePicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import {
  Observable,
  catchError,
  distinctUntilChanged,
  filter,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { BookingBriefDto, VehicleDetailsDto } from '../../../../../../contract';
import { StationService } from '../../../../../core-logic/station/station.service';
import { Station } from '../../../../../core-logic/station/station.type';

const HOUR_OPTIONS = Array.from(
  { length: 24 },
  (_, hour) => `${hour.toString().padStart(2, '0')}:00`,
);

const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const TIME_ORDER_ERROR = 'Giờ trả phải sau giờ nhận.';

@Component({
  selector: 'app-car-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    MatIconModule,
    DecimalPipe,
  ],
  templateUrl: './car-detail.html',
  styleUrl: './car-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarDetail {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly stationService = inject(StationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly hourOptions = HOUR_OPTIONS;
  readonly rangeError = signal<string>('');
  readonly selectedRange = signal<DateRange<Date> | null>(null);
  readonly vehicle = signal<VehicleDetailsDto | undefined>(undefined);
  readonly stationInfo = signal<{ name: string; address: string } | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);
  readonly bookingEstimate = signal<{
    days: number;
    dayTotal: number;
    hours: number;
    hourTotal: number;
    total: number;
  } | null>(null);

  readonly form = new FormGroup({
    range: new FormGroup({
      start: new FormControl<Date | null>(null, Validators.required),
      end: new FormControl<Date | null>(null, Validators.required),
    }),
    startTime: new FormControl<string>('', Validators.required),
    endTime: new FormControl<string>('', Validators.required),
  });

  readonly bookedDateKeys = computed(() =>
    this.buildBookingKeySet(this.vehicle()?.upcomingBookings ?? []),
  );

  readonly vehicleName = computed(() => {
    const details = this.vehicle();
    if (!details) {
      return 'Đang tải thông tin xe…';
    }

    const parts: string[] = [];
    if (details.make) {
      parts.push(details.make);
    }
    if (details.model) {
      parts.push(details.model);
    }

    return parts.length ? parts.join(' ') : 'Xe chưa xác định';
  });

  readonly pricePerDay = computed(() =>
    this.formatCurrency(this.vehicle()?.rentalPricePerDay ?? undefined),
  );

  readonly vehicleMetrics = computed(() => {
    const details = this.vehicle();
    const station = this.stationInfo();
    if (!details) {
      return [];
    }

    const metrics: { icon: string; label: string; value: string }[] = [];

    // Make and Model
    if (details.make) {
      metrics.push({ icon: 'badge', label: 'Hãng', value: details.make });
    }

    if (details.model) {
      metrics.push({ icon: 'label', label: 'Model', value: details.model });
    }

    // Model Year
    if (details.modelYear) {
      metrics.push({
        icon: 'calendar_today',
        label: 'Năm sản xuất',
        value: `${details.modelYear}`,
      });
    }

    // Range
    if (typeof details.rangeKm === 'number') {
      metrics.push({ icon: 'route', label: 'Phạm vi', value: `${details.rangeKm} km` });
    }

    // Battery
    if (typeof details.currentBatteryCapacityKwh === 'number') {
      metrics.push({
        icon: 'battery_charging_full',
        label: 'Dung lượng pin',
        value: `${details.currentBatteryCapacityKwh} kWh`,
      });
    }

    // Station Name
    if (station?.name) {
      metrics.push({ icon: 'location_on', label: 'Trạm', value: station.name });
    }

    // Station Address
    if (station?.address) {
      metrics.push({ icon: 'place', label: 'Địa chỉ trạm', value: station.address });
    }

    return metrics;
  });

  readonly hasPricing = computed(() => !!this.pricePerDay());
  readonly hasAvailability = computed(() => {
    const vehicle = this.vehicle();
    if (!vehicle) {
      return false;
    }
    return this.vehicleHasFullDayAvailability(vehicle);
  });
  readonly submitReadiness = computed(() => ({
    formValid: this.form.valid,
    hasEstimate: !!this.bookingEstimate(),
    hasAvailability: this.hasAvailability(),
  }));
  readonly canSubmit = computed(() => {
    const readiness = this.submitReadiness();
    return readiness.formValid && readiness.hasEstimate && readiness.hasAvailability;
  });

  readonly dateClass: MatCalendarCellClassFunction<Date> = (cellDate) =>
    this.bookedDateKeys().has(this.formatDateKey(cellDate)) ? 'busy-date' : '';

  readonly isDateAvailable = (date: Date | null): boolean => {
    if (!date) {
      return true;
    }

    return !this.bookedDateKeys().has(this.formatDateKey(date));
  };

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')?.trim() ?? ''),
        filter((id) => id.length > 0),
        distinctUntilChanged(),
        tap(() => {
          this.isLoading.set(true);
          this.loadError.set(null);
        }),
        switchMap((vehicleId) =>
          this._loadStationsIfNeeded().pipe(
            map((stations) => this._findVehicleInStations(stations, vehicleId)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.isLoading.set(false);

        if (!result) {
          this.vehicle.set(undefined);
          this.stationInfo.set(null);
          if (!this.loadError()) {
            this.loadError.set('Không tìm thấy thông tin xe.');
          }
          this.cdr.markForCheck();
          return;
        }

        this.vehicle.set(result.vehicle);
        this.stationInfo.set({
          name: result.station.name,
          address: result.station.address,
        });
        this.loadError.set(null);

        const available = this.vehicleHasFullDayAvailability(result.vehicle);
        if (!available) {
          this.loadError.set('Xe hiện không còn ngày trống tối thiểu 1 ngày.');
        } else {
          this.loadError.set(null);
          if (available) {
            this.resetFormState();
            this.updateBookingEstimate();
          }
        }

        this.cdr.markForCheck();
      });

    const rangeGroup = this.form.controls.range;
    const startCtrl = rangeGroup.controls.start;
    const endCtrl = rangeGroup.controls.end;

    rangeGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((val) => {
      const start = val?.start ?? null;
      const end = val?.end ?? null;

      startCtrl.setErrors(null);
      endCtrl.setErrors(null);
      this.rangeError.set('');

      if (start && end && this.rangeContainsBooked(start, end)) {
        const errKey = 'rangeConflict';
        this.rangeError.set('Khoảng thời gian đã chọn chứa lịch đặt trước. Vui lòng chọn lại.');
        startCtrl.setErrors({ ...(startCtrl.errors ?? {}), [errKey]: true });
        endCtrl.setErrors({ ...(endCtrl.errors ?? {}), [errKey]: true });
        startCtrl.markAsTouched();
        startCtrl.markAsDirty();
        endCtrl.markAsTouched();
        endCtrl.markAsDirty();
      }

      if (start && !end) {
        this.selectedRange.set(new DateRange(start, null));
      } else if (start && end) {
        this.selectedRange.set(new DateRange(start, end));
      } else {
        this.selectedRange.set(null);
      }

      this.updateBookingEstimate();
      this.cdr.markForCheck();
    });

    this.form.controls.startTime.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateBookingEstimate());
    this.form.controls.endTime.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateBookingEstimate());
  }

  onRangeChange(
    range: DateRange<Date> | null,
    picker: MatDateRangePicker<Date>,
    input: MatDateRangeInput<Date>,
  ): void {
    const start = range?.start ?? null;
    const end = range?.end ?? null;

    if (!start) {
      this.rangeError.set('');
      this.selectedRange.set(null);
      this.clearRangeControlState(input);
      return;
    }

    if (end) {
      if (this.rangeContainsBooked(start, end)) {
        this.rangeError.set('Khoảng thời gian đã chọn chứa lịch đặt trước.');
        this.markRangeControlInvalid(input);
        this.selectedRange.set(range);
        picker.close();
        return;
      }

      this.rangeError.set('');
      this.selectedRange.set(range);
      this.clearRangeControlState(input);
      picker.close();
      return;
    }

    this.rangeError.set('');
    this.selectedRange.set(range);
    this.clearRangeControlState(input);
  }

  submitBooking(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    // Placeholder for future booking submission logic.
  }

  private resetFormState(): void {
    this.form.reset({
      range: {
        start: null,
        end: null,
      },
      startTime: '',
      endTime: '',
    });
    this.rangeError.set('');
    this.selectedRange.set(null);
  }

  private updateBookingEstimate(): void {
    const range = this.form.controls.range.value;
    const start = range?.start ?? null;
    const end = range?.end ?? null;
    const startTime = this.form.controls.startTime.value ?? '';
    const endTime = this.form.controls.endTime.value ?? '';
    const pricePerDay = this.vehicle()?.rentalPricePerDay ?? null;
    const pricePerHour = this.vehicle()?.rentalPricePerHour ?? null;

    if (!start || !end || !startTime || !endTime || !this.hasAvailability()) {
      if (this.rangeError() === TIME_ORDER_ERROR) {
        this.rangeError.set('');
      }
      this.bookingEstimate.set(null);
      this.cdr.markForCheck();
      return;
    }

    if (this.rangeError() && this.rangeError() !== TIME_ORDER_ERROR) {
      this.bookingEstimate.set(null);
      this.cdr.markForCheck();
      return;
    }

    const startDateTime = this.combineDateAndTime(start, startTime);
    const endDateTime = this.combineDateAndTime(end, endTime);

    if (!startDateTime || !endDateTime) {
      this.bookingEstimate.set(null);
      this.cdr.markForCheck();
      return;
    }

    if (endDateTime.getTime() <= startDateTime.getTime()) {
      this.rangeError.set(TIME_ORDER_ERROR);
      this.bookingEstimate.set(null);
      this.cdr.markForCheck();
      return;
    }

    const totalMilliseconds = endDateTime.getTime() - startDateTime.getTime();
    const totalHours = Math.round(totalMilliseconds / (1000 * 60 * 60));

    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    const effectivePricePerDay = pricePerDay ?? 0;
    const effectivePricePerHour = pricePerHour ?? 0;

    const dayTotal = days * effectivePricePerDay;
    const hourTotal = hours * effectivePricePerHour;
    const total = dayTotal + hourTotal;

    this.rangeError.set('');
    this.bookingEstimate.set({ days, dayTotal, hours, hourTotal, total });
    this.cdr.markForCheck();
  }

  private rangeContainsBooked(start: Date, end: Date): boolean {
    const startDate = this.stripTime(start);
    const endDate = this.stripTime(end);
    const forward = startDate.getTime() <= endDate.getTime();
    const current = new Date(forward ? startDate : endDate);
    const stop = forward ? endDate : startDate;

    while (forward ? current.getTime() <= stop.getTime() : current.getTime() >= stop.getTime()) {
      if (this.bookedDateKeys().has(this.formatDateKey(current))) {
        return true;
      }
      current.setDate(current.getDate() + (forward ? 1 : -1));
    }
    return false;
  }

  private vehicleHasFullDayAvailability(vehicle: VehicleDetailsDto): boolean {
    const bookings = vehicle.upcomingBookings ?? [];

    if (!bookings.length) {
      return true;
    }

    const bookedKeys = this.buildBookingKeySet(bookings);
    const today = this.stripTime(new Date());
    const horizonDays = 60;

    for (let offset = 0; offset <= horizonDays; offset++) {
      const candidate = new Date(today);
      candidate.setDate(today.getDate() + offset);
      if (!bookedKeys.has(this.formatDateKey(candidate))) {
        return true;
      }
    }

    return false;
  }

  private expandBookingRange(booking: BookingBriefDto): Date[] {
    if (!booking.startDate) {
      return [];
    }

    const start = this.stripTime(new Date(booking.startDate));
    const end = booking.endDate
      ? this.stripTime(new Date(booking.endDate))
      : this.stripTime(new Date(booking.startDate));

    const forward = start.getTime() <= end.getTime();
    const dates: Date[] = [];
    const current = new Date(start);

    while (forward ? current.getTime() <= end.getTime() : current.getTime() >= end.getTime()) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + (forward ? 1 : -1));
    }

    return dates;
  }

  private stripTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDateKey(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

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

  private markRangeControlInvalid(input: MatDateRangeInput<Date>): void {
    const control = input.ngControl?.control;
    if (!control) {
      return;
    }
    control.setErrors({ rangeConflict: true });
    control.markAsTouched();
    control.markAsDirty();
  }

  private clearRangeControlState(input: MatDateRangeInput<Date>): void {
    const control = input.ngControl?.control;
    if (!control) {
      return;
    }
    control.setErrors(null);
    control.markAsTouched();
    control.markAsDirty();
  }

  private formatCurrency(value: number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return CURRENCY_FORMATTER.format(value);
  }

  private buildBookingKeySet(bookings: BookingBriefDto[]): Set<string> {
    const keys = new Set<string>();

    bookings.forEach((booking) => {
      if (!booking.startDate) {
        return;
      }

      const range = this.expandBookingRange(booking);
      range.forEach((date) => keys.add(this.formatDateKey(date)));
    });

    return keys;
  }

  private _loadStationsIfNeeded(): Observable<Station[]> {
    const existing = this.stationService.stations;
    if (existing.length > 0) {
      return of(existing);
    }

    return this.stationService.getStations().pipe(
      catchError(() => {
        this.loadError.set('Không thể tải danh sách trạm. Vui lòng thử lại sau.');
        return of<Station[]>([]);
      }),
    );
  }

  private _findVehicleInStations(
    stations: Station[],
    identifier: string,
  ): {
    vehicle: VehicleDetailsDto;
    station: Station;
  } | null {
    const normalizedId = identifier.trim().toLowerCase();
    if (!normalizedId) {
      return null;
    }

    for (const station of stations) {
      const vehicles = station.vehicles ?? [];
      for (const vehicle of vehicles) {
        const candidateIds = [vehicle.vehicleId, vehicle.vehicleAtStationId]
          .map((value) => value?.trim().toLowerCase())
          .filter((value): value is string => !!value);

        if (candidateIds.includes(normalizedId)) {
          return { vehicle, station };
        }
      }
    }

    return null;
  }
}
