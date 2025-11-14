import {
  BookingStatus as BookingStatusEnum,
  BookingVerificationStatus as BookingVerificationStatusEnum,
  EsignProvider as EsignProviderEnum,
} from '../../../../../../contract';
import type {
  BookingFulfillmentSummary,
  FulfillmentStepId,
  FulfillmentStepState,
  FulfillmentTimelineEvent,
} from '../../../../../core-logic/rental-fulfillment';
import {
  CONTRACT_PROVIDERS,
  STEP_CONFIG,
  SummaryArtifacts,
  SummaryViewModel,
  StepArtifactEntry,
  StepViewModel,
  TimelineViewModel,
} from './fulfillment-page.models';

interface StepViewInput {
  readonly steps: readonly FulfillmentStepState[];
  readonly nextStep?: FulfillmentStepState;
  readonly isBusy: boolean;
}

export class FulfillmentPagePresenter {
  readonly contractProviders = CONTRACT_PROVIDERS;

  private readonly stepConfig = STEP_CONFIG;
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

  collectSummaryArtifacts(
    steps: readonly FulfillmentStepState[],
    summary: BookingFulfillmentSummary,
  ): SummaryArtifacts {
    let artifacts: SummaryArtifacts = {};

    for (const step of steps) {
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

  buildSummaryView(
    summary: BookingFulfillmentSummary,
    artifacts: SummaryArtifacts,
  ): SummaryViewModel {
    const booking = summary.booking;
    const renter = summary.renterProfile;
    const vehicle = summary.vehicleDetails;

    const rentalId = this.safeString(artifacts.rentalId ?? summary.rental?.rentalId);
    const contractId = this.safeString(artifacts.contractId);
    const inspectionId = this.safeString(artifacts.inspectionId);
    const renterSignatureId = this.safeString(artifacts.renterSignatureId);
    const staffSignatureId = this.safeString(artifacts.staffSignatureId);
    const vehicleReceipt = artifacts.vehicleReceipt;

    return {
      bookingId: summary.bookingId,
      bookingStatusLabel: this.bookingStatusLabel(summary.status),
      verificationStatusLabel: this.verificationStatusLabel(summary.verificationStatus),
      renterName: renter?.userName?.trim() || 'Chưa có tên khách',
      renterLicense: renter?.driverLicenseNo?.trim() || 'Không có giấy phép',
      renterAddress: renter?.address?.trim() || 'Không có địa chỉ',
      vehicleLabel: this.vehicleLabel(vehicle),
      depositDisplay: this.formatCurrency(vehicle?.depositPrice),
      rentalWindowDisplay: this.formatDateRange(booking?.startTime, booking?.endTime),
      createdAtDisplay: this.formatDateTime(booking?.bookingCreatedAt),
      rentalId,
      contractId,
      inspectionId,
      renterSignatureId,
      staffSignatureId,
      vehicleReceipt:
        vehicleReceipt && (vehicleReceipt.receivedAt || vehicleReceipt.receivedByStaffId)
          ? {
              receivedAtDisplay: this.formatDateTime(vehicleReceipt.receivedAt),
              receivedByStaffId: this.safeString(vehicleReceipt.receivedByStaffId),
            }
          : undefined,
    } satisfies SummaryViewModel;
  }

  buildStepViewModels({ steps, nextStep, isBusy }: StepViewInput): StepViewModel[] {
    const stepMap = new Map(steps.map((state) => [state.step, state] as const));

    return steps.map((step) => this.toStepViewModel(step, nextStep, isBusy, stepMap));
  }

  canPerformStep(
    stepId: FulfillmentStepId,
    steps: readonly FulfillmentStepState[],
    isBusy: boolean,
  ): boolean {
    if (isBusy) {
      return false;
    }

    const stepMap = new Map(steps.map((state) => [state.step, state] as const));
    const step = stepMap.get(stepId);
    if (!step) {
      return false;
    }

    const config = this.stepConfig[stepId];
    if (!config || config.action.kind === 'none') {
      return false;
    }

    if (step.status === 'fulfilled' || step.status === 'in-progress') {
      return false;
    }

    return this.prerequisitesFulfilled(step, stepMap);
  }

  buildTimelineView(summary: BookingFulfillmentSummary | undefined): readonly TimelineViewModel[] {
    if (!summary?.timeline) {
      return [];
    }

    return summary.timeline.map((event, index) => this.toTimelineViewModel(event, index));
  }

  hasFailure(steps: readonly StepViewModel[]): boolean {
    return steps.some((step) => step.status === 'error' && !!step.errorMessage);
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

  defaultDateTimeInput(): string {
    return this.formatDateInput(new Date().toISOString());
  }

  formatDateInput(value: string | null | undefined): string {
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

  toIsoString(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return null;
    }

    return new Date(timestamp).toISOString();
  }

  resolveContractProvider(
    rawValue: string,
  ): (typeof EsignProviderEnum)[keyof typeof EsignProviderEnum] {
    const provider = CONTRACT_PROVIDERS.find((option) => option.value === rawValue)?.value;
    return provider ?? EsignProviderEnum.Native;
  }

  private formatCurrency(value?: number | null): string {
    if (value === undefined || value === null) {
      return '--';
    }
    return this.currencyFormatter.format(value);
  }

  private formatDateTime(value?: string | null): string {
    if (!value) {
      return '--';
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return '--';
    }

    return this.dateTimeFormatter.format(new Date(timestamp));
  }

  private formatDateRange(start?: string | null, end?: string | null): string {
    const startDisplay = this.formatDateTime(start);
    const endDisplay = this.formatDateTime(end);

    if (startDisplay === '--' && endDisplay === '--') {
      return '--';
    }

    return `${startDisplay} → ${endDisplay}`;
  }

  private toStepViewModel(
    step: FulfillmentStepState,
    next: FulfillmentStepState | undefined,
    isBusy: boolean,
    stepMap: ReadonlyMap<FulfillmentStepId, FulfillmentStepState>,
  ): StepViewModel {
    const config = this.stepConfig[step.step];
    const isCurrent = next?.step === step.step;
    const action = config?.action ?? { kind: 'none' };
    const prerequisitesMet = this.prerequisitesFulfilled(step, stepMap);
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
      completedAtDisplay: this.formatDateTime(step.completedAt),
      action,
      artifactEntries: this.artifactEntries(step),
    } satisfies StepViewModel;
  }

  private prerequisitesFulfilled(
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

  private artifactEntries(step: FulfillmentStepState): StepArtifactEntry[] {
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
          value: this.formatDateTime(receivedAt),
        });
      }

      if (receivedByStaffId) {
        entries.push({ label: 'Nhân viên bàn giao', value: receivedByStaffId });
      }
    }

    return entries;
  }

  private toTimelineViewModel(event: FulfillmentTimelineEvent, index: number): TimelineViewModel {
    return {
      key: `${event.step}-${index}`,
      title: event.title,
      description: event.description ?? undefined,
      actorLabel: this.actorLabel(event.actor),
      occurredAtDisplay: this.formatDateTime(event.occurredAt),
      metadataEntries: this.metadataEntries(event),
    } satisfies TimelineViewModel;
  }

  private actorLabel(actor: FulfillmentTimelineEvent['actor']): string {
    switch (actor) {
      case 'renter':
        return 'Khách thuê';
      case 'staff':
        return 'Nhân viên';
      default:
        return 'Hệ thống';
    }
  }

  private metadataEntries(event: FulfillmentTimelineEvent): readonly {
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

  private vehicleLabel(vehicle: BookingFulfillmentSummary['vehicleDetails']): string {
    if (!vehicle) {
      return 'Chưa có thông tin xe';
    }

    const { make, model, modelYear } = vehicle;
    const parts = [make?.trim(), model?.trim(), modelYear ? modelYear.toString() : undefined]
      .filter((part): part is string => !!part && part.length > 0)
      .join(' ');

    return parts.length > 0 ? parts : 'Chưa có thông tin xe';
  }

  private bookingStatusLabel(status: BookingFulfillmentSummary['status']): string {
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

  private verificationStatusLabel(status: BookingFulfillmentSummary['verificationStatus']): string {
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

  private safeString(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
