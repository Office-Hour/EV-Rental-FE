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
import { take } from 'rxjs';
import { BookingsService, StaffBookingRecord } from '../../../core-logic/bookings/bookings.service';
import {
  BookingStatus as BookingStatusEnum,
  BookingVerificationStatus as BookingVerificationStatusEnum,
  RentalStatus as RentalStatusEnum,
} from '../../../../contract';
import type { BookingStatus, BookingVerificationStatus, RentalStatus } from '../../../../contract';
import { Router } from '@angular/router';

type BookingTabKey = 'all' | 'pendingVerification' | 'verified' | 'cancelled';

interface BookingStatusCounters {
  readonly total: number;
  readonly pendingVerification: number;
  readonly verified: number;
  readonly cancelled: number;
}

interface BookingTabDescriptor {
  readonly key: BookingTabKey;
  readonly label: string;
  readonly description: string;
  readonly counterKey: keyof BookingStatusCounters;
}

type StatusTone = 'pending' | 'success' | 'danger' | 'info';

interface StatusBadge {
  readonly text: string;
  readonly tone: StatusTone;
}

interface BookingCardViewModel {
  readonly record: StaffBookingRecord;
  readonly customerDisplay: string;
  readonly bookingCreatedDisplay: string;
  readonly rentalStartDisplay: string;
  readonly rentalEndDisplay: string;
  readonly totalAmountDisplay: string;
  readonly depositDisplay: string;
  readonly vehicleDisplay: string;
  readonly rentalSummary: string;
  readonly badges: readonly StatusBadge[];
}

interface SelectedBookingViewModel {
  readonly record: StaffBookingRecord;
  readonly customerDisplay: string;
  readonly badges: readonly StatusBadge[];
  readonly createdAtDisplay: string;
  readonly startDateTimeDisplay: string;
  readonly endDateTimeDisplay: string;
  readonly totalAmountDisplay: string;
  readonly depositDisplay: string;
  readonly vehicleDisplay: string;
  readonly rentalSummary: string;
  readonly rentalDays?: number;
}

const BOOKING_TABS: readonly BookingTabDescriptor[] = [
  {
    key: 'all',
    label: 'All bookings',
    description: 'Every booking status',
    counterKey: 'total',
  },
  {
    key: 'pendingVerification',
    label: 'Pending verification',
    description: 'Awaiting review',
    counterKey: 'pendingVerification',
  },
  {
    key: 'verified',
    label: 'Verified',
    description: 'Approved bookings',
    counterKey: 'verified',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    description: 'No longer active',
    counterKey: 'cancelled',
  },
] as const;

const BOOKING_STATUS_BADGES: Record<BookingStatus, StatusBadge> = {
  [BookingStatusEnum.PendingVerification]: { text: 'Pending Verification', tone: 'pending' },
  [BookingStatusEnum.Verified]: { text: 'Verified', tone: 'success' },
  [BookingStatusEnum.Cancelled]: { text: 'Cancelled', tone: 'danger' },
  [BookingStatusEnum.RentalCreated]: { text: 'Rental Created', tone: 'info' },
};

const BOOKING_VERIFICATION_BADGES: Record<BookingVerificationStatus, StatusBadge> = {
  [BookingVerificationStatusEnum.Pending]: { text: 'Verification Pending', tone: 'pending' },
  [BookingVerificationStatusEnum.Approved]: { text: 'Verification Approved', tone: 'success' },
  [BookingVerificationStatusEnum.RejectedMismatch]: {
    text: 'Verification Rejected',
    tone: 'danger',
  },
  [BookingVerificationStatusEnum.RejectedOther]: { text: 'Verification Rejected', tone: 'danger' },
};

const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  [RentalStatusEnum.Reserved]: 'Reserved',
  [RentalStatusEnum.InProgress]: 'In Progress',
  [RentalStatusEnum.Completed]: 'Completed',
  [RentalStatusEnum.Late]: 'Late',
  [RentalStatusEnum.Cancelled]: 'Cancelled',
};

const RENTAL_STATUS_BADGES: Record<RentalStatus, StatusBadge> = {
  [RentalStatusEnum.Reserved]: { text: 'Rental Reserved', tone: 'info' },
  [RentalStatusEnum.InProgress]: { text: 'Rental In Progress', tone: 'info' },
  [RentalStatusEnum.Completed]: { text: 'Rental Completed', tone: 'success' },
  [RentalStatusEnum.Late]: { text: 'Rental Late', tone: 'danger' },
  [RentalStatusEnum.Cancelled]: { text: 'Rental Cancelled', tone: 'danger' },
};

const RENTAL_NOT_CREATED_BADGE: StatusBadge = {
  text: 'Rental Not Created',
  tone: 'pending',
};

const RENTAL_LINKED_BADGE: StatusBadge = {
  text: 'Rental Linked',
  tone: 'info',
};

@Component({
  selector: 'app-staff-dashboard',
  imports: [MatIconModule],
  templateUrl: './staff-dashboard.html',
  styleUrl: './staff-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffDashboard {
  private readonly bookingsService = inject(BookingsService);
  private readonly router = inject(Router);
  @ViewChild('detailPanel') private detailPanel?: ElementRef<HTMLDivElement>;
  private activeDetailTrigger: HTMLElement | null = null;

  readonly tabs = BOOKING_TABS;
  readonly searchTerm = signal('');
  readonly activeTab = signal<BookingTabKey>('all');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly selectedBooking = signal<StaffBookingRecord | null>(null);

  readonly loading = computed(() => this.bookingsService.staffBookingsLoading());
  readonly error = computed(() => this.bookingsService.staffBookingsError());
  private readonly allRecords = computed(() => this.bookingsService.staffBookings());
  private readonly normalizedSearch = computed(() => this.searchTerm().trim().toLowerCase());

  readonly statusCounters = computed<BookingStatusCounters>(() => {
    const records = this.allRecords();
    let pending = 0;
    let verified = 0;
    let cancelled = 0;

    for (const record of records) {
      if (record.verificationStatus === BookingVerificationStatusEnum.Pending) {
        pending += 1;
      }

      if (
        record.status === BookingStatusEnum.Verified ||
        record.status === BookingStatusEnum.RentalCreated
      ) {
        verified += 1;
      }

      if (record.status === BookingStatusEnum.Cancelled) {
        cancelled += 1;
      }
    }

    return {
      total: records.length,
      pendingVerification: pending,
      verified,
      cancelled,
    } satisfies BookingStatusCounters;
  });

  private readonly filteredRecords = computed(() => {
    const tab = this.activeTab();
    const query = this.normalizedSearch();

    return this.allRecords().filter(
      (record) => this._matchesTab(record, tab) && this._matchesSearch(record, query),
    );
  });

  readonly filteredCount = computed(() => this.filteredRecords().length);

  readonly cardViewModels = computed<BookingCardViewModel[]>(() =>
    this.filteredRecords().map((record) => ({
      record,
      customerDisplay: this._resolveCustomerLabel(record),
      bookingCreatedDisplay: this.formatDate(record.bookingCreatedAt),
      rentalStartDisplay: this.formatDate(record.startTime),
      rentalEndDisplay: this.formatDate(record.endTime),
      totalAmountDisplay: this.formatCurrency(this._computeEstimatedTotal(record)),
      depositDisplay: this.formatCurrency(record.vehicleDetails?.depositPrice),
      vehicleDisplay: this._resolveVehicleLabel(record),
      rentalSummary: this._resolveRentalSummary(record),
      badges: this._buildBadges(record),
    })),
  );

  readonly selectedBookingView = computed<SelectedBookingViewModel | null>(() => {
    const record = this.selectedBooking();
    if (!record) {
      return null;
    }

    return {
      record,
      customerDisplay: this._resolveCustomerLabel(record),
      badges: this._buildBadges(record),
      createdAtDisplay: this.formatDateTime(record.bookingCreatedAt),
      startDateTimeDisplay: this.formatDateTime(record.startTime),
      endDateTimeDisplay: this.formatDateTime(record.endTime),
      totalAmountDisplay: this.formatCurrency(this._computeEstimatedTotal(record)),
      depositDisplay: this.formatCurrency(record.vehicleDetails?.depositPrice),
      vehicleDisplay: this._resolveVehicleLabel(record),
      rentalSummary: this._resolveRentalSummary(record),
      rentalDays: this._computeRentalDays(record),
    } satisfies SelectedBookingViewModel;
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

  goToBookingDetail(bookingId: string): void {
    if (!bookingId) {
      return;
    }
    this.closeDetails();
    this.router.navigate(['/staff/bookings', bookingId]);
  }

  refresh(): void {
    this.bookingsService.loadStaffBookings().pipe(take(1)).subscribe();
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

  onTabSelect(tab: BookingTabKey): void {
    if (this.activeTab() === tab) {
      return;
    }
    this.activeTab.set(tab);
  }

  setViewMode(mode: 'grid' | 'list'): void {
    if (this.viewMode() === mode) {
      return;
    }
    this.viewMode.set(mode);
  }

  openDetails(record: StaffBookingRecord, triggerEvent?: Event): void {
    this.activeDetailTrigger =
      triggerEvent?.currentTarget instanceof HTMLElement ? triggerEvent.currentTarget : null;
    this.selectedBooking.set(record);
    afterNextRender(() => {
      this.detailPanel?.nativeElement.focus();
    });
  }

  closeDetails(): void {
    this.selectedBooking.set(null);
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

  formatCurrency(value?: number | null): string {
    if (value === undefined || value === null) {
      return '--';
    }
    return this.currencyFormatter.format(value);
  }

  formatDate(value?: string): string {
    if (!value) {
      return '--';
    }
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return '--';
    }
    return this.dateFormatter.format(new Date(timestamp));
  }

  formatDateTime(value?: string): string {
    if (!value) {
      return '--';
    }
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return '--';
    }
    return this.dateTimeFormatter.format(new Date(timestamp));
  }

  private _matchesTab(record: StaffBookingRecord, tab: BookingTabKey): boolean {
    switch (tab) {
      case 'pendingVerification':
        return record.verificationStatus === BookingVerificationStatusEnum.Pending;
      case 'verified':
        return (
          record.status === BookingStatusEnum.Verified ||
          record.status === BookingStatusEnum.RentalCreated
        );
      case 'cancelled':
        return record.status === BookingStatusEnum.Cancelled;
      default:
        return true;
    }
  }

  private _matchesSearch(record: StaffBookingRecord, query: string): boolean {
    if (query.length === 0) {
      return true;
    }

    const haystack: (string | undefined)[] = [
      record.bookingId,
      record.renterId,
      record.vehicleAtStationId,
      record.rental?.rentalId ?? undefined,
      record.rental?.vehicleId ?? undefined,
      record.vehicleDetails?.make ?? undefined,
      record.vehicleDetails?.model ?? undefined,
      record.renterProfile?.address ?? undefined,
      record.renterProfile?.driverLicenseNo ?? undefined,
    ];

    return haystack.some((value) => value?.toLowerCase().includes(query) ?? false);
  }

  private _resolveCustomerLabel(record: StaffBookingRecord): string {
    const renterId = this._normalize(record.renterId);
    if (renterId) {
      return `Customer ${this._shortenIdentifier(renterId)}`;
    }

    return 'Customer --';
  }

  private _resolveVehicleLabel(record: StaffBookingRecord): string {
    const details = record.vehicleDetails;
    if (details) {
      const parts = [
        this._normalize(details.make),
        this._normalize(details.model),
        details.modelYear ? details.modelYear.toString() : undefined,
      ].filter((value): value is string => value !== undefined);

      if (parts.length > 0) {
        return parts.join(' ');
      }
    }

    const fallback = this._normalize(record.vehicleAtStationId ?? record.rental?.vehicleId);
    if (fallback) {
      return `Vehicle ${this._shortenIdentifier(fallback)}`;
    }

    return 'Vehicle --';
  }

  private _resolveRentalSummary(record: StaffBookingRecord): string {
    if (!record.rental) {
      switch (record.status) {
        case BookingStatusEnum.Cancelled:
          return 'Booking cancelled';
        case BookingStatusEnum.PendingVerification:
          return 'Awaiting verification';
        case BookingStatusEnum.RentalCreated:
          return 'Rental creation in progress';
        case BookingStatusEnum.Verified:
          return 'Awaiting rental creation';
        default:
          return 'Rental not created';
      }
    }

    const rental = record.rental;
    const status = rental.status;
    const statusLabel = status ? this.rentalStatusLabel(status) : 'Rental Linked';
    const rentalId =
      this._normalize(rental.rentalId) ??
      this._normalize(rental.bookingId) ??
      this._normalize(rental.booking?.bookingId);

    if (rentalId) {
      return `${statusLabel} · ${this._shortenIdentifier(rentalId)}`;
    }

    const startTimeDisplay = this.formatDateTime(rental.startTime);
    if (statusLabel && startTimeDisplay !== '--') {
      return `${statusLabel} · Starts ${startTimeDisplay}`;
    }

    return statusLabel;
  }

  rentalStatusLabel(status?: RentalStatus | null): string {
    if (!status) {
      return 'Rental Linked';
    }

    return RENTAL_STATUS_LABELS[status] ?? 'Rental Linked';
  }

  private _resolveRentalBadge(record: StaffBookingRecord): StatusBadge | null {
    const rental = record.rental;
    if (!rental) {
      if (
        record.status === BookingStatusEnum.Verified ||
        record.status === BookingStatusEnum.RentalCreated
      ) {
        return RENTAL_NOT_CREATED_BADGE;
      }
      return null;
    }

    if (rental.status) {
      const badge = RENTAL_STATUS_BADGES[rental.status];
      if (badge) {
        return badge;
      }
    }

    return RENTAL_LINKED_BADGE;
  }

  private _buildBadges(record: StaffBookingRecord): StatusBadge[] {
    const badges: StatusBadge[] = [];

    if (record.status) {
      const bookingBadge = BOOKING_STATUS_BADGES[record.status];
      if (bookingBadge) {
        badges.push(bookingBadge);
      }
    }

    if (record.verificationStatus) {
      const verificationBadge = BOOKING_VERIFICATION_BADGES[record.verificationStatus];
      if (verificationBadge && !badges.includes(verificationBadge)) {
        badges.push(verificationBadge);
      }
    }

    const rentalBadge = this._resolveRentalBadge(record);
    if (rentalBadge && !badges.includes(rentalBadge)) {
      badges.push(rentalBadge);
    }

    return badges;
  }

  private _computeEstimatedTotal(record: StaffBookingRecord): number | undefined {
    const pricePerDay = record.vehicleDetails?.rentalPricePerDay;
    if (pricePerDay === undefined || pricePerDay === null) {
      return undefined;
    }

    const rentalDays = this._computeRentalDays(record);
    if (!rentalDays) {
      return pricePerDay;
    }

    return pricePerDay * rentalDays;
  }

  private _computeRentalDays(record: StaffBookingRecord): number | undefined {
    if (!record.startTime || !record.endTime) {
      return undefined;
    }

    const start = Date.parse(record.startTime);
    const end = Date.parse(record.endTime);

    if (Number.isNaN(start) || Number.isNaN(end)) {
      return undefined;
    }

    const diffMs = end - start;
    if (diffMs <= 0) {
      return 1;
    }

    const dayInMs = 86_400_000;
    return Math.ceil(diffMs / dayInMs);
  }

  private _normalize(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private _shortenIdentifier(value: string): string {
    if (value.length <= 8) {
      return value;
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }
}
