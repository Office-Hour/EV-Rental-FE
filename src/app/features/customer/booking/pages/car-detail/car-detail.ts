import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
import { distinctUntilChanged, filter, map } from 'rxjs';
import { BookingBriefDto, VehicleDetailsDto } from '../../../../../../contract';
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
  readonly stations = input.required<Station[]>();
  readonly stepIndex = input<number>(0);
  readonly stepKey = input<'details' | 'checkout' | 'payment' | 'deposit'>('details');

  readonly nextStep = output<void>();
  readonly previousStep = output<void>();
  readonly bookingDataReady = output<{
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
  }>();

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly hourOptions = HOUR_OPTIONS;
  readonly today = this.stripTime(new Date());
  readonly rangeError = signal<string>('');
  readonly selectedRange = signal<DateRange<Date> | null>(null);
  readonly vehicle = signal<VehicleDetailsDto | undefined>(undefined);
  readonly stationInfo = signal<{ name: string; address: string } | null>(null);
  private _currentStation: Station | null = null;
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

  readonly depositPrice = computed(() =>
    this.formatCurrency(this.vehicle()?.depositPrice ?? undefined),
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
    noRangeError: !this.rangeError(),
  }));
  readonly canSubmit = computed(() => {
    const readiness = this.submitReadiness();
    return (
      readiness.formValid &&
      readiness.hasEstimate &&
      readiness.hasAvailability &&
      readiness.noRangeError
    );
  });

  readonly dateClass: MatCalendarCellClassFunction<Date> = (cellDate) =>
    this.bookedDateKeys().has(this.formatDateKey(cellDate)) ? 'busy-date' : '';

  readonly isDateAvailable = (date: Date | null): boolean => {
    if (!date) {
      return true;
    }

    if (this.isDateBeforeToday(date)) {
      return false;
    }

    return !this.bookedDateKeys().has(this.formatDateKey(date));
  };

  readonly isStartHourDisabled = (hour: string): boolean => {
    const range = this.form.controls.range.value;
    const startDate = range?.start ?? null;
    if (!startDate) {
      return false;
    }

    return this.isDateTimeInPast(startDate, hour);
  };

  readonly getEndHourDisableReason = (hour: string): 'past' | 'beforeStart' | null => {
    const range = this.form.controls.range.value;
    const endDate = range?.end ?? null;
    if (!endDate) {
      return null;
    }

    const endDateTime = this.combineDateAndTime(endDate, hour);
    if (!endDateTime) {
      return null;
    }

    const now = new Date();
    const endDay = this.stripTime(endDate);
    const today = this.stripTime(now);
    if (endDay.getTime() < today.getTime()) {
      return 'past';
    }
    if (endDay.getTime() === today.getTime() && endDateTime.getTime() <= now.getTime()) {
      return 'past';
    }

    const startDate = range?.start ?? null;
    const startTime = this.form.controls.startTime.value ?? '';
    if (startDate && startTime) {
      const startDateTime = this.combineDateAndTime(startDate, startTime);
      if (startDateTime && endDateTime.getTime() <= startDateTime.getTime()) {
        return 'beforeStart';
      }
    }

    return null;
  };

  readonly isEndHourDisabled = (hour: string): boolean =>
    this.getEndHourDisableReason(hour) !== null;

  private readonly vehicleId = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id')?.trim() ?? ''),
      filter((id) => id.length > 0),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );

  constructor() {
    // Effect to load vehicle when vehicleId or stations change
    effect(() => {
      const vehicleId = this.vehicleId();
      const stations = this.stations();

      // Only proceed if we have both vehicleId and stations
      if (!vehicleId || stations.length === 0) {
        // If we have vehicleId but no stations yet, show loading
        if (vehicleId && stations.length === 0) {
          this.isLoading.set(true);
          this.loadError.set(null);
        }
        this.cdr.markForCheck();
        return;
      }

      // Both vehicleId and stations are available, try to find vehicle
      this.isLoading.set(true);
      this.loadError.set(null);

      const result = this._findVehicleInStations(stations, vehicleId);

      this.isLoading.set(false);

      if (!result) {
        this.vehicle.set(undefined);
        this.stationInfo.set(null);
        this.loadError.set('Không tìm thấy thông tin xe.');
        this.cdr.markForCheck();
        return;
      }

      this.vehicle.set(result.vehicle);
      this.stationInfo.set({
        name: result.station.name,
        address: result.station.address,
      });
      // Store full station object for later use
      this._currentStation = result.station;
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

      // Clear only range conflict errors, preserve TIME_ORDER_ERROR if exists
      const currentError = this.rangeError();
      const isTimeOrderError = currentError === TIME_ORDER_ERROR;

      // Clear control errors related to range conflict
      const startErrors = startCtrl.errors;
      const endErrors = endCtrl.errors;
      if (startErrors?.['rangeConflict']) {
        const restStartErrors = { ...startErrors };
        delete restStartErrors['rangeConflict'];
        startCtrl.setErrors(Object.keys(restStartErrors).length > 0 ? restStartErrors : null);
      }
      if (endErrors?.['rangeConflict']) {
        const restEndErrors = { ...endErrors };
        delete restEndErrors['rangeConflict'];
        endCtrl.setErrors(Object.keys(restEndErrors).length > 0 ? restEndErrors : null);
      }

      // Clear range error only if it's not TIME_ORDER_ERROR
      if (!isTimeOrderError) {
        this.rangeError.set('');
      }

      if (start && this.isDateBeforeToday(start)) {
        const errKey = 'pastDate';
        this.rangeError.set('Ngày nhận không thể ở trong quá khứ.');
        startCtrl.setErrors({ ...(startCtrl.errors ?? {}), [errKey]: true });
        startCtrl.markAsTouched();
        startCtrl.markAsDirty();
      } else if (startCtrl.errors?.['pastDate']) {
        const restStartErrors = { ...startCtrl.errors };
        delete restStartErrors['pastDate'];
        startCtrl.setErrors(Object.keys(restStartErrors).length > 0 ? restStartErrors : null);
      }

      if (end && this.isDateBeforeToday(end)) {
        const errKey = 'pastDate';
        this.rangeError.set('Ngày trả không thể ở trong quá khứ.');
        endCtrl.setErrors({ ...(endCtrl.errors ?? {}), [errKey]: true });
        endCtrl.markAsTouched();
        endCtrl.markAsDirty();
      } else if (endCtrl.errors?.['pastDate']) {
        const restEndErrors = { ...endCtrl.errors };
        delete restEndErrors['pastDate'];
        endCtrl.setErrors(Object.keys(restEndErrors).length > 0 ? restEndErrors : null);
      }

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

      if (
        this.rangeError() &&
        this.rangeError() !== TIME_ORDER_ERROR &&
        !startCtrl.errors &&
        !endCtrl.errors
      ) {
        this.rangeError.set('');
      }

      this.enforceStartTimeValidity();
      this.enforceEndTimeValidity();
      this.updateBookingEstimate();
      this.cdr.markForCheck();
    });

    this.form.controls.startTime.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.enforceStartTimeValidity();
        this.enforceEndTimeValidity();
        this.updateBookingEstimate();
      });
    this.form.controls.endTime.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.enforceEndTimeValidity();
        this.updateBookingEstimate();
      });
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

      if (this.isDateBeforeToday(start)) {
        this.rangeError.set('Ngày nhận không thể ở trong quá khứ.');
        this.markRangeControlInvalid(input, 'pastDate');
        this.selectedRange.set(range);
        picker.close();
        return;
      }

      if (this.isDateBeforeToday(end)) {
        this.rangeError.set('Ngày trả không thể ở trong quá khứ.');
        this.markRangeControlInvalid(input, 'pastDate');
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
    if (this.form.invalid || !this.canSubmit()) {
      return;
    }

    const vehicle = this.vehicle();
    const station = this.stationInfo();
    const estimate = this.bookingEstimate();
    const formValue = this.form.value;

    if (!vehicle || !station || !estimate || !formValue.range?.start || !formValue.range?.end) {
      return;
    }

    // Find station object from stations input
    let stationObj = this.stations().find((s) => s.name === station.name);
    if (!stationObj && this._currentStation) {
      // Fallback: try to get from stored station
      stationObj = this.stations().find((s) => s.id === this._currentStation?.id);
    }
    if (!stationObj) {
      return;
    }

    // Emit booking data to parent
    this.bookingDataReady.emit({
      vehicle,
      station: stationObj,
      bookingEstimate: estimate,
      depositPrice: vehicle.depositPrice ?? null,
      startDate: formValue.range.start,
      endDate: formValue.range.end,
      startTime: formValue.startTime ?? '',
      endTime: formValue.endTime ?? '',
    });

    // After successful validation, move to next step
    this.nextStep.emit();
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
    this.form.controls.startTime.setErrors(null);
    this.form.controls.endTime.setErrors(null);
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

  private isDateTimeInPast(date: Date, time: string): boolean {
    const dateTime = this.combineDateAndTime(date, time);
    if (!dateTime) {
      return false;
    }
    return dateTime.getTime() <= Date.now();
  }

  private isDateBeforeToday(date: Date): boolean {
    const today = this.stripTime(new Date());
    return this.stripTime(date).getTime() < today.getTime();
  }

  private enforceStartTimeValidity(): void {
    const control = this.form.controls.startTime;
    const value = control.value ?? '';
    if (!value) {
      return;
    }

    if (this.isStartHourDisabled(value)) {
      this.invalidateTimeControl(control, 'invalidPastTime');
      return;
    }

    this.clearControlError(control, 'invalidPastTime');
  }

  private enforceEndTimeValidity(): void {
    const control = this.form.controls.endTime;
    const value = control.value ?? '';
    if (!value) {
      return;
    }

    const reason = this.getEndHourDisableReason(value);
    if (!reason) {
      this.clearControlError(control, 'invalidPastTime');
      this.clearControlError(control, 'beforeStartTime');
      return;
    }

    if (reason === 'past') {
      this.invalidateTimeControl(control, 'invalidPastTime');
      this.clearControlError(control, 'beforeStartTime');
      return;
    }

    this.invalidateTimeControl(control, 'beforeStartTime');
    this.clearControlError(control, 'invalidPastTime');
  }

  private invalidateTimeControl(control: FormControl<string | null>, errorKey: string): void {
    control.setValue('', { emitEvent: false });
    this.setControlError(control, errorKey);
    control.markAsTouched();
    control.markAsDirty();
  }

  private setControlError(control: FormControl<string | null>, errorKey: string): void {
    const errors = control.errors ?? {};
    if (errors[errorKey]) {
      return;
    }
    control.setErrors({ ...errors, [errorKey]: true });
  }

  private clearControlError(control: FormControl<string | null>, errorKey: string): void {
    const errors = control.errors;
    if (!errors?.[errorKey]) {
      return;
    }

    const updated = { ...errors };
    delete updated[errorKey];
    control.setErrors(Object.keys(updated).length ? updated : null);
  }

  private markRangeControlInvalid(
    input: MatDateRangeInput<Date>,
    errorKey = 'rangeConflict',
  ): void {
    const control = input.ngControl?.control;
    if (!control) {
      return;
    }
    control.setErrors({ ...(control.errors ?? {}), [errorKey]: true });
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
