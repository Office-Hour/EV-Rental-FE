import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  afterNextRender,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { map, take } from 'rxjs';
import {
  FulfillmentAnalyticsService,
  FulfillmentOrchestrator,
  FulfillmentStepId,
  FulfillmentStepState,
} from '../../../../../core-logic/rental-fulfillment';
import type {
  BookingFulfillmentSummary,
  FulfillmentTimelineEvent,
} from '../../../../../core-logic/rental-fulfillment';
import {
  BookingStatus as BookingStatusEnum,
  BookingVerificationStatus as BookingVerificationStatusEnum,
} from '../../../../../../contract';

interface SummaryViewModel {
  readonly bookingId: string;
  readonly bookingStatusLabel: string;
  readonly verificationStatusLabel: string;
  readonly renterName: string;
  readonly renterLicense: string;
  readonly renterAddress: string;
  readonly vehicleLabel: string;
  readonly depositDisplay: string;
  readonly rentalWindowDisplay: string;
  readonly createdAtDisplay: string;
}

interface StepViewModel {
  readonly step: FulfillmentStepId;
  readonly title: string;
  readonly description: string;
  readonly status: FulfillmentStepState['status'];
  readonly isCurrent: boolean;
  readonly canPerform: boolean;
  readonly disabled: boolean;
  readonly errorMessage?: string;
  readonly completedAtDisplay?: string;
}

interface TimelineViewModel {
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  readonly actorLabel: string;
  readonly occurredAtDisplay: string;
  readonly metadataEntries: readonly { readonly label: string; readonly value: string }[];
}

const STEP_CONFIG: Record<
  FulfillmentStepId,
  { readonly title: string; readonly description: string }
> = {
  checkin: {
    title: 'Duyệt đặt xe',
    description: 'Xác nhận khách đã hoàn tất kiểm tra và cho phép tạo đơn thuê.',
  },
  'create-rental': {
    title: 'Tạo đơn thuê',
    description: 'Tạo đơn thuê từ booking đã duyệt để bắt đầu quy trình bàn giao.',
  },
  'create-contract': {
    title: 'Phát hành hợp đồng',
    description: 'Khởi tạo hợp đồng điện tử cho đơn thuê và gửi tới các bên liên quan.',
  },
  inspection: {
    title: 'Ghi nhận kiểm tra xe',
    description: 'Thu thập thông tin kiểm tra xe trước khi bàn giao cho khách.',
  },
  'sign-renter': {
    title: 'Khách ký hợp đồng',
    description: 'Lấy chữ ký số của khách thuê trên hợp đồng điện tử.',
  },
  'sign-staff': {
    title: 'Nhân viên ký hợp đồng',
    description: 'Nhân viên xác nhận hợp đồng sau khi khách đã ký.',
  },
  'vehicle-receive': {
    title: 'Xác nhận bàn giao xe',
    description: 'Ghi nhận thời điểm bàn giao xe và người phụ trách.',
  },
};

const STEP_ACTIONABLE: FulfillmentStepId[] = ['checkin'];

@Component({
  selector: 'app-fulfillment-page',
  imports: [CommonModule, MatIconModule, RouterLink],
  templateUrl: './fulfillment-page.html',
  styleUrl: './fulfillment-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-[calc(100vh-120px)] bg-surface p-6 sm:p-10',
  },
})
export class FulfillmentPage {
  private readonly route = inject(ActivatedRoute);
  private readonly orchestrator = inject(FulfillmentOrchestrator);
  private readonly title = inject(Title);
  private readonly analytics = inject(FulfillmentAnalyticsService);

  private readonly headingRef = viewChild<ElementRef<HTMLHeadingElement>>('pageHeading');
  private readonly initializationError = signal<string | null>(null);
  private readonly routeEntered = signal<boolean>(false);

  readonly summary = this.orchestrator.summary;
  readonly steps = this.orchestrator.steps;
  readonly nextStep = this.orchestrator.nextStep;
  readonly completionPercentage = this.orchestrator.completionPercentage;
  readonly isBusy = this.orchestrator.isBusy;

  private readonly bookingIdSignal = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('bookingId') ?? '')),
    {
      initialValue: this.route.snapshot.paramMap.get('bookingId') ?? '',
    },
  );

  private readonly currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });

  private readonly dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  readonly summaryView = computed<SummaryViewModel | null>(() => {
    const summary = this.summary();
    if (!summary) {
      return null;
    }

    return this._buildSummaryView(summary);
  });

  readonly stepViewModels = computed<StepViewModel[]>(() => {
    const steps = this.steps();
    const next = this.nextStep();
    const busy = this.isBusy();

    return steps.map((step) => this._toStepViewModel(step, next, busy));
  });

  readonly timelineView = computed<readonly TimelineViewModel[]>(() => {
    const summary = this.summary();
    if (!summary?.timeline) {
      return [];
    }

    return summary.timeline.map((event, index) => this._toTimelineViewModel(event, index));
  });

  readonly hasFailure = computed(() =>
    this.stepViewModels().some((step) => step.status === 'error' && !!step.errorMessage),
  );

  readonly initializationErrorMessage = computed(() => this.initializationError());

  constructor() {
    effect(
      () => {
        const bookingId = this.bookingIdSignal();
        if (!bookingId) {
          return;
        }

        this._loadFulfillment(bookingId);
      },
      { allowSignalWrites: true },
    );
  }

  retry(): void {
    const bookingId = this.bookingIdSignal();
    if (!bookingId) {
      return;
    }

    this._loadFulfillment(bookingId);
  }

  refresh(): void {
    this.orchestrator.refresh().pipe(take(1)).subscribe();
  }

  onCheckIn(): void {
    if (this.isBusy() || !this._isActionable('checkin')) {
      return;
    }

    const bookingId = this._bookingId();
    if (bookingId) {
      this.analytics.stepStarted(bookingId, 'checkin');
    }

    this.orchestrator.checkInBooking().pipe(take(1)).subscribe();
  }

  trackByStep(_index: number, step: StepViewModel): string {
    return step.step;
  }

  trackByTimeline(_index: number, event: TimelineViewModel): string {
    return event.key;
  }

  statusLabel(status: FulfillmentStepState['status']): string {
    switch (status) {
      case 'pending':
        return 'Chưa thực hiện';
      case 'in-progress':
        return 'Đang xử lý';
      case 'fulfilled':
        return 'Hoàn tất';
      case 'error':
        return 'Gặp lỗi';
      default:
        return 'Không xác định';
    }
  }

  private _loadFulfillment(rawBookingId: string): void {
    const bookingId = rawBookingId.trim();
    if (!bookingId) {
      this.initializationError.set('Booking ID không hợp lệ.');
      return;
    }

    this.initializationError.set(null);
    this.routeEntered.set(false);

    this.orchestrator
      .initialize(bookingId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this._setPageTitle(bookingId);
          this._focusHeading();
          this._emitRouteEntry(bookingId);
        },
        error: (error) => {
          const message = error instanceof Error && error.message ? error.message : null;
          this.initializationError.set(
            message ?? 'Không thể tải quy trình xử lý đặt xe. Vui lòng thử lại.',
          );
        },
      });
  }

  private _isActionable(stepId: FulfillmentStepId): boolean {
    return STEP_ACTIONABLE.includes(stepId);
  }

  private _toStepViewModel(
    step: FulfillmentStepState,
    next: FulfillmentStepState | undefined,
    isBusy: boolean,
  ): StepViewModel {
    const config = STEP_CONFIG[step.step];
    const isCurrent = next?.step === step.step;
    const canPerform = this._isActionable(step.step) && step.status !== 'fulfilled';
    const disabled = isBusy || !canPerform;

    return {
      step: step.step,
      title: config?.title ?? step.step,
      description: config?.description ?? '',
      status: step.status,
      isCurrent,
      canPerform,
      disabled,
      errorMessage: step.error?.message,
      completedAtDisplay: this._formatDateTime(step.completedAt),
    } satisfies StepViewModel;
  }

  private _buildSummaryView(summary: BookingFulfillmentSummary): SummaryViewModel {
    const booking = summary.booking;
    const renter = summary.renterProfile;
    const vehicle = summary.vehicleDetails;

    return {
      bookingId: summary.bookingId,
      bookingStatusLabel: this._bookingStatusLabel(summary.status),
      verificationStatusLabel: this._verificationStatusLabel(summary.verificationStatus),
      renterName: renter?.userName?.trim() || 'Chưa có tên khách',
      renterLicense: renter?.driverLicenseNo?.trim() || 'Không có giấy phép',
      renterAddress: renter?.address?.trim() || 'Không có địa chỉ',
      vehicleLabel: this._vehicleLabel(vehicle),
      depositDisplay: this._formatCurrency(vehicle?.depositPrice),
      rentalWindowDisplay: this._formatDateRange(booking?.startTime, booking?.endTime),
      createdAtDisplay: this._formatDateTime(booking?.bookingCreatedAt),
    } satisfies SummaryViewModel;
  }

  private _toTimelineViewModel(event: FulfillmentTimelineEvent, index: number): TimelineViewModel {
    return {
      key: `${event.step}-${index}`,
      title: event.title,
      description: event.description ?? undefined,
      actorLabel: this._actorLabel(event.actor),
      occurredAtDisplay: this._formatDateTime(event.occurredAt),
      metadataEntries: this._metadataEntries(event),
    } satisfies TimelineViewModel;
  }

  private _actorLabel(actor: FulfillmentTimelineEvent['actor']): string {
    switch (actor) {
      case 'renter':
        return 'Khách thuê';
      case 'staff':
        return 'Nhân viên';
      default:
        return 'Hệ thống';
    }
  }

  private _metadataEntries(event: FulfillmentTimelineEvent): readonly {
    readonly label: string;
    readonly value: string;
  }[] {
    const metadata = event.metadata ?? {};
    const entries: { readonly label: string; readonly value: string }[] = [];

    for (const [key, value] of Object.entries(metadata)) {
      if (!value) {
        continue;
      }

      entries.push({
        label: key,
        value,
      });
    }

    return entries;
  }

  private _vehicleLabel(vehicle: BookingFulfillmentSummary['vehicleDetails']): string {
    if (!vehicle) {
      return 'Chưa có thông tin xe';
    }

    const { make, model, modelYear } = vehicle;
    const parts = [make?.trim(), model?.trim(), modelYear ? modelYear.toString() : undefined]
      .filter((part): part is string => !!part && part.length > 0)
      .join(' ');

    return parts.length > 0 ? parts : 'Chưa có thông tin xe';
  }

  private _bookingStatusLabel(status: BookingFulfillmentSummary['status']): string {
    switch (status) {
      case BookingStatusEnum.PendingVerification:
        return 'Chờ xác minh';
      case BookingStatusEnum.Verified:
        return 'Đã xác minh';
      case BookingStatusEnum.Cancelled:
        return 'Đã hủy';
      case BookingStatusEnum.RentalCreated:
        return 'Đã tạo đơn thuê';
      default:
        return 'Không rõ trạng thái';
    }
  }

  private _verificationStatusLabel(
    status: BookingFulfillmentSummary['verificationStatus'],
  ): string {
    switch (status) {
      case BookingVerificationStatusEnum.Pending:
        return 'Chờ duyệt';
      case BookingVerificationStatusEnum.Approved:
        return 'Đã duyệt';
      case BookingVerificationStatusEnum.RejectedMismatch:
      case BookingVerificationStatusEnum.RejectedOther:
        return 'Bị từ chối';
      default:
        return 'Không rõ trạng thái';
    }
  }

  private _formatCurrency(value?: number | null): string {
    if (value === undefined || value === null) {
      return '--';
    }

    return this.currencyFormatter.format(value);
  }

  private _formatDateTime(value?: string | null): string {
    if (!value) {
      return '--';
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return '--';
    }

    return this.dateTimeFormatter.format(new Date(timestamp));
  }

  private _formatDateRange(start?: string | null, end?: string | null): string {
    const startDisplay = this._formatDateTime(start);
    const endDisplay = this._formatDateTime(end);

    if (startDisplay === '--' && endDisplay === '--') {
      return '--';
    }

    return `${startDisplay} → ${endDisplay}`;
  }

  private _setPageTitle(bookingId: string): void {
    this.title.setTitle(`Xử lý đặt xe · ${this._shortIdentifier(bookingId)}`);
  }

  private _focusHeading(): void {
    afterNextRender(() => {
      const heading = this.headingRef();
      heading?.nativeElement.focus();
    });
  }

  private _emitRouteEntry(bookingId: string): void {
    if (this.routeEntered()) {
      return;
    }

    this.analytics.routeEntered(bookingId);
    this.routeEntered.set(true);
  }

  private _shortIdentifier(value: string): string {
    if (value.length <= 10) {
      return value;
    }

    return `${value.slice(0, 4)}…${value.slice(-4)}`;
  }

  private _bookingId(): string {
    return this.bookingIdSignal().trim();
  }
}
