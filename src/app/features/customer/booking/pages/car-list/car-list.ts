import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CarCard } from '../../components/car-card/car-card';
import { BookingBriefDto, VehicleDetailsDto } from '../../../../../../contract';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { StationService } from '../../../../../core-logic/station/station.service';

@Component({
  selector: 'app-car-list',
  imports: [
    CarCard,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatButtonModule,
    MatNativeDateModule,
  ],
  templateUrl: './car-list.html',
  styleUrl: './car-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarList {
  private readonly _stationService = inject(StationService);

  readonly selectedStation = signal<string>('all');
  readonly bookingDateRange = signal<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  readonly filterForm = new FormGroup({
    station: new FormControl<string>('all', { nonNullable: true }),
    range: new FormGroup({
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
    }),
  });

  constructor() {
    // Stations are typically loaded by AuthService during login/session restore.
    // This is a fallback in case stations haven't been loaded yet (e.g., race condition, direct navigation).
    if (this._stationService.stations.length === 0) {
      this._stationService.getStations().subscribe({
        next: () => {
          console.log('getStations', this._stationService.stations);
        },
        error: () => {
          // Silently ignore errors. They can be retried later.
        },
      });
    }

    const stationControl = this.filterForm.controls.station;
    stationControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.selectedStation.set(value ?? 'all'));

    this.filterForm.controls.range.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(({ start, end }) => {
        this.bookingDateRange.set({ start: start ?? null, end: end ?? null });
      });
  }

  // Get all vehicles from all stations with their station info
  readonly carsWithStation = computed(() => {
    const stations = this._stationService.stations;
    const result: { car: VehicleDetailsDto; stationId: string; stationName: string }[] = [];

    for (const station of stations) {
      for (const vehicle of station.vehicles ?? []) {
        result.push({
          car: vehicle,
          stationId: station.id,
          stationName: station.name,
        });
      }
    }

    return result;
  });

  // Get all vehicles from all stations (for backward compatibility)
  readonly cars = computed<readonly VehicleDetailsDto[]>(() => {
    return this.carsWithStation().map((item) => item.car);
  });

  // Map station ID to station name
  readonly stationNameMap = computed(() => {
    const stations = this._stationService.stations;
    const map = new Map<string, string>();
    for (const station of stations) {
      map.set(station.id, station.name);
    }
    return map;
  });

  // Get stations with id and name for filter dropdown
  readonly stations = computed(() => {
    const stationIds = new Set<string>();

    // Collect unique station IDs from carsWithStation
    for (const item of this.carsWithStation()) {
      stationIds.add(item.stationId);
    }

    // Get station names from station service
    const allStations = this._stationService.stations;
    const stationMap = new Map<string, string>();
    for (const station of allStations) {
      stationMap.set(station.id, station.name);
    }

    // Return stations that have vehicles, sorted by name
    return Array.from(stationIds)
      .map((id) => ({
        id,
        name: stationMap.get(id) ?? id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly filteredCars = computed(() => {
    const stationId = this.selectedStation();
    const { start, end } = this.bookingDateRange();
    const rangeStart = start;
    const rangeEnd = end ?? rangeStart;

    return this.carsWithStation().filter((item) => {
      const { car, stationId: carStationId } = item;

      // Filter by station ID
      if (stationId !== 'all' && carStationId !== stationId) {
        return false;
      }

      // Filter by date range
      if (rangeStart && rangeEnd) {
        return !this._hasBookingConflict(car.upcomingBookings ?? [], rangeStart, rangeEnd);
      }

      return true;
    });
  });

  // Get filtered cars with station names
  readonly filteredCarsWithStationName = computed(() => {
    return this.filteredCars().map((item) => ({
      car: item.car,
      stationName: item.stationName,
    }));
  });

  readonly hasActiveFilters = computed(() => {
    const stationActive = this.selectedStation() !== 'all';
    const { start, end } = this.bookingDateRange();
    return stationActive || !!start || !!end;
  });

  clearFilters(): void {
    this.filterForm.controls.station.setValue('all');
    this.filterForm.controls.range.reset({ start: null, end: null });
  }

  private _hasBookingConflict(bookings: BookingBriefDto[], start: Date, end: Date): boolean {
    if (!bookings.length) {
      return false;
    }

    const requestedStart = this._normalizeDate(start);
    const requestedEnd = this._normalizeDate(end);

    for (const booking of bookings) {
      if (!booking.startDate) {
        continue;
      }

      const bookingStart = this._normalizeDate(new Date(booking.startDate));
      const bookingEnd = booking.endDate
        ? this._normalizeDate(new Date(booking.endDate))
        : bookingStart;

      const overlaps = requestedStart <= bookingEnd && bookingStart <= requestedEnd;
      if (overlaps) {
        return true;
      }
    }

    return false;
  }

  private _normalizeDate(date: Date): number {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized.getTime();
  }
}
