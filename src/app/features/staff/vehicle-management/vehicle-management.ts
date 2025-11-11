import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { take } from 'rxjs';
import { VehiclesService, StaffVehicleRecord } from '../../../core-logic/vehicles/vehicles.service';
import { VehicleAtStationStatus } from '../../../../contract';
import type { VehicleAtStationStatus as VehicleAtStationStatusType } from '../../../../contract';

type VehicleTabKey = 'all' | 'available' | 'booked' | 'maintenance';

type StatusTone = 'success' | 'info' | 'pending' | 'danger';

interface StatusBadge {
  readonly text: string;
  readonly tone: StatusTone;
}

interface VehicleStatusCounters {
  readonly total: number;
  readonly available: number;
  readonly booked: number;
  readonly maintenance: number;
}

interface VehicleTabDescriptor {
  readonly key: VehicleTabKey;
  readonly label: string;
  readonly counterKey: keyof VehicleStatusCounters;
}

interface StationOption {
  readonly id: string;
  readonly name: string;
}

interface VehicleCardViewModel {
  readonly record: StaffVehicleRecord;
  readonly vehicleDisplay: string;
  readonly stationDisplay: string;
  readonly stationAddress?: string;
  readonly statusBadge?: StatusBadge;
  readonly batteryDisplay: string;
  readonly rangeDisplay: string;
  readonly hourlyRateDisplay: string;
  readonly dailyRateDisplay: string;
  readonly depositDisplay: string;
  readonly availabilityDisplay: string;
  readonly nextBookingDisplay: string;
}

interface UpcomingBookingViewModel {
  readonly bookingId?: string;
  readonly renterId?: string;
  readonly startDisplay: string;
  readonly endDisplay: string;
  readonly rangeDisplay: string;
}

interface SelectedVehicleViewModel {
  readonly record: StaffVehicleRecord;
  readonly vehicleDisplay: string;
  readonly stationDisplay: string;
  readonly stationAddress?: string;
  readonly statusBadge?: StatusBadge;
  readonly batteryDisplay: string;
  readonly rangeDisplay: string;
  readonly hourlyRateDisplay: string;
  readonly dailyRateDisplay: string;
  readonly depositDisplay: string;
  readonly currentWindowDisplay: string;
  readonly vehicleIdDisplay: string;
  readonly vehicleAtStationDisplay: string;
  readonly availabilityDisplay: string;
  readonly upcomingBookings: readonly UpcomingBookingViewModel[];
}

const VEHICLE_TABS: readonly VehicleTabDescriptor[] = [
  { key: 'all', label: 'All', counterKey: 'total' },
  { key: 'available', label: 'Available', counterKey: 'available' },
  { key: 'booked', label: 'Booked', counterKey: 'booked' },
  { key: 'maintenance', label: 'Maintenance', counterKey: 'maintenance' },
] as const;

const VEHICLE_STATUS_BADGES: Partial<Record<VehicleAtStationStatusType, StatusBadge>> = {
  [VehicleAtStationStatus.Available]: { text: 'Available', tone: 'success' },
  [VehicleAtStationStatus.Booked]: { text: 'Booked', tone: 'pending' },
  [VehicleAtStationStatus.Maintenance]: { text: 'Maintenance', tone: 'danger' },
};

@Component({
  selector: 'app-vehicle-management',
  imports: [MatIconModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './vehicle-management.html',
  styleUrl: './vehicle-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleManagement {
  private readonly vehiclesService = inject(VehiclesService);
  @ViewChild('detailPanel') private detailPanel?: ElementRef<HTMLDivElement>;
  private activeDetailTrigger: HTMLElement | null = null;

  readonly tabs = VEHICLE_TABS;
  readonly searchTerm = signal('');
  readonly activeTab = signal<VehicleTabKey>('all');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly stationFilter = signal<'all' | string>('all');
  readonly selectedVehicle = signal<StaffVehicleRecord | null>(null);

  readonly loading = computed(() => this.vehiclesService.staffVehiclesLoading());
  readonly error = computed(() => this.vehiclesService.staffVehiclesError());
  private readonly allRecords = computed(() => this.vehiclesService.staffVehicles());
  private readonly normalizedSearch = computed(() => this.searchTerm().trim().toLowerCase());

  readonly statusCounters = computed<VehicleStatusCounters>(() => {
    const records = this.allRecords();
    let available = 0;
    let booked = 0;
    let maintenance = 0;

    for (const record of records) {
      switch (record.status) {
        case VehicleAtStationStatus.Available:
          available += 1;
          break;
        case VehicleAtStationStatus.Booked:
          booked += 1;
          break;
        case VehicleAtStationStatus.Maintenance:
          maintenance += 1;
          break;
        default:
          break;
      }
    }

    return {
      total: records.length,
      available,
      booked,
      maintenance,
    } satisfies VehicleStatusCounters;
  });

  readonly stationOptions = computed<readonly StationOption[]>(() => {
    const map = new Map<string, string>();
    for (const record of this.allRecords()) {
      if (!record.stationId || record.stationId.length === 0) {
        continue;
      }
      if (!map.has(record.stationId)) {
        map.set(record.stationId, record.stationName);
      }
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((first, second) => first.name.localeCompare(second.name));
  });

  private readonly filteredRecords = computed(() => {
    const tab = this.activeTab();
    const station = this.stationFilter();
    const query = this.normalizedSearch();

    return this.allRecords().filter(
      (record) =>
        this._matchesTab(record, tab) &&
        this._matchesStation(record, station) &&
        this._matchesSearch(record, query),
    );
  });

  readonly cardViewModels = computed<VehicleCardViewModel[]>(() =>
    this.filteredRecords().map((record) => {
      const statusBadge = record.status ? VEHICLE_STATUS_BADGES[record.status] : undefined;
      const nextBooking = this._resolveNextBooking(record);
      const nextBookingDisplay =
        nextBooking && nextBooking.rangeDisplay !== '--'
          ? nextBooking.rangeDisplay
          : 'No upcoming bookings';

      return {
        record,
        vehicleDisplay: this._resolveVehicleLabel(record),
        stationDisplay: record.stationName,
        stationAddress: record.stationAddress,
        statusBadge,
        batteryDisplay: this._formatBattery(record.currentBatteryCapacityKwh),
        rangeDisplay: this._formatRange(record.vehicleDetails?.rangeKm),
        hourlyRateDisplay: this._formatCurrency(record.vehicleDetails?.rentalPricePerHour),
        dailyRateDisplay: this._formatCurrency(record.vehicleDetails?.rentalPricePerDay),
        depositDisplay: this._formatCurrency(record.vehicleDetails?.depositPrice),
        availabilityDisplay: this._resolveAvailability(record, nextBooking),
        nextBookingDisplay,
      } satisfies VehicleCardViewModel;
    }),
  );

  readonly selectedVehicleView = computed<SelectedVehicleViewModel | null>(() => {
    const record = this.selectedVehicle();
    if (!record) {
      return null;
    }

    const statusBadge = record.status ? VEHICLE_STATUS_BADGES[record.status] : undefined;
    const nextBooking = this._resolveNextBooking(record);

    return {
      record,
      vehicleDisplay: this._resolveVehicleLabel(record),
      stationDisplay: record.stationName,
      stationAddress: record.stationAddress,
      statusBadge,
      batteryDisplay: this._formatBattery(record.currentBatteryCapacityKwh),
      rangeDisplay: this._formatRange(record.vehicleDetails?.rangeKm),
      hourlyRateDisplay: this._formatCurrency(record.vehicleDetails?.rentalPricePerHour),
      dailyRateDisplay: this._formatCurrency(record.vehicleDetails?.rentalPricePerDay),
      depositDisplay: this._formatCurrency(record.vehicleDetails?.depositPrice),
      currentWindowDisplay: this._formatCurrentWindow(record),
      vehicleIdDisplay: record.vehicleId ?? '--',
      vehicleAtStationDisplay: record.vehicleAtStationId ?? '--',
      availabilityDisplay: this._resolveAvailability(record, nextBooking),
      upcomingBookings: record.upcomingBookings.length
        ? record.upcomingBookings.map((booking) => ({
            bookingId: booking.bookingId ?? undefined,
            renterId: booking.renterId ?? undefined,
            startDisplay: this._formatDateTime(booking.startDate),
            endDisplay: this._formatDateTime(booking.endDate),
            rangeDisplay: this._formatBookingRange(booking.startDate, booking.endDate),
          }))
        : [],
    } satisfies SelectedVehicleViewModel;
  });

  private readonly currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });

  private readonly dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  private readonly dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.vehiclesService.loadStaffVehicles().pipe(take(1)).subscribe();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.onSearchChange(target?.value ?? '');
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  clearSearch(): void {
    if (this.searchTerm().length === 0) {
      return;
    }
    this.searchTerm.set('');
  }

  onTabSelect(tab: VehicleTabKey): void {
    if (this.activeTab() === tab) {
      return;
    }
    this.activeTab.set(tab);
  }

  onStationFilterChange(stationId: string): void {
    const normalized = stationId?.trim().length ? stationId : 'all';
    if (this.stationFilter() === normalized) {
      return;
    }
    this.stationFilter.set(normalized);
  }

  setViewMode(mode: 'grid' | 'list'): void {
    if (this.viewMode() === mode) {
      return;
    }
    this.viewMode.set(mode);
  }

  openDetails(record: StaffVehicleRecord, triggerEvent?: Event): void {
    this.activeDetailTrigger =
      triggerEvent?.currentTarget instanceof HTMLElement ? triggerEvent.currentTarget : null;
    this.selectedVehicle.set(record);
    afterNextRender(() => {
      this.detailPanel?.nativeElement.focus();
    });
  }

  closeDetails(): void {
    this.selectedVehicle.set(null);
    const target = this.activeDetailTrigger;
    this.activeDetailTrigger = null;
    if (target) {
      queueMicrotask(() => {
        target.focus();
      });
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDetails();
    }
  }

  private _matchesTab(record: StaffVehicleRecord, tab: VehicleTabKey): boolean {
    switch (tab) {
      case 'available':
        return record.status === VehicleAtStationStatus.Available;
      case 'booked':
        return record.status === VehicleAtStationStatus.Booked;
      case 'maintenance':
        return record.status === VehicleAtStationStatus.Maintenance;
      default:
        return true;
    }
  }

  private _matchesStation(record: StaffVehicleRecord, stationId: string): boolean {
    if (stationId === 'all') {
      return true;
    }
    return record.stationId === stationId;
  }

  private _matchesSearch(record: StaffVehicleRecord, query: string): boolean {
    if (query.length === 0) {
      return true;
    }

    const haystack: (string | undefined)[] = [
      record.stationName,
      record.stationAddress,
      record.vehicleId,
      record.vehicleAtStationId,
      record.vehicleDetails?.make ?? undefined,
      record.vehicleDetails?.model ?? undefined,
      record.vehicleDetails?.modelYear ? record.vehicleDetails.modelYear.toString() : undefined,
    ];

    return haystack.some((value) => value?.toLowerCase().includes(query) ?? false);
  }

  private _resolveVehicleLabel(record: StaffVehicleRecord): string {
    const make = this._normalize(record.vehicleDetails?.make ?? undefined);
    const model = this._normalize(record.vehicleDetails?.model ?? undefined);
    const year = record.vehicleDetails?.modelYear;

    const parts = [make, model, typeof year === 'number' ? year.toString() : undefined].filter(
      (value): value is string => !!value,
    );

    if (parts.length > 0) {
      return parts.join(' ');
    }

    if (record.vehicleAtStationId) {
      return `Vehicle ${this._shorten(record.vehicleAtStationId)}`;
    }

    if (record.vehicleId) {
      return `Vehicle ${this._shorten(record.vehicleId)}`;
    }

    return 'Vehicle';
  }

  private _resolveAvailability(
    record: StaffVehicleRecord,
    nextBooking: UpcomingBookingViewModel | null,
  ): string {
    switch (record.status) {
      case VehicleAtStationStatus.Available:
        if (nextBooking?.startDisplay && nextBooking.startDisplay !== '--') {
          return `Available until ${nextBooking.startDisplay}`;
        }
        return 'Available now';
      case VehicleAtStationStatus.Booked:
        if (record.endTime) {
          const endDisplay = this._formatDateTime(record.endTime);
          return `Booked until ${endDisplay}`;
        }
        if (nextBooking?.endDisplay && nextBooking.endDisplay !== '--') {
          return `Booked until ${nextBooking.endDisplay}`;
        }
        return 'Currently booked';
      case VehicleAtStationStatus.Maintenance:
        return 'Under maintenance';
      default:
        return 'Status unknown';
    }
  }

  private _resolveNextBooking(record: StaffVehicleRecord): UpcomingBookingViewModel | null {
    if (!record.upcomingBookings.length) {
      return null;
    }

    const sorted = [...record.upcomingBookings].sort((first, second) => {
      const firstStart = first.startDate ? Date.parse(first.startDate) : Number.POSITIVE_INFINITY;
      const secondStart = second.startDate
        ? Date.parse(second.startDate)
        : Number.POSITIVE_INFINITY;
      return firstStart - secondStart;
    });

    const booking = sorted[0];
    return {
      bookingId: booking.bookingId ?? undefined,
      renterId: booking.renterId ?? undefined,
      startDisplay: this._formatDateTime(booking.startDate),
      endDisplay: this._formatDateTime(booking.endDate),
      rangeDisplay: this._formatBookingRange(booking.startDate, booking.endDate),
    } satisfies UpcomingBookingViewModel;
  }

  private _formatBookingRange(start?: string, end?: string): string {
    const startDisplay = this._formatDate(start);
    const endDisplay = this._formatDate(end ?? start);

    if (!startDisplay && !endDisplay) {
      return '--';
    }

    if (startDisplay && endDisplay) {
      if (startDisplay === endDisplay) {
        return startDisplay;
      }
      return `${startDisplay} → ${endDisplay}`;
    }

    return startDisplay ?? endDisplay ?? '--';
  }

  private _formatCurrentWindow(record: StaffVehicleRecord): string {
    if (!record.startTime && !record.endTime) {
      return '--';
    }

    const startDisplay = this._formatDateTime(record.startTime);
    const endDisplay = this._formatDateTime(record.endTime);

    if (startDisplay === '--' && endDisplay === '--') {
      return '--';
    }

    if (startDisplay !== '--' && endDisplay !== '--') {
      return `${startDisplay} → ${endDisplay}`;
    }

    if (startDisplay !== '--') {
      return `${startDisplay} → --`;
    }

    return `-- → ${endDisplay}`;
  }

  private _formatBattery(value?: number | null): string {
    if (value === null || value === undefined) {
      return '--';
    }
    return `${value.toLocaleString('vi-VN')} kWh`;
  }

  private _formatRange(value?: number | null): string {
    if (value === null || value === undefined) {
      return '--';
    }
    return `${value.toLocaleString('vi-VN')} km`;
  }

  private _formatCurrency(value?: number | null): string {
    if (value === null || value === undefined) {
      return '--';
    }
    return this.currencyFormatter.format(value);
  }

  private _formatDate(value?: string): string {
    if (!value) {
      return '';
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return '';
    }

    return this.dateFormatter.format(new Date(timestamp));
  }

  private _formatDateTime(value?: string): string {
    if (!value) {
      return '--';
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return '--';
    }

    return this.dateTimeFormatter.format(new Date(timestamp));
  }

  private _normalize(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private _shorten(value: string): string {
    if (value.length <= 8) {
      return value;
    }

    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }
}
