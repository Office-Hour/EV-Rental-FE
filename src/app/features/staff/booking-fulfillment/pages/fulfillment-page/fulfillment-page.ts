import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  afterNextRender,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  InspectionPayload,
  SignaturePayload,
  VehicleReceivePayload,
} from '../../../../../core-logic/rental-fulfillment';
import type {
  BookingFulfillmentSummary,
  FulfillmentTimelineEvent,
} from '../../../../../core-logic/rental-fulfillment';
import {
  EsignProvider as EsignProviderEnum,
  BookingStatus as BookingStatusEnum,
  BookingVerificationStatus as BookingVerificationStatusEnum,
} from '../../../../../../contract';
import { InspectionFormComponent } from '../../components/inspection-form/inspection-form';
import { SignatureStepComponent } from '../../components/signature-step/signature-step';

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
  readonly rentalId?: string;
  readonly contractId?: string;
  readonly inspectionId?: string;
  readonly renterSignatureId?: string;
  readonly staffSignatureId?: string;
  readonly vehicleReceipt?: {
    readonly receivedAtDisplay: string;
    readonly receivedByStaffId?: string;
  };
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
  readonly action: StepActionConfig;
  readonly artifactEntries: readonly StepArtifactEntry[];
}

interface TimelineViewModel {
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  readonly actorLabel: string;
  readonly occurredAtDisplay: string;
  readonly metadataEntries: readonly { readonly label: string; readonly value: string }[];
}

type StepActionConfig =
  | { readonly kind: 'button'; readonly label: string }
  | { readonly kind: 'contract' }
  | { readonly kind: 'inspection' }
  | { readonly kind: 'signature'; readonly role: 'renter' | 'staff' }
  | { readonly kind: 'vehicle' }
  | { readonly kind: 'none' };

interface StepArtifactEntry {
  readonly label: string;
  readonly value: string;
}

interface SummaryArtifacts {
  readonly rentalId?: string;
  readonly contractId?: string;
  readonly inspectionId?: string;
  readonly renterSignatureId?: string;
  readonly staffSignatureId?: string;
  readonly vehicleReceipt?: {
    readonly receivedAt?: string;
    readonly receivedByStaffId?: string;
  };
}

const STEP_CONFIG: Record<
  FulfillmentStepId,
  { readonly title: string; readonly description: string; readonly action: StepActionConfig }
> = {
  checkin: {
    title: 'Duyệt đặt xe',
    description: 'Xác nhận khách đã hoàn tất kiểm tra và cho phép tạo đơn thuê.',
    action: { kind: 'button', label: 'Xác nhận check-in booking' },
  },
  'create-rental': {
    title: 'Tạo đơn thuê',
    description: 'Tạo đơn thuê từ booking đã duyệt để bắt đầu quy trình bàn giao.',
    action: { kind: 'button', label: 'Tạo đơn thuê' },
  },
  'create-contract': {
    title: 'Phát hành hợp đồng',
    description: 'Khởi tạo hợp đồng điện tử cho đơn thuê và gửi tới các bên liên quan.',
    action: { kind: 'contract' },
  },
  inspection: {
    title: 'Ghi nhận kiểm tra xe',
    description: 'Thu thập thông tin kiểm tra xe trước khi bàn giao cho khách.',
    action: { kind: 'inspection' },
  },
  'sign-renter': {
    title: 'Khách ký hợp đồng',
    description: 'Lấy chữ ký số của khách thuê trên hợp đồng điện tử.',
    action: { kind: 'signature', role: 'renter' },
  },
  'sign-staff': {
    title: 'Nhân viên ký hợp đồng',
    description: 'Nhân viên xác nhận hợp đồng sau khi khách đã ký.',
    action: { kind: 'signature', role: 'staff' },
  },
  'vehicle-receive': {
    title: 'Xác nhận bàn giao xe',
    description: 'Ghi nhận thời điểm bàn giao xe và người phụ trách.',
    action: { kind: 'vehicle' },
  },
};

const CONTRACT_PROVIDERS: readonly {
  readonly value: (typeof EsignProviderEnum)[keyof typeof EsignProviderEnum];
  readonly label: string;
}[] = [
  { value: EsignProviderEnum.Native, label: 'EV Rental eSign' },
  { value: EsignProviderEnum.Docusign, label: 'DocuSign' },
  { value: EsignProviderEnum.Adobesign, label: 'Adobe Sign' },
  { value: EsignProviderEnum.Signnow, label: 'SignNow' },
  { value: EsignProviderEnum.Other, label: 'Nhà cung cấp khác' },
];

@Component({
  selector: 'app-fulfillment-page',
  imports: [
    CommonModule,
    MatIconModule,
    RouterLink,
    ReactiveFormsModule,
    InspectionFormComponent,
    SignatureStepComponent,
  ],
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
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly headingRef = viewChild<ElementRef<HTMLHeadingElement>>('pageHeading');
  private readonly initializationError = signal<string | null>(null);
  private readonly routeEntered = signal<boolean>(false);

  private readonly _contractProvider = signal<
    (typeof EsignProviderEnum)[keyof typeof EsignProviderEnum]
  >(EsignProviderEnum.Native);
  readonly contractProviders = CONTRACT_PROVIDERS;
  readonly selectedContractProvider = this._contractProvider.asReadonly();

  private readonly vehicleReceiveSubmitAttempted = signal(false);
  readonly vehicleReceiveForm = this.formBuilder.group({
    receivedAt: this.formBuilder.control(this._defaultDateTimeInput(), {
      validators: [Validators.required],
    }),
  });

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

    const artifacts = this._collectSummaryArtifacts(summary);
    return this._buildSummaryView(summary, artifacts);
  });

  readonly stepViewModels = computed<StepViewModel[]>(() => {
    const steps = this.steps();
    const next = this.nextStep();
    const busy = this.isBusy();
    const stepMap = new Map(steps.map((stepState) => [stepState.step, stepState] as const));

    return steps.map((step) => this._toStepViewModel(step, next, busy, stepMap));
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

    effect(() => {
      const shouldDisable = this.isBusy() || !this._canPerformStep('vehicle-receive');
      if (shouldDisable) {
        this.vehicleReceiveForm.disable({ emitEvent: false });
      } else {
        this.vehicleReceiveForm.enable({ emitEvent: false });
      }
    });

    effect(
      () => {
        const vehicleStep = this.stepViewModels().find((step) => step.step === 'vehicle-receive');
        if (vehicleStep?.status === 'fulfilled') {
          this.vehicleReceiveSubmitAttempted.set(false);
        }
      },
      { allowSignalWrites: true },
    );

    effect(() => {
      if (!this.routeEntered()) {
        return;
      }

      this._focusHeading();
    });

    effect(() => {
      this.orchestrator.snapshot();
      this.initializationError();
      this.routeEntered();
      queueMicrotask(() => this.cdr.detectChanges());
    });
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
    if (this.isBusy() || !this._canPerformStep('checkin')) {
      return;
    }

    const bookingId = this._bookingId();
    if (bookingId) {
      this.analytics.stepStarted(bookingId, 'checkin');
    }

    this.orchestrator.checkInBooking().pipe(take(1)).subscribe();
  }

  onCreateRental(): void {
    if (this.isBusy() || !this._canPerformStep('create-rental')) {
      return;
    }

    const bookingId = this._bookingId();
    if (bookingId) {
      this.analytics.stepStarted(bookingId, 'create-rental');
    }

    this.orchestrator.createRental().pipe(take(1)).subscribe();
  }

  onContractProviderChange(event: Event): void {
    const select = event.target instanceof HTMLSelectElement ? event.target : null;
    if (!select) {
      return;
    }

    const selectedValue =
      select.value as (typeof EsignProviderEnum)[keyof typeof EsignProviderEnum];
    const provider =
      CONTRACT_PROVIDERS.find((option) => option.value === selectedValue)?.value ??
      EsignProviderEnum.Native;
    this._contractProvider.set(provider);
  }

  onCreateContract(): void {
    if (this.isBusy() || !this._canPerformStep('create-contract')) {
      return;
    }

    const bookingId = this._bookingId();
    if (bookingId) {
      this.analytics.stepStarted(bookingId, 'create-contract');
    }

    this.orchestrator.createContract(this._contractProvider()).pipe(take(1)).subscribe();
  }

  onSubmitInspection(payload: InspectionPayload): void {
    if (this.isBusy() || !this._canPerformStep('inspection')) {
      return;
    }

    const bookingId = this._bookingId();
    if (bookingId) {
      this.analytics.stepStarted(bookingId, 'inspection');
    }

    this.orchestrator.submitInspection(payload).pipe(take(1)).subscribe();
  }

  onStepButton(stepId: FulfillmentStepId): void {
    switch (stepId) {
      case 'checkin':
        this.onCheckIn();
        return;
      case 'create-rental':
        this.onCreateRental();
        return;
      default:
        return;
    }
  }

  onSubmitSignature(payload: SignaturePayload): void {
    const stepId: FulfillmentStepId = payload.role === 'renter' ? 'sign-renter' : 'sign-staff';
    if (this.isBusy() || !this._canPerformStep(stepId)) {
      return;
    }

    const bookingId = this._bookingId();
    if (bookingId) {
      this.analytics.stepStarted(bookingId, stepId);
    }

    this.orchestrator.signContract(payload).pipe(take(1)).subscribe();
  }

  onSubmitVehicleReceive(): void {
    this.vehicleReceiveSubmitAttempted.set(true);

    if (this.isBusy() || !this._canPerformStep('vehicle-receive')) {
      return;
    }

    if (this.vehicleReceiveForm.invalid) {
      this.vehicleReceiveForm.markAllAsTouched();
      return;
    }

    const receivedAtInput = this.vehicleReceiveForm.controls.receivedAt.value;
    const receivedAtIso = this._toIsoString(receivedAtInput);
    if (!receivedAtIso) {
      this.vehicleReceiveForm.controls.receivedAt.setErrors({ required: true });
      return;
    }

    const bookingId = this._bookingId();
    if (bookingId) {
      this.analytics.stepStarted(bookingId, 'vehicle-receive');
    }

    const payload: VehicleReceivePayload = {
      receivedAt: receivedAtIso,
    };

    this.orchestrator
      .confirmVehicleReceive(payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.vehicleReceiveSubmitAttempted.set(false);
          this.vehicleReceiveForm.reset(
            { receivedAt: this._defaultDateTimeInput() },
            { emitEvent: false },
          );
        },
      });
  }

  vehicleReceiveError(error: string): boolean {
    const control = this.vehicleReceiveForm.controls.receivedAt;
    return control.hasError(error) && (control.touched || this.vehicleReceiveSubmitAttempted());
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
    const config = STEP_CONFIG[stepId];
    return !!config && config.action.kind !== 'none';
  }

  private _toStepViewModel(
    step: FulfillmentStepState,
    next: FulfillmentStepState | undefined,
    isBusy: boolean,
    stepMap: ReadonlyMap<FulfillmentStepId, FulfillmentStepState>,
  ): StepViewModel {
    const config = STEP_CONFIG[step.step];
    const isCurrent = next?.step === step.step;
    const action = config?.action ?? { kind: 'none' };
    const prerequisitesMet = this._prerequisitesFulfilled(step, stepMap);
    const canPerform =
      action.kind !== 'none' &&
      step.status !== 'fulfilled' &&
      step.status !== 'in-progress' &&
      prerequisitesMet;
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
      action,
      artifactEntries: this._artifactEntries(step),
    } satisfies StepViewModel;
  }

  private _prerequisitesFulfilled(
    step: FulfillmentStepState,
    stepMap: ReadonlyMap<FulfillmentStepId, FulfillmentStepState>,
  ): boolean {
    const requirements = step.requires;
    if (!requirements || requirements.length === 0) {
      return true;
    }

    return requirements.every(
      (requiredStepId) => stepMap.get(requiredStepId)?.status === 'fulfilled',
    );
  }

  private _canPerformStep(stepId: FulfillmentStepId): boolean {
    const stepMap = new Map(this.steps().map((state) => [state.step, state] as const));
    const step = stepMap.get(stepId);
    if (!step) {
      return false;
    }

    const config = STEP_CONFIG[stepId];
    if (!config || config.action.kind === 'none') {
      return false;
    }

    if (step.status === 'fulfilled' || step.status === 'in-progress') {
      return false;
    }

    return this._prerequisitesFulfilled(step, stepMap);
  }

  private _artifactEntries(step: FulfillmentStepState): StepArtifactEntry[] {
    const artifact = step.artifact;
    if (!artifact) {
      return [];
    }

    const entries: StepArtifactEntry[] = [];

    if (artifact.rentalId) {
      entries.push({ label: 'Mã đơn thuê', value: artifact.rentalId });
    }

    if (artifact.contractId) {
      entries.push({ label: 'Mã hợp đồng', value: artifact.contractId });
    }

    if (artifact.inspectionId) {
      entries.push({ label: 'Biên bản kiểm tra', value: artifact.inspectionId });
    }

    if (artifact.renterSignatureId) {
      entries.push({ label: 'Chữ ký khách', value: artifact.renterSignatureId });
    }

    if (artifact.staffSignatureId) {
      entries.push({ label: 'Chữ ký nhân viên', value: artifact.staffSignatureId });
    }

    if (artifact.vehicleReceipt) {
      const { receivedAt, receivedByStaffId } = artifact.vehicleReceipt;
      if (receivedAt) {
        entries.push({
          label: 'Thời điểm bàn giao',
          value: this._formatDateTime(receivedAt),
        });
      }

      if (receivedByStaffId) {
        entries.push({ label: 'Nhân viên bàn giao', value: receivedByStaffId });
      }
    }

    return entries;
  }

  private _collectSummaryArtifacts(summary: BookingFulfillmentSummary): SummaryArtifacts {
    let artifacts: SummaryArtifacts = {};

    for (const step of this.steps()) {
      const stepArtifact = step.artifact;
      if (!stepArtifact) {
        continue;
      }

      if (stepArtifact.rentalId && !artifacts.rentalId) {
        artifacts = { ...artifacts, rentalId: stepArtifact.rentalId };
      }

      if (stepArtifact.contractId && !artifacts.contractId) {
        artifacts = { ...artifacts, contractId: stepArtifact.contractId };
      }

      if (stepArtifact.inspectionId && !artifacts.inspectionId) {
        artifacts = { ...artifacts, inspectionId: stepArtifact.inspectionId };
      }

      if (stepArtifact.renterSignatureId && !artifacts.renterSignatureId) {
        artifacts = { ...artifacts, renterSignatureId: stepArtifact.renterSignatureId };
      }

      if (stepArtifact.staffSignatureId && !artifacts.staffSignatureId) {
        artifacts = { ...artifacts, staffSignatureId: stepArtifact.staffSignatureId };
      }

      if (stepArtifact.vehicleReceipt) {
        const currentReceipt = artifacts.vehicleReceipt ?? {};
        artifacts = {
          ...artifacts,
          vehicleReceipt: {
            receivedAt: stepArtifact.vehicleReceipt.receivedAt ?? currentReceipt.receivedAt,
            receivedByStaffId:
              stepArtifact.vehicleReceipt.receivedByStaffId ?? currentReceipt.receivedByStaffId,
          },
        };
      }
    }

    if (!artifacts.rentalId && summary.rental?.rentalId) {
      artifacts = { ...artifacts, rentalId: summary.rental.rentalId };
    }

    return artifacts;
  }

  private _buildSummaryView(
    summary: BookingFulfillmentSummary,
    artifacts: SummaryArtifacts,
  ): SummaryViewModel {
    const booking = summary.booking;
    const renter = summary.renterProfile;
    const vehicle = summary.vehicleDetails;
    const rentalId = this._safeString(artifacts.rentalId ?? summary.rental?.rentalId);
    const contractId = this._safeString(artifacts.contractId);
    const inspectionId = this._safeString(artifacts.inspectionId);
    const renterSignatureId = this._safeString(artifacts.renterSignatureId);
    const staffSignatureId = this._safeString(artifacts.staffSignatureId);
    const vehicleReceipt = artifacts.vehicleReceipt;

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
      rentalId,
      contractId,
      inspectionId,
      renterSignatureId,
      staffSignatureId,
      vehicleReceipt:
        vehicleReceipt && (vehicleReceipt.receivedAt || vehicleReceipt.receivedByStaffId)
          ? {
              receivedAtDisplay: this._formatDateTime(vehicleReceipt.receivedAt),
              receivedByStaffId: this._safeString(vehicleReceipt.receivedByStaffId),
            }
          : undefined,
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

  private _defaultDateTimeInput(): string {
    return this._formatDateInput(new Date().toISOString());
  }

  private _formatDateInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return '';
    }

    const date = new Date(timestamp);
    const pad = (input: number): string => input.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private _toIsoString(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return null;
    }

    return new Date(timestamp).toISOString();
  }

  private _safeString(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
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
