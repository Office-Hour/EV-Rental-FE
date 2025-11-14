import {
  BookingCardViewModel,
  BookingStatusCounters,
  BookingTabKey,
  BOOKING_STATUS_BADGES,
  BOOKING_VERIFICATION_BADGES,
  RENTAL_LINKED_BADGE,
  RENTAL_NOT_CREATED_BADGE,
  RENTAL_STATUS_BADGES,
  RENTAL_STATUS_LABELS,
  SelectedBookingViewModel,
  StatusBadge,
} from './staff-dashboard.models';
import type { StaffBookingRecord } from '../../../core-logic/bookings/bookings.service';
import {
  BookingStatus as BookingStatusEnum,
  BookingVerificationStatus as BookingVerificationStatusEnum,
  RentalStatus as RentalStatusEnum,
} from '../../../../contract';

interface FilterInput {
  readonly records: readonly StaffBookingRecord[];
  readonly tab: BookingTabKey;
  readonly query: string;
}

export class StaffDashboardPresenter {
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

  calculateStatusCounters(records: readonly StaffBookingRecord[]): BookingStatusCounters {
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
  }

  filterRecords({ records, tab, query }: FilterInput): StaffBookingRecord[] {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter(
      (record) => this.matchesTab(record, tab) && this.matchesSearch(record, normalizedQuery),
    );
  }

  buildCardViewModels(records: readonly StaffBookingRecord[]): BookingCardViewModel[] {
    return records.map((record) => ({
      key: this.buildCardKey(record),
      record,
      customerDisplay: this.resolveCustomerLabel(record),
      bookingCreatedDisplay: this.formatDate(record.bookingCreatedAt),
      rentalStartDisplay: this.formatDate(record.startTime),
      rentalEndDisplay: this.formatDate(record.endTime),
      totalAmountDisplay: this.formatCurrency(this.computeEstimatedTotal(record)),
      depositDisplay: this.formatCurrency(record.vehicleDetails?.depositPrice),
      vehicleDisplay: this.resolveVehicleLabel(record),
      rentalSummary: this.resolveRentalSummary(record),
      badges: this.buildBadges(record),
    }));
  }

  buildSelectedBookingView(record: StaffBookingRecord | null): SelectedBookingViewModel | null {
    if (!record) {
      return null;
    }

    return {
      record,
      customerDisplay: this.resolveCustomerLabel(record),
      badges: this.buildBadges(record),
      createdAtDisplay: this.formatDateTime(record.bookingCreatedAt),
      startDateTimeDisplay: this.formatDateTime(record.startTime),
      endDateTimeDisplay: this.formatDateTime(record.endTime),
      totalAmountDisplay: this.formatCurrency(this.computeEstimatedTotal(record)),
      depositDisplay: this.formatCurrency(record.vehicleDetails?.depositPrice),
      vehicleDisplay: this.resolveVehicleLabel(record),
      rentalSummary: this.resolveRentalSummary(record),
      rentalDays: this.computeRentalDays(record),
    } satisfies SelectedBookingViewModel;
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

  rentalStatusLabel(status?: string | null): string {
    if (!status) {
      return 'Rental Linked';
    }
    return RENTAL_STATUS_LABELS[status as RentalStatusEnum] ?? 'Rental Linked';
  }

  private matchesTab(record: StaffBookingRecord, tab: BookingTabKey): boolean {
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

  private matchesSearch(record: StaffBookingRecord, query: string): boolean {
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
      record.renterProfile?.userName ?? undefined,
      record.renterProfile?.address ?? undefined,
      record.renterProfile?.driverLicenseNo ?? undefined,
    ];

    return haystack.some((value) => value?.toLowerCase().includes(query) ?? false);
  }

  private resolveCustomerLabel(record: StaffBookingRecord): string {
    const customerName = this.normalize(record.renterProfile?.userName ?? undefined);
    const renterId = this.normalize(record.renterId);

    if (customerName && renterId) {
      return `${customerName} · ${this.shortenIdentifier(renterId)}`;
    }

    if (customerName) {
      return customerName;
    }

    if (renterId) {
      return `ID ${this.shortenIdentifier(renterId)}`;
    }

    return 'Customer details unavailable';
  }

  private resolveVehicleLabel(record: StaffBookingRecord): string {
    const details = record.vehicleDetails;
    if (details) {
      const parts = [
        this.normalize(details.make),
        this.normalize(details.model),
        details.modelYear ? details.modelYear.toString() : undefined,
      ].filter((value): value is string => value !== undefined);

      if (parts.length > 0) {
        return parts.join(' ');
      }
    }

    const fallback = this.normalize(record.vehicleAtStationId ?? record.rental?.vehicleId);
    if (fallback) {
      return `Vehicle ${this.shortenIdentifier(fallback)}`;
    }

    return 'Vehicle --';
  }

  private resolveRentalSummary(record: StaffBookingRecord): string {
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
      this.normalize(rental.rentalId) ??
      this.normalize(rental.bookingId) ??
      this.normalize(rental.booking?.bookingId);

    if (rentalId) {
      return `${statusLabel} · ${this.shortenIdentifier(rentalId)}`;
    }

    const startTimeDisplay = this.formatDateTime(rental.startTime);
    if (statusLabel && startTimeDisplay !== '--') {
      return `${statusLabel} · Starts ${startTimeDisplay}`;
    }

    return statusLabel;
  }

  private resolveRentalBadge(record: StaffBookingRecord): StatusBadge | null {
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
      const badge = RENTAL_STATUS_BADGES[rental.status as RentalStatusEnum];
      if (badge) {
        return badge;
      }
    }

    return RENTAL_LINKED_BADGE;
  }

  private buildBadges(record: StaffBookingRecord): StatusBadge[] {
    const badges: StatusBadge[] = [];

    if (record.status) {
      const bookingBadge = BOOKING_STATUS_BADGES[record.status as BookingStatusEnum];
      if (bookingBadge) {
        badges.push(bookingBadge);
      }
    }

    if (record.verificationStatus) {
      const verificationBadge =
        BOOKING_VERIFICATION_BADGES[record.verificationStatus as BookingVerificationStatusEnum];
      if (verificationBadge && !badges.includes(verificationBadge)) {
        badges.push(verificationBadge);
      }
    }

    const rentalBadge = this.resolveRentalBadge(record);
    if (rentalBadge && !badges.includes(rentalBadge)) {
      badges.push(rentalBadge);
    }

    return badges;
  }

  private computeEstimatedTotal(record: StaffBookingRecord): number | undefined {
    const pricePerDay = record.vehicleDetails?.rentalPricePerDay;
    if (pricePerDay === undefined || pricePerDay === null) {
      return undefined;
    }

    const rentalDays = this.computeRentalDays(record);
    if (!rentalDays) {
      return pricePerDay;
    }

    return pricePerDay * rentalDays;
  }

  private computeRentalDays(record: StaffBookingRecord): number | undefined {
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

  private normalize(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private shortenIdentifier(value: string): string {
    if (value.length <= 8) {
      return value;
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }

  private buildCardKey(record: StaffBookingRecord): string {
    const bookingId = record.bookingId;
    const rentalId = record.rental?.rentalId ?? 'no-rental';
    const status = record.status ?? 'unknown-status';
    const verification = record.verificationStatus ?? 'unknown-verification';

    return `${bookingId}|${status}|${verification}|${rentalId}`;
  }
}
