import { inject, Injectable, signal } from '@angular/core';
import {
  BookingService,
  BookingVerificationStatus,
  CheckinBookingRequest,
  CreateContractRequest,
  CreateRentalRequest,
  EsignProvider,
  ESignPayloadDto,
  GuidApiResponse,
  PartyRole,
  ReceiveInspectionRequest,
  ReceiveVehicleRequest,
  RentalService,
  SignatureEvent,
  SignatureType,
  SignContractRequest,
} from '../../../contract';
import { catchError, concatMap, defer, finalize, map, Observable, throwError } from 'rxjs';

export type BookingWorkflowStepKey =
  | 'checkin'
  | 'createRental'
  | 'createContract'
  | 'inspection'
  | 'signRenter'
  | 'signStaff'
  | 'vehicleReceive';

export type BookingWorkflowStepStatus = 'idle' | 'running' | 'success' | 'error';

interface BookingWorkflowStepDefinition {
  readonly key: BookingWorkflowStepKey;
  readonly label: string;
}

export interface BookingWorkflowStepState extends BookingWorkflowStepDefinition {
  readonly status: BookingWorkflowStepStatus;
  readonly message?: string;
}

export interface BookingWorkflowPayload {
  readonly bookingId: string;
  readonly staffId?: string;
  readonly rentalStart?: string;
  readonly rentalEnd?: string;
  readonly inspection: {
    readonly currentBatteryCapacityKwh: number;
    readonly inspectedAt: string;
    readonly url?: string;
  };
  readonly renterSignature: SignatureInput;
  readonly staffSignature: SignatureInput;
  readonly vehicleReceive: {
    readonly receivedAt: string;
  };
}

export interface SignatureInput {
  readonly documentUrl: string;
  readonly documentHash: string;
  readonly signatureType: SignatureType;
  readonly signedAt: string;
  readonly signerIp?: string;
  readonly userAgent?: string;
  readonly signatureImageUrl?: string;
  readonly providerSignatureId?: string;
  readonly signatureHash?: string;
  readonly evidenceUrl?: string;
}

export interface BookingWorkflowSummary {
  readonly bookingId: string;
  readonly rentalId: string;
  readonly contractId: string;
  readonly inspectionId: string;
  readonly renterSignatureId: string;
  readonly staffSignatureId: string;
}

interface StepExecutionResult {
  readonly message?: string;
}

interface WorkflowContext {
  readonly payload: BookingWorkflowPayload;
  rentalId?: string;
  contractId?: string;
  inspectionId?: string;
  renterSignatureId?: string;
  staffSignatureId?: string;
}

const STEP_DEFINITIONS: readonly BookingWorkflowStepDefinition[] = [
  { key: 'checkin', label: 'Booking check-in' },
  { key: 'createRental', label: 'Create rental' },
  { key: 'createContract', label: 'Create rental contract' },
  { key: 'inspection', label: 'Record vehicle inspection' },
  { key: 'signRenter', label: 'Capture renter signature' },
  { key: 'signStaff', label: 'Capture staff signature' },
  { key: 'vehicleReceive', label: 'Confirm vehicle receipt' },
];

@Injectable({ providedIn: 'root' })
export class BookingWorkflowService {
  private readonly bookingService = inject(BookingService);
  private readonly rentalService = inject(RentalService);

  private readonly _steps = signal<BookingWorkflowStepState[]>(this._createInitialStates());
  private readonly _running = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _result = signal<BookingWorkflowSummary | null>(null);

  readonly steps = this._steps.asReadonly();
  readonly running = this._running.asReadonly();
  readonly error = this._error.asReadonly();
  readonly result = this._result.asReadonly();

  reset(): void {
    this._steps.set(this._createInitialStates());
    this._running.set(false);
    this._error.set(null);
    this._result.set(null);
  }

  executeWorkflow(payload: BookingWorkflowPayload): Observable<BookingWorkflowSummary> {
    return defer(() => {
      this._running.set(true);
      this._error.set(null);
      this._result.set(null);
      this._steps.set(this._createInitialStates());

      const context: WorkflowContext = { payload };

      return this._runSteps(context).pipe(
        map((summary) => {
          this._result.set(summary);
          return summary;
        }),
        catchError((error: unknown) => {
          const message = this._resolveErrorMessage(error);
          this._error.set(message);
          return throwError(() => error);
        }),
        finalize(() => {
          this._running.set(false);
        }),
      );
    });
  }

  private _runSteps(context: WorkflowContext): Observable<BookingWorkflowSummary> {
    return this._executeStep('checkin', () => this._checkinBooking(context)).pipe(
      concatMap(() => this._executeStep('createRental', () => this._createRental(context))),
      concatMap(() => this._executeStep('createContract', () => this._createContract(context))),
      concatMap(() => this._executeStep('inspection', () => this._recordInspection(context))),
      concatMap(() =>
        this._executeStep('signRenter', () => this._signContract(context, PartyRole.Renter)),
      ),
      concatMap(() =>
        this._executeStep('signStaff', () => this._signContract(context, PartyRole.Staff)),
      ),
      concatMap(() => this._executeStep('vehicleReceive', () => this._receiveVehicle(context))),
      map(
        () =>
          ({
            bookingId: context.payload.bookingId,
            rentalId: context.rentalId ?? '',
            contractId: context.contractId ?? '',
            inspectionId: context.inspectionId ?? '',
            renterSignatureId: context.renterSignatureId ?? '',
            staffSignatureId: context.staffSignatureId ?? '',
          }) satisfies BookingWorkflowSummary,
      ),
    );
  }

  private _checkinBooking(context: WorkflowContext): Observable<StepExecutionResult> {
    const request: CheckinBookingRequest = {
      bookingId: context.payload.bookingId,
      bookingVerificationStatus: BookingVerificationStatus.Approved,
      verifiedByStaffId: context.payload.staffId,
    };

    return this.bookingService
      .apiBookingCheckinPost(request)
      .pipe(map(() => ({ message: 'Booking verification approved.' })));
  }

  private _createRental(context: WorkflowContext): Observable<StepExecutionResult> {
    const request: CreateRentalRequest = {
      bookingId: context.payload.bookingId,
      startTime: context.payload.rentalStart,
      endTime: context.payload.rentalEnd,
    };

    return this.rentalService.apiRentalPost(request).pipe(
      map((response: GuidApiResponse) => {
        const rentalId = response.data;
        if (!rentalId) {
          throw new Error('Rental ID was not returned by the API.');
        }

        context.rentalId = rentalId;
        return { message: `Rental ${rentalId} created.` } satisfies StepExecutionResult;
      }),
    );
  }

  private _createContract(context: WorkflowContext): Observable<StepExecutionResult> {
    if (!context.rentalId) {
      return throwError(() => new Error('Rental ID is required before creating a contract.'));
    }

    const request: CreateContractRequest = {
      rentalId: context.rentalId,
      provider: EsignProvider.Native,
    };

    return this.rentalService.apiRentalContractPost(request).pipe(
      map((response: GuidApiResponse) => {
        const contractId = response.data;
        if (!contractId) {
          throw new Error('Contract ID was not returned by the API.');
        }

        context.contractId = contractId;
        return { message: `Contract ${contractId} generated.` } satisfies StepExecutionResult;
      }),
    );
  }

  private _recordInspection(context: WorkflowContext): Observable<StepExecutionResult> {
    if (!context.rentalId) {
      return throwError(() => new Error('Rental ID is required before recording inspection.'));
    }

    const inspection = context.payload.inspection;
    const request: ReceiveInspectionRequest = {
      rentalId: context.rentalId,
      currentBatteryCapacityKwh: inspection.currentBatteryCapacityKwh,
      inspectedAt: inspection.inspectedAt,
      inspectorStaffId: context.payload.staffId,
      url: inspection.url,
    };

    return this.rentalService.apiRentalInspectionPost(request).pipe(
      map((response: GuidApiResponse) => {
        const inspectionId = response.data ?? '';
        context.inspectionId = inspectionId;
        return {
          message: inspectionId ? `Inspection ${inspectionId} recorded.` : 'Inspection recorded.',
        } satisfies StepExecutionResult;
      }),
    );
  }

  private _signContract(
    context: WorkflowContext,
    role: (typeof PartyRole)[keyof typeof PartyRole],
  ): Observable<StepExecutionResult> {
    if (!context.contractId) {
      return throwError(() => new Error('Contract ID is required before capturing signatures.'));
    }

    const signatureInput =
      role === PartyRole.Renter ? context.payload.renterSignature : context.payload.staffSignature;
    const request = this._buildSignContractRequest(context.contractId, role, signatureInput);

    return this.rentalService.apiRentalContractSignPost(request).pipe(
      map((response: GuidApiResponse) => {
        const signatureId = response.data ?? '';
        if (role === PartyRole.Renter) {
          context.renterSignatureId = signatureId;
        } else if (role === PartyRole.Staff) {
          context.staffSignatureId = signatureId;
        }

        const label = role === PartyRole.Renter ? 'Renter' : 'Staff';
        return {
          message: signatureId
            ? `${label} signature ${signatureId} captured.`
            : `${label} signature captured.`,
        } satisfies StepExecutionResult;
      }),
    );
  }

  private _buildSignContractRequest(
    contractId: string,
    role: (typeof PartyRole)[keyof typeof PartyRole],
    signature: SignatureInput,
  ): SignContractRequest {
    const sanitizedSignatureImageUrl = this._sanitizeOptional(signature.signatureImageUrl);
    const sanitizedSignerIp = this._sanitizeOptional(signature.signerIp);
    const sanitizedUserAgent = this._sanitizeOptional(signature.userAgent);
    const sanitizedProviderSignatureId = this._sanitizeOptional(signature.providerSignatureId);
    const sanitizedSignatureHash = this._sanitizeOptional(signature.signatureHash);
    const sanitizedEvidenceUrl = this._sanitizeOptional(signature.evidenceUrl);

    const eSignPayload: ESignPayloadDto | undefined =
      sanitizedSignerIp ||
      sanitizedUserAgent ||
      sanitizedSignatureImageUrl ||
      sanitizedProviderSignatureId ||
      sanitizedSignatureHash ||
      sanitizedEvidenceUrl
        ? {
            signerIp: sanitizedSignerIp ?? undefined,
            userAgent: sanitizedUserAgent ?? undefined,
            signatureImageUrl: sanitizedSignatureImageUrl ?? undefined,
            providerSignatureId: sanitizedProviderSignatureId ?? undefined,
            signatureHash: sanitizedSignatureHash ?? undefined,
            evidenceUrl: sanitizedEvidenceUrl ?? undefined,
          }
        : undefined;

    return {
      createSignaturePayloadDto: {
        contractId,
        documentUrl: signature.documentUrl,
        documentHash: signature.documentHash,
        role,
        signatureEvent: SignatureEvent.Pickup,
        type: signature.signatureType,
        signedAt: signature.signedAt,
      },
      eSignPayload,
    } satisfies SignContractRequest;
  }

  private _receiveVehicle(context: WorkflowContext): Observable<StepExecutionResult> {
    if (!context.rentalId) {
      return throwError(
        () => new Error('Rental ID is required before confirming vehicle receipt.'),
      );
    }

    const request: ReceiveVehicleRequest = {
      rentalId: context.rentalId,
      receivedAt: context.payload.vehicleReceive.receivedAt,
      receivedByStaffId: context.payload.staffId,
    };

    return this.rentalService
      .apiRentalVehicleReceivePost(request)
      .pipe(map(() => ({ message: 'Vehicle marked as received.' }) satisfies StepExecutionResult));
  }

  private _executeStep(
    key: BookingWorkflowStepKey,
    runner: () => Observable<StepExecutionResult>,
  ): Observable<StepExecutionResult> {
    this._updateStepState(key, { status: 'running', message: undefined });

    return runner().pipe(
      map((result) => {
        this._updateStepState(key, { status: 'success', message: result.message });
        return result;
      }),
      catchError((error: unknown) => {
        const message = this._resolveErrorMessage(error);
        this._updateStepState(key, { status: 'error', message });
        return throwError(() => error);
      }),
    );
  }

  private _updateStepState(
    key: BookingWorkflowStepKey,
    changes: Partial<Omit<BookingWorkflowStepState, 'key' | 'label'>>,
  ): void {
    this._steps.update((steps) =>
      steps.map((step) => (step.key === key ? { ...step, ...changes } : step)),
    );
  }

  private _createInitialStates(): BookingWorkflowStepState[] {
    return STEP_DEFINITIONS.map(
      (definition) => ({ ...definition, status: 'idle' }) satisfies BookingWorkflowStepState,
    );
  }

  private _sanitizeOptional(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private _resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'An unexpected error occurred while processing the booking workflow.';
  }
}
