import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ApiResponse,
  BookingService,
  BookingStatus as BookingStatusEnum,
  BookingVerificationStatus as BookingVerificationStatusEnum,
  CheckinBookingRequest,
  ContractDto,
  ContractStatus,
  CreateContractRequest,
  CreateRentalRequest,
  EsignProvider,
  GuidApiResponse,
  PartyRole,
  ReceiveInspectionRequest,
  ReceiveVehicleRequest,
  RentalService,
  SignContractRequest,
  SignatureEvent,
  SignatureType,
} from '../../../contract';
import { BookingsService } from '../bookings/bookings.service';
import { UserService } from '../user/user.service';
import {
  BookingFulfillmentSummary,
  FulfillmentArtifact,
  FulfillmentError,
  FulfillmentStepId,
  FulfillmentStepState,
  FulfillmentTimelineEvent,
} from './fulfillment.types';
import { FulfillmentAnalyticsService } from './fulfillment.analytics';
import { FulfillmentStateStore } from './fulfillment.state';
import { catchError, finalize, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

export interface InspectionPayload {
  readonly currentBatteryCapacityKwh: number;
  readonly inspectedAt: string;
  readonly evidenceUrl?: string | null;
}

export interface SignaturePayload {
  readonly role: 'renter' | 'staff';
  readonly signedAt: string;
  readonly documentUrl?: string | null;
  readonly documentHash?: string | null;
  readonly signatureType?: SignatureType;
  readonly eSignPayload?: SignContractRequest['eSignPayload'];
}

export interface VehicleReceivePayload {
  readonly receivedAt: string;
}

@Injectable({ providedIn: 'root' })
export class FulfillmentOrchestrator {
  private readonly _bookingService = inject(BookingService);
  private readonly _rentalService = inject(RentalService);
  private readonly _bookingsService = inject(BookingsService);
  private readonly _userService = inject(UserService);
  private readonly _state = inject(FulfillmentStateStore);
  private readonly _analytics = inject(FulfillmentAnalyticsService);

  private _bookingId: string | undefined;

  readonly summary = this._state.summary;
  readonly steps = this._state.steps;
  readonly snapshot = this._state.snapshot;
  readonly completionPercentage = this._state.completionPercentage;
  readonly isBusy = this._state.isBusy;
  readonly nextStep = this._state.nextStep;

  initialize(bookingId: string): Observable<void> {
    const normalizedId = this._normalizeString(bookingId);
    if (!normalizedId) {
      return throwError(() => new Error('Booking identifier is required.'));
    }

    this._bookingId = normalizedId;
    this._state.reset();
    this._state.setBusy(true);

    return this._bookingsService.loadBookingFulfillmentSummary(normalizedId).pipe(
      tap((summary) => {
        this._applySummary(summary);
      }),
      finalize(() => {
        this._state.setBusy(false);
      }),
      map(() => void 0),
      catchError((error) => {
        this._state.setSummary(undefined);
        return throwError(() => error);
      }),
    );
  }

  refresh(): Observable<void> {
    const bookingId = this._requireBookingId();
    return this._bookingsService.loadBookingFulfillmentSummary(bookingId).pipe(
      tap((summary) => {
        this._applySummary(summary);
      }),
      map(() => void 0),
      catchError((error) => {
        console.warn('Không thể cập nhật trạng thái fulfillment', error);
        return of(void 0);
      }),
    );
  }

  checkInBooking(): Observable<void> {
    const bookingId = this._requireBookingId();
    const startedAt = this._now();
    const staffId = this._resolveStaffId();

    this._state.setBusy(true);
    this._state.markStepInProgress('checkin');

    const request: CheckinBookingRequest = {
      bookingId,
      verifiedByStaffId: staffId,
      bookingVerificationStatus: BookingVerificationStatusEnum.Approved,
    };

    return this._bookingService.apiBookingCheckinPost(request).pipe(
      tap(() => {
        const completedAt = new Date().toISOString();
        this._state.markStepFulfilled('checkin', undefined, completedAt);
        this._state.appendTimeline({
          step: 'checkin',
          title: 'Đặt xe đã được duyệt',
          description: 'Nhân viên đã xác nhận đặt xe.',
          actor: 'staff',
          occurredAt: completedAt,
          metadata: this._buildMetadata({ staffId }),
        });
        this._state.mergeSummary({
          bookingId,
          verificationStatus: BookingVerificationStatusEnum.Approved,
        });
        this._analytics.stepCompleted(bookingId, 'checkin', this._elapsed(startedAt));
      }),
      switchMap(() => this.refresh()),
      catchError((error) => this._handleStepError('checkin', error, startedAt)),
      finalize(() => {
        this._state.setBusy(false);
      }),
    );
  }

  createRental(): Observable<void> {
    const bookingId = this._requireBookingId();
    const startedAt = this._now();
    const booking = this._state.summary()?.booking;

    this._state.setBusy(true);
    this._state.markStepInProgress('create-rental');

    const request: CreateRentalRequest = {
      bookingId,
      startTime: this._normalizeString(booking?.startTime),
      endTime: this._normalizeString(booking?.endTime),
    };

    return this._rentalService.apiRentalPost(request).pipe(
      tap((response: GuidApiResponse) => {
        const rentalId = this._normalizeString(response.data);
        const artifact: FulfillmentArtifact | undefined = rentalId ? { rentalId } : undefined;
        const completedAt = new Date().toISOString();
        this._state.markStepFulfilled('create-rental', artifact, completedAt);
        if (rentalId) {
          this._state.appendTimeline({
            step: 'create-rental',
            title: 'Đơn thuê đã được tạo',
            description: 'Đơn thuê được khởi tạo sau khi phê duyệt đặt xe.',
            actor: 'staff',
            occurredAt: completedAt,
            metadata: this._buildMetadata({ rentalId }),
          });
        }
        this._analytics.stepCompleted(bookingId, 'create-rental', this._elapsed(startedAt));
      }),
      switchMap(() => this.refresh()),
      catchError((error) => this._handleStepError('create-rental', error, startedAt)),
      finalize(() => {
        this._state.setBusy(false);
      }),
    );
  }

  createContract(provider: EsignProvider): Observable<void> {
    const bookingId = this._requireBookingId();
    const rentalId = this._requireRentalId();
    const startedAt = this._now();

    this._state.setBusy(true);
    this._state.markStepInProgress('create-contract');

    const request: CreateContractRequest = {
      rentalId,
      provider,
    };

    return this._rentalService.apiRentalContractPost(request).pipe(
      tap((response: GuidApiResponse) => {
        const contractId = this._normalizeString(response.data);
        const artifact: FulfillmentArtifact | undefined = contractId ? { contractId } : undefined;
        const completedAt = new Date().toISOString();
        this._state.markStepFulfilled('create-contract', artifact, completedAt);
        if (contractId) {
          this._state.appendTimeline({
            step: 'create-contract',
            title: 'Hợp đồng đã được phát hành',
            description: 'Hợp đồng điện tử gắn với đơn thuê đã sẵn sàng.',
            actor: 'staff',
            occurredAt: completedAt,
            metadata: this._buildMetadata({ contractId }),
          });
        }
        this._analytics.stepCompleted(bookingId, 'create-contract', this._elapsed(startedAt));
      }),
      switchMap(() => this.refresh()),
      catchError((error) => this._handleStepError('create-contract', error, startedAt)),
      finalize(() => {
        this._state.setBusy(false);
      }),
    );
  }

  submitInspection(payload: InspectionPayload): Observable<void> {
    const bookingId = this._requireBookingId();
    const rentalId = this._requireRentalId();
    const staffId = this._resolveStaffId();
    const startedAt = this._now();

    this._state.setBusy(true);
    this._state.markStepInProgress('inspection');

    const request: ReceiveInspectionRequest = {
      rentalId,
      currentBatteryCapacityKwh: payload.currentBatteryCapacityKwh,
      inspectedAt: payload.inspectedAt,
      inspectorStaffId: staffId,
      url: payload.evidenceUrl ?? null,
    };

    return this._rentalService.apiRentalInspectionPost(request).pipe(
      tap((response: GuidApiResponse) => {
        const inspectionId = this._normalizeString(response.data);
        const artifact: FulfillmentArtifact | undefined = inspectionId
          ? { inspectionId }
          : undefined;
        const completedAt = payload.inspectedAt ?? new Date().toISOString();
        this._state.markStepFulfilled('inspection', artifact, completedAt);
        if (inspectionId) {
          this._state.appendTimeline({
            step: 'inspection',
            title: 'Kiểm tra xe đã hoàn tất',
            description: 'Biên bản giao nhận trước khi bàn giao xe đã được lưu.',
            actor: 'staff',
            occurredAt: completedAt,
            metadata: this._buildMetadata({ inspectionId, staffId }),
          });
        }
        this._analytics.stepCompleted(bookingId, 'inspection', this._elapsed(startedAt));
      }),
      switchMap(() => this.refresh()),
      catchError((error) => this._handleStepError('inspection', error, startedAt)),
      finalize(() => {
        this._state.setBusy(false);
      }),
    );
  }

  signContract(payload: SignaturePayload): Observable<void> {
    const bookingId = this._requireBookingId();
    const contractId = this._requireContractId();
    const startedAt = this._now();

    const stepId: FulfillmentStepId = payload.role === 'renter' ? 'sign-renter' : 'sign-staff';
    const actor: 'renter' | 'staff' = payload.role;

    this._state.setBusy(true);
    this._state.markStepInProgress(stepId);

    const request: SignContractRequest = {
      createSignaturePayloadDto: {
        contractId,
        documentUrl: payload.documentUrl ?? null,
        documentHash: payload.documentHash ?? null,
        role: payload.role === 'renter' ? PartyRole.Renter : PartyRole.Staff,
        signatureEvent: SignatureEvent.Pickup,
        type: payload.signatureType,
        signedAt: payload.signedAt,
      },
      eSignPayload: payload.eSignPayload,
    };

    return this._rentalService.apiRentalContractSignPost(request).pipe(
      tap((response: GuidApiResponse) => {
        const signatureId = this._normalizeString(response.data);
        const artifact: FulfillmentArtifact | undefined = signatureId
          ? payload.role === 'renter'
            ? { renterSignatureId: signatureId }
            : { staffSignatureId: signatureId }
          : undefined;
        const completedAt = payload.signedAt ?? new Date().toISOString();
        this._state.markStepFulfilled(stepId, artifact, completedAt);
        if (signatureId) {
          this._state.appendTimeline({
            step: stepId,
            title: actor === 'renter' ? 'Khách thuê đã ký hợp đồng' : 'Nhân viên đã ký hợp đồng',
            description:
              actor === 'renter'
                ? 'Chữ ký của khách thuê đã được ghi nhận.'
                : 'Nhân viên đã xác nhận chữ ký trên hợp đồng.',
            actor,
            occurredAt: completedAt,
            metadata: this._buildMetadata({ contractId, signatureId }),
          });
        }
        this._analytics.stepCompleted(bookingId, stepId, this._elapsed(startedAt));
      }),
      switchMap(() => this.refresh()),
      catchError((error) => this._handleStepError(stepId, error, startedAt)),
      finalize(() => {
        this._state.setBusy(false);
      }),
    );
  }

  confirmVehicleReceive(payload: VehicleReceivePayload): Observable<void> {
    const bookingId = this._requireBookingId();
    const rentalId = this._requireRentalId();
    const staffId = this._resolveStaffId();
    const startedAt = this._now();

    this._state.setBusy(true);
    this._state.markStepInProgress('vehicle-receive');

    const request: ReceiveVehicleRequest = {
      rentalId,
      receivedAt: payload.receivedAt,
      receivedByStaffId: staffId,
    };

    return this._rentalService.apiRentalVehicleReceivePost(request).pipe(
      tap(() => {
        const completedAt = payload.receivedAt ?? new Date().toISOString();
        const artifact: FulfillmentArtifact = {
          vehicleReceipt: {
            receivedAt: completedAt,
            receivedByStaffId: staffId ?? '',
          },
        };
        this._state.markStepFulfilled('vehicle-receive', artifact, completedAt);
        this._state.appendTimeline({
          step: 'vehicle-receive',
          title: 'Xe đã được bàn giao',
          description: 'Nhân viên xác nhận khách thuê đã nhận xe.',
          actor: 'staff',
          occurredAt: completedAt,
          metadata: this._buildMetadata({ rentalId, staffId }),
        });
        this._analytics.stepCompleted(bookingId, 'vehicle-receive', this._elapsed(startedAt));
      }),
      switchMap(() => this.refresh()),
      catchError((error) => this._handleStepError('vehicle-receive', error, startedAt)),
      finalize(() => {
        this._state.setBusy(false);
      }),
    );
  }

  private _applySummary(summary: BookingFulfillmentSummary | undefined): void {
    if (!summary) {
      this._state.setSummary(undefined);
      this._resetSteps();
      return;
    }

    this._state.setSummary(summary);
    this._resetSteps();

    const checkinEvent = this._findTimelineEvent(summary.timeline, 'checkin');
    if (
      summary.verificationStatus === BookingVerificationStatusEnum.Approved ||
      summary.status === BookingStatusEnum.Verified ||
      summary.status === BookingStatusEnum.RentalCreated ||
      !!checkinEvent
    ) {
      this._state.markStepFulfilled('checkin', undefined, checkinEvent?.occurredAt);
    }

    const rental = summary.rental;
    if (rental?.rentalId) {
      const rentalEvent = this._findTimelineEvent(summary.timeline, 'create-rental');
      const completedAt = rentalEvent?.occurredAt ?? rental.startTime ?? summary.booking?.startTime;
      this._state.markStepFulfilled('create-rental', { rentalId: rental.rentalId }, completedAt);
    }

    const latestContract = this._resolveLatestContract(summary);
    if (latestContract?.contractId) {
      const contractEvent = this._findTimelineEvent(summary.timeline, 'create-contract');
      const completedAt = contractEvent?.occurredAt ?? latestContract.issuedAt;
      this._state.markStepFulfilled(
        'create-contract',
        { contractId: latestContract.contractId },
        completedAt,
      );

      if (latestContract.status === ContractStatus.PartiallySigned) {
        this._state.markStepFulfilled('sign-renter', undefined, contractEvent?.occurredAt);
      }

      if (latestContract.status === ContractStatus.Signed) {
        this._state.markStepFulfilled('sign-renter', undefined, contractEvent?.occurredAt);
        this._state.markStepFulfilled('sign-staff', undefined, contractEvent?.occurredAt);
      }
    }

    const inspectionEvent = this._findTimelineEvent(summary.timeline, 'inspection');
    if (inspectionEvent) {
      const inspectionId = inspectionEvent.metadata?.['inspectionId'];
      const artifact: FulfillmentArtifact | undefined = inspectionId ? { inspectionId } : undefined;
      this._state.markStepFulfilled('inspection', artifact, inspectionEvent.occurredAt);
    }

    const renterSignEvent = this._findTimelineEvent(summary.timeline, 'sign-renter');
    if (renterSignEvent) {
      const signatureId = renterSignEvent.metadata?.['signatureId'];
      const artifact: FulfillmentArtifact | undefined = signatureId
        ? { renterSignatureId: signatureId }
        : undefined;
      this._state.markStepFulfilled('sign-renter', artifact, renterSignEvent.occurredAt);
    }

    const staffSignEvent = this._findTimelineEvent(summary.timeline, 'sign-staff');
    if (staffSignEvent) {
      const signatureId = staffSignEvent.metadata?.['signatureId'];
      const artifact: FulfillmentArtifact | undefined = signatureId
        ? { staffSignatureId: signatureId }
        : undefined;
      this._state.markStepFulfilled('sign-staff', artifact, staffSignEvent.occurredAt);
    }

    const vehicleReceiveEvent = this._findTimelineEvent(summary.timeline, 'vehicle-receive');
    if (vehicleReceiveEvent) {
      const staffId = vehicleReceiveEvent.metadata?.['staffId'] ?? '';
      const artifact: FulfillmentArtifact = {
        vehicleReceipt: {
          receivedAt: vehicleReceiveEvent.occurredAt,
          receivedByStaffId: staffId,
        },
      };
      this._state.markStepFulfilled('vehicle-receive', artifact, vehicleReceiveEvent.occurredAt);
    }
  }

  private _resetSteps(): void {
    const currentSteps = this._state.steps();
    for (const step of currentSteps) {
      this._state.clearStep(step.step);
    }
  }

  private _handleStepError(
    stepId: FulfillmentStepId,
    error: unknown,
    startedAt: number,
  ): Observable<never> {
    const bookingId = this._requireBookingId();
    const failure = this._toFulfillmentError(error);
    this._state.markStepError(stepId, failure);
    this._analytics.stepFailed(bookingId, stepId, failure.code, this._elapsed(startedAt));
    this._state.setBusy(false);
    return throwError(() => error);
  }

  private _resolveRentalId(): string | undefined {
    const step = this._getStep('create-rental');
    const fromStep = this._normalizeString(step?.artifact?.rentalId);
    if (fromStep) {
      return fromStep;
    }

    const summaryRental = this._state.summary()?.rental;
    return this._normalizeString(summaryRental?.rentalId);
  }

  private _requireRentalId(): string {
    const rentalId = this._resolveRentalId();
    if (!rentalId) {
      throw new Error('Rental ID is required. Hãy tạo đơn thuê trước.');
    }
    return rentalId;
  }

  private _resolveContractId(): string | undefined {
    const step = this._getStep('create-contract');
    const fromStep = this._normalizeString(step?.artifact?.contractId);
    if (fromStep) {
      return fromStep;
    }

    const latestContract = this._resolveLatestContract(this._state.summary());
    return this._normalizeString(latestContract?.contractId);
  }

  private _requireContractId(): string {
    const contractId = this._resolveContractId();
    if (!contractId) {
      throw new Error('Contract ID is required. Hãy tạo hợp đồng trước.');
    }
    return contractId;
  }

  private _resolveLatestContract(
    summary: BookingFulfillmentSummary | undefined,
  ): ContractDto | undefined {
    const contracts = summary?.rental?.contracts;
    if (!contracts || contracts.length === 0) {
      return undefined;
    }

    return [...contracts]
      .filter((contract): contract is ContractDto => !!contract?.contractId)
      .sort((first, second) => {
        const firstTime = Date.parse(first.issuedAt ?? '');
        const secondTime = Date.parse(second.issuedAt ?? '');
        return firstTime - secondTime;
      })
      .at(-1);
  }

  private _getStep(stepId: FulfillmentStepId): FulfillmentStepState | undefined {
    return this._state.steps().find((step) => step.step === stepId);
  }

  private _findTimelineEvent(
    timeline: readonly FulfillmentTimelineEvent[] | undefined,
    step: FulfillmentStepId,
  ): FulfillmentTimelineEvent | undefined {
    if (!timeline) {
      return undefined;
    }

    for (let index = timeline.length - 1; index >= 0; index -= 1) {
      const event = timeline[index];
      if (event?.step === step) {
        return event;
      }
    }
    return undefined;
  }

  private _buildMetadata(
    input: Record<string, string | undefined | null>,
  ): Readonly<Record<string, string>> | undefined {
    const metadata: Record<string, string> = {};

    for (const [key, value] of Object.entries(input)) {
      const normalized = this._normalizeString(value);
      if (normalized) {
        metadata[key] = normalized;
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  private _resolveStaffId(): string | undefined {
    const userId = this._normalizeString(this._userService.user?.id ?? undefined);
    if (userId) {
      return userId;
    }

    const summary = this._state.summary();
    return this._normalizeString(summary?.booking?.verifiedByStaffId);
  }

  private _requireBookingId(): string {
    const bookingId = this._bookingId;
    if (!bookingId) {
      throw new Error('Booking ID chưa được thiết lập. Gọi initialize() trước.');
    }
    return bookingId;
  }

  private _now(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }

  private _elapsed(start: number): number | undefined {
    const end = this._now();
    const duration = Math.max(0, end - start);
    if (!Number.isFinite(duration)) {
      return undefined;
    }
    return Math.round(duration);
  }

  private _normalizeString(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private _toFulfillmentError(error: unknown): FulfillmentError {
    if (error instanceof HttpErrorResponse) {
      const rawError = error.error as ApiResponse | string | undefined;
      const message = this._normalizeString(
        typeof rawError === 'string'
          ? rawError
          : ((rawError as ApiResponse | undefined)?.message ?? error.message),
      );
      const code = this._normalizeString(
        typeof rawError === 'object' && rawError !== null
          ? ((rawError as ApiResponse | undefined)?.data?.code ?? undefined)
          : undefined,
      );

      return {
        message: message ?? 'Không thể hoàn thành thao tác. Vui lòng thử lại.',
        code,
        detail: error,
      };
    }

    if (error instanceof Error && error.message) {
      return {
        message: error.message,
        detail: error,
      };
    }

    if (typeof error === 'string' && error.length > 0) {
      return {
        message: error,
        detail: error,
      };
    }

    return {
      message: 'Không thể hoàn thành thao tác. Vui lòng thử lại.',
      detail: error,
    };
  }
}
