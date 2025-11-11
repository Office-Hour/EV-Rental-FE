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
import { RentalsService, StaffRentalRecord } from '../../../core-logic/rentals/rentals.service';
import {
  BookingStatus as BookingStatusEnum,
  BookingVerificationStatus as BookingVerificationStatusEnum,
  ContractStatus as ContractStatusEnum,
  RentalStatus as RentalStatusEnum,
} from '../../../../contract';
import type {
  BookingStatus,
  BookingVerificationStatus,
  ContractStatus,
  RentalStatus,
} from '../../../../contract';

type RentalTabKey = 'all' | 'reserved' | 'inProgress' | 'completed' | 'late' | 'cancelled';

type StatusTone = 'pending' | 'success' | 'danger' | 'info';

interface StatusBadge {
  readonly text: string;
  readonly tone: StatusTone;
}

interface RentalStatusCounters {
  readonly total: number;
  readonly reserved: number;
  readonly inProgress: number;
  readonly completed: number;
  readonly late: number;
  readonly cancelled: number;
}

interface RentalTabDescriptor {
  readonly key: RentalTabKey;
  readonly label: string;
  readonly counterKey: keyof RentalStatusCounters;
}

interface RentalCardViewModel {
  readonly record: StaffRentalRecord;
  readonly rentalIdDisplay: string;
  readonly statusBadge?: StatusBadge;
  readonly customerDisplay: string;
  readonly pickupDisplay: string;
  readonly expectedReturnDisplay: string;
  readonly rentalFeeDisplay: string;
  readonly depositDisplay: string;
  readonly totalDisplay: string;
  readonly vehicleDisplay: string;
}

interface ContractViewModel {
  readonly contractId: string;
  readonly statusLabel: string;
}

interface SelectedRentalViewModel {
  readonly record: StaffRentalRecord;
  readonly rentalIdDisplay: string;
  readonly bookingIdDisplay: string;
  readonly bookingCreatedDisplay: string;
  readonly statusBadge?: StatusBadge;
  readonly pickupDisplay: string;
  readonly expectedReturnDisplay: string;
  readonly durationDisplay: string;
  readonly rentalFeeDisplay: string;
  readonly depositDisplay: string;
  readonly totalDisplay: string;
  readonly vehicleDisplay: string;
  readonly vehicleAtStationDisplay: string;
  readonly bookingStatusLabel: string;
  readonly bookingVerificationStatusLabel: string;
  readonly verifiedAtDisplay: string;
  readonly verifiedByDisplay: string;
  readonly cancelReasonDisplay: string;
  readonly renterIdDisplay: string;
  readonly renterNameDisplay: string;
  readonly renterDobDisplay: string;
  readonly renterAddressDisplay: string;
  readonly renterLicenseDisplay: string;
  readonly renterRiskScoreDisplay: string;
  readonly ratingDisplay: string;
  readonly ratedAtDisplay: string;
  readonly commentDisplay: string;
  readonly contracts: readonly ContractViewModel[];
}

const RENTAL_TABS: readonly RentalTabDescriptor[] = [
  { key: 'all', label: 'All', counterKey: 'total' },
  { key: 'reserved', label: 'Reserved', counterKey: 'reserved' },
  { key: 'inProgress', label: 'In Progress', counterKey: 'inProgress' },
  { key: 'completed', label: 'Completed', counterKey: 'completed' },
  { key: 'late', label: 'Late', counterKey: 'late' },
  { key: 'cancelled', label: 'Cancelled', counterKey: 'cancelled' },
] as const;

const RENTAL_STATUS_BADGES: Record<RentalStatus, StatusBadge> = {
  [RentalStatusEnum.Reserved]: { text: 'Reserved', tone: 'info' },
  [RentalStatusEnum.InProgress]: { text: 'In Progress', tone: 'pending' },
  [RentalStatusEnum.Completed]: { text: 'Completed', tone: 'success' },
  [RentalStatusEnum.Late]: { text: 'Late', tone: 'danger' },
  [RentalStatusEnum.Cancelled]: { text: 'Cancelled', tone: 'danger' },
};

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  [ContractStatusEnum.Issued]: 'Issued',
  [ContractStatusEnum.PartiallySigned]: 'Partially Signed',
  [ContractStatusEnum.Signed]: 'Signed',
  [ContractStatusEnum.Voided]: 'Voided',
  [ContractStatusEnum.Expired]: 'Expired',
};

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatusEnum.PendingVerification]: 'Pending Verification',
  [BookingStatusEnum.Verified]: 'Verified',
  [BookingStatusEnum.Cancelled]: 'Cancelled',
  [BookingStatusEnum.RentalCreated]: 'Rental Created',
};

const BOOKING_VERIFICATION_STATUS_LABELS: Record<BookingVerificationStatus, string> = {
  [BookingVerificationStatusEnum.Pending]: 'Pending',
  [BookingVerificationStatusEnum.Approved]: 'Approved',
  [BookingVerificationStatusEnum.RejectedMismatch]: 'Rejected - Mismatch',
  [BookingVerificationStatusEnum.RejectedOther]: 'Rejected - Other',
};

@Component({
  selector: 'app-rental-management',
  imports: [MatIconModule],
  templateUrl: './rental-management.html',
  styleUrl: './rental-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalManagement {
  private readonly rentalsService = inject(RentalsService);
  @ViewChild('detailPanel') private detailPanel?: ElementRef<HTMLDivElement>;
  private activeDetailTrigger: HTMLElement | null = null;

  readonly tabs = RENTAL_TABS;
  readonly searchTerm = signal('');
  readonly activeTab = signal<RentalTabKey>('all');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly selectedRental = signal<StaffRentalRecord | null>(null);

  readonly loading = computed(() => this.rentalsService.staffRentalsLoading());
  readonly error = computed(() => this.rentalsService.staffRentalsError());
  private readonly allRecords = computed(() => this.rentalsService.staffRentals());
  private readonly normalizedSearch = computed(() => this.searchTerm().trim().toLowerCase());

  readonly statusCounters = computed<RentalStatusCounters>(() => {
    const records = this.allRecords();
    let reserved = 0;
    let inProgress = 0;
    let completed = 0;
    let late = 0;
    let cancelled = 0;

    for (const record of records) {
      switch (record.status) {
        case RentalStatusEnum.Reserved:
          reserved += 1;
          break;
        case RentalStatusEnum.InProgress:
          inProgress += 1;
          break;
        case RentalStatusEnum.Completed:
          completed += 1;
          break;
        case RentalStatusEnum.Late:
          late += 1;
          break;
        case RentalStatusEnum.Cancelled:
          cancelled += 1;
          break;
        default:
          break;
      }
    }

    return {
      total: records.length,
      reserved,
      inProgress,
      completed,
      late,
      cancelled,
    } satisfies RentalStatusCounters;
  });

  private readonly filteredRecords = computed(() => {
    const tab = this.activeTab();
    const query = this.normalizedSearch();

    return this.allRecords().filter(
      (record) => this._matchesTab(record, tab) && this._matchesSearch(record, query),
    );
  });

  readonly cardViewModels = computed<RentalCardViewModel[]>(() =>
    this.filteredRecords().map((record) => {
      const statusBadge = record.status ? RENTAL_STATUS_BADGES[record.status] : undefined;
      const rentalFee = this._computeRentalFee(record);
      const deposit = record.vehicleDetails?.depositPrice ?? undefined;

      return {
        record,
        rentalIdDisplay: this._formatRentalId(record.rentalId),
        statusBadge,
        customerDisplay: this._resolveCustomerLabel(record),
        pickupDisplay: this.formatDateTime(record.startTime ?? record.booking?.startDate),
        expectedReturnDisplay: this.formatDateTime(record.endTime ?? record.booking?.endDate),
        rentalFeeDisplay: this.formatCurrency(rentalFee),
        depositDisplay: this.formatCurrency(deposit),
        totalDisplay: this.formatCurrency(this._computeTotalAmount(rentalFee, deposit)),
        vehicleDisplay: this._resolveVehicleLabel(record),
      } satisfies RentalCardViewModel;
    }),
  );

  readonly selectedRentalView = computed<SelectedRentalViewModel | null>(() => {
    const record = this.selectedRental();
    if (!record) {
      return null;
    }

    const statusBadge = record.status ? RENTAL_STATUS_BADGES[record.status] : undefined;
    const rentalFee = this._computeRentalFee(record);
    const deposit = record.vehicleDetails?.depositPrice ?? undefined;
    const renterProfile = record.renterProfile;

    const renterName = this._normalize(renterProfile?.userName);
    const renterAddress = this._normalize(renterProfile?.address);
    const renterLicense = this._normalize(renterProfile?.driverLicenseNo);
    const renterRiskScore =
      typeof renterProfile?.riskScore === 'number' ? renterProfile.riskScore : undefined;

    return {
      record,
      rentalIdDisplay: record.rentalId,
      bookingIdDisplay: record.bookingId ?? '--',
      bookingCreatedDisplay: this.formatDateTime(record.bookingCreatedAt),
      statusBadge,
      pickupDisplay: this.formatDateTime(record.startTime ?? record.booking?.startDate),
      expectedReturnDisplay: this.formatDateTime(record.endTime ?? record.booking?.endDate),
      durationDisplay: this._formatDuration(record),
      rentalFeeDisplay: this.formatCurrency(rentalFee),
      depositDisplay: this.formatCurrency(deposit),
      totalDisplay: this.formatCurrency(this._computeTotalAmount(rentalFee, deposit)),
      vehicleDisplay: this._resolveVehicleLabel(record),
      vehicleAtStationDisplay: this._formatVehicleStation(record),
      bookingStatusLabel: this._labelBookingStatus(record.bookingStatus),
      bookingVerificationStatusLabel: this._labelVerificationStatus(
        record.bookingVerificationStatus,
      ),
      verifiedAtDisplay: this.formatDateTime(record.verifiedAt),
      verifiedByDisplay: this._normalize(record.verifiedByStaffId) ?? '--',
      cancelReasonDisplay: this._normalize(record.cancelReason) ?? '--',
      renterIdDisplay: record.renterId ?? '--',
      renterNameDisplay: renterName ?? '--',
      renterDobDisplay: this.formatDate(renterProfile?.dateOfBirth ?? undefined),
      renterAddressDisplay: renterAddress ?? '--',
      renterLicenseDisplay: renterLicense ?? '--',
      renterRiskScoreDisplay: this._formatRiskScore(renterRiskScore),
      ratingDisplay: this._formatRating(record.score),
      ratedAtDisplay: this.formatDateTime(record.ratedAt),
      commentDisplay: this._normalize(record.comment) ?? '--',
      contracts: this._buildContractViewModels(record),
    } satisfies SelectedRentalViewModel;
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
    this.rentalsService.loadStaffRentals().pipe(take(1)).subscribe();
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

  onTabSelect(tab: RentalTabKey): void {
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

  openDetails(record: StaffRentalRecord, triggerEvent?: Event): void {
    this.activeDetailTrigger =
      triggerEvent?.currentTarget instanceof HTMLElement ? triggerEvent.currentTarget : null;
    this.selectedRental.set(record);
    afterNextRender(() => {
      this.detailPanel?.nativeElement.focus();
    });
  }

  closeDetails(): void {
    this.selectedRental.set(null);
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

  private _matchesTab(record: StaffRentalRecord, tab: RentalTabKey): boolean {
    switch (tab) {
      case 'reserved':
        return record.status === RentalStatusEnum.Reserved;
      case 'inProgress':
        return record.status === RentalStatusEnum.InProgress;
      case 'completed':
        return record.status === RentalStatusEnum.Completed;
      case 'late':
        return record.status === RentalStatusEnum.Late;
      case 'cancelled':
        return record.status === RentalStatusEnum.Cancelled;
      default:
        return true;
    }
  }

  private _matchesSearch(record: StaffRentalRecord, query: string): boolean {
    if (query.length === 0) {
      return true;
    }

    const haystack: (string | undefined)[] = [
      record.rentalId,
      record.bookingId,
      record.renterId,
      record.vehicleId,
      record.vehicle?.vehicleAtStationId,
      record.vehicleDetails?.vehicleAtStationId ?? undefined,
      record.vehicleDetails?.make ?? undefined,
      record.vehicleDetails?.model ?? undefined,
      record.renterProfile?.userName ?? undefined,
      record.renterProfile?.driverLicenseNo ?? undefined,
    ];

    return haystack.some((value) => value?.toLowerCase().includes(query) ?? false);
  }

  private _resolveCustomerLabel(record: StaffRentalRecord): string {
    const renterName = this._normalize(record.renterProfile?.userName);
    if (renterName) {
      return renterName;
    }

    const renterId =
      this._normalize(record.renterId) ??
      this._normalize(record.booking?.renterId) ??
      this._normalize(record.bookingDetails?.renterId);
    if (renterId) {
      return this._shortenIdentifier(renterId);
    }

    return '--';
  }

  private _resolveVehicleLabel(record: StaffRentalRecord): string {
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

    const fallback = this._normalize(record.vehicleId ?? record.vehicle?.vehicleAtStationId);
    if (fallback) {
      return `Vehicle ${this._shortenIdentifier(fallback)}`;
    }

    return 'Vehicle --';
  }

  private _formatVehicleStation(record: StaffRentalRecord): string {
    const fromDetails = this._normalize(record.vehicleDetails?.vehicleAtStationId);
    if (fromDetails) {
      return fromDetails;
    }

    const vehicleStationId = this._normalize(record.vehicle?.vehicleAtStationId);
    if (vehicleStationId) {
      return vehicleStationId;
    }
    return '--';
  }

  private _formatRentalId(rentalId: string): string {
    return rentalId.length > 0 ? `#${rentalId}` : '--';
  }

  private _buildContractViewModels(record: StaffRentalRecord): readonly ContractViewModel[] {
    if (!record.contracts) {
      return [];
    }

    const results: ContractViewModel[] = [];
    for (const contract of record.contracts) {
      if (!contract?.contractId || !contract.status) {
        continue;
      }
      const statusLabel = CONTRACT_STATUS_LABELS[contract.status] ?? contract.status;
      results.push({ contractId: contract.contractId, statusLabel });
    }

    return results;
  }

  private _labelBookingStatus(status?: BookingStatus | null): string {
    if (!status) {
      return '--';
    }
    return BOOKING_STATUS_LABELS[status] ?? status;
  }

  private _labelVerificationStatus(status?: BookingVerificationStatus | null): string {
    if (!status) {
      return '--';
    }
    return BOOKING_VERIFICATION_STATUS_LABELS[status] ?? status;
  }

  private _formatRiskScore(value?: number): string {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return '--';
    }
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }

  private _formatRating(value?: number | null): string {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return '--';
    }
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }

  private _computeRentalFee(record: StaffRentalRecord): number | undefined {
    const start = this._parseDate(record.startTime ?? record.booking?.startDate);
    const end = this._parseDate(record.endTime ?? record.booking?.endDate);
    if (!start || !end || end <= start) {
      return (
        record.vehicleDetails?.rentalPricePerDay ??
        record.vehicleDetails?.rentalPricePerHour ??
        undefined
      );
    }

    const vehicleDetails = record.vehicleDetails;
    if (!vehicleDetails) {
      return undefined;
    }

    const diffMs = end - start;
    const dayInMs = 86_400_000;
    const hourInMs = 3_600_000;

    if (vehicleDetails.rentalPricePerDay && vehicleDetails.rentalPricePerDay > 0) {
      const days = Math.max(1, Math.ceil(diffMs / dayInMs));
      return vehicleDetails.rentalPricePerDay * days;
    }

    if (vehicleDetails.rentalPricePerHour && vehicleDetails.rentalPricePerHour > 0) {
      const hours = Math.max(1, Math.ceil(diffMs / hourInMs));
      return vehicleDetails.rentalPricePerHour * hours;
    }

    return undefined;
  }

  private _computeTotalAmount(rentalFee?: number, deposit?: number): number | undefined {
    if (rentalFee === undefined && deposit === undefined) {
      return undefined;
    }

    const safeRental = rentalFee ?? 0;
    const safeDeposit = deposit ?? 0;
    const total = safeRental + safeDeposit;
    return total > 0 ? total : undefined;
  }

  private _formatDuration(record: StaffRentalRecord): string {
    const start = this._parseDate(record.startTime ?? record.booking?.startDate);
    const end = this._parseDate(record.endTime ?? record.booking?.endDate);

    if (!start || !end || end <= start) {
      return '--';
    }

    const diffMs = end - start;
    const dayInMs = 86_400_000;
    const hourInMs = 3_600_000;

    const days = Math.floor(diffMs / dayInMs);
    const remainingHours = Math.ceil((diffMs % dayInMs) / hourInMs);

    const parts: string[] = [];
    if (days > 0) {
      parts.push(`${days} day${days > 1 ? 's' : ''}`);
    }
    if (remainingHours > 0) {
      parts.push(`${remainingHours} hour${remainingHours > 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? parts.join(' ') : '--';
  }

  private _parseDate(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? undefined : timestamp;
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
