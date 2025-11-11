import { inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, finalize, map, switchMap, tap, throwError } from 'rxjs';
import {
  BookingService,
  BookingVerificationStatus,
  CheckinBookingRequest,
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

export type BookingWorkflowStep =
  | 'idle'
  | 'checkingIn'
  | 'creatingRental'
  | 'creatingContract'
  | 'recordingInspection'
  | 'signingContractRenter'
  | 'signingContractStaff'
  | 'receivingVehicle'
  | 'completed';

export interface SignatureESignPayload {
  readonly signerIp?: string;
  readonly userAgent?: string;
  readonly providerSignatureId?: string;
  readonly signatureImageUrl?: string;
  readonly certSubject?: string;
  readonly certIssuer?: string;
  readonly certSerial?: string;
  readonly certFingerprintSha256?: string;
  readonly signatureHash?: string;
  readonly evidenceUrl?: string;
}

export interface ContractSignaturePayload {
  readonly role: PartyRole;
  readonly signatureEvent: SignatureEvent;
  readonly type: SignatureType;
  readonly signedAt: string;
  readonly documentUrl?: string;
  readonly documentHash?: string;
  readonly eSignPayload?: SignatureESignPayload;
}

export interface BookingWorkflowPayload {
  readonly bookingId: string;
  readonly verificationStatus: BookingVerificationStatus;
  readonly verifiedByStaffId: string;
  readonly rental: {
    readonly startTime?: string;
    readonly endTime?: string;
  };
  readonly contract: {
    readonly provider: EsignProvider;
  };
  readonly inspection: {
    readonly currentBatteryCapacityKwh: number;
    readonly inspectedAt: string;
    readonly inspectorStaffId: string;
    readonly url?: string;
  };
  readonly signatures: readonly [ContractSignaturePayload, ContractSignaturePayload];
  readonly receive: {
    readonly receivedAt: string;
    readonly receivedByStaffId: string;
  };
}

export interface BookingWorkflowResult {
  readonly bookingId: string;
  readonly rentalId: string;
  readonly contractId: string;
  readonly inspectionId: string;
  readonly signatureIds: readonly [string, string];
}

@Injectable({ providedIn: 'root' })
export class BookingWorkflowService {
  private readonly _bookingService = inject(BookingService);
  private readonly _rentalService = inject(RentalService);

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _step = signal<BookingWorkflowStep>('idle');
  private readonly _result = signal<BookingWorkflowResult | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly step = this._step.asReadonly();
  readonly result = this._result.asReadonly();

  process(payload: BookingWorkflowPayload): Observable<BookingWorkflowResult> {
    this._loading.set(true);
    this._error.set(null);
    this._result.set(null);
    this._step.set('checkingIn');

    const checkinRequest: CheckinBookingRequest = {
      bookingId: payload.bookingId,
      verifiedByStaffId: payload.verifiedByStaffId,
      bookingVerificationStatus: payload.verificationStatus,
    };

    return this._bookingService.apiBookingCheckinPost(checkinRequest).pipe(
      switchMap(() => {
        this._step.set('creatingRental');
        const rentalRequest: CreateRentalRequest = {
          bookingId: payload.bookingId,
          startTime: payload.rental.startTime,
          endTime: payload.rental.endTime,
        };
        return this._rentalService.apiRentalPost(rentalRequest);
      }),
      map((rentalResponse: GuidApiResponse) => this._extractGuid(rentalResponse, 'rental')),
      switchMap((rentalId) => {
        this._step.set('creatingContract');
        const contractRequest: CreateContractRequest = {
          rentalId,
          provider: payload.contract.provider,
        };
        return this._rentalService.apiRentalContractPost(contractRequest).pipe(
          map((contractResponse: GuidApiResponse) => ({
            rentalId,
            contractId: this._extractGuid(contractResponse, 'contract'),
          })),
        );
      }),
      switchMap(({ rentalId, contractId }) => {
        this._step.set('recordingInspection');
        const inspectionRequest: ReceiveInspectionRequest = {
          rentalId,
          currentBatteryCapacityKwh: payload.inspection.currentBatteryCapacityKwh,
          inspectedAt: payload.inspection.inspectedAt,
          inspectorStaffId: payload.inspection.inspectorStaffId,
          url: payload.inspection.url ?? null,
        };
        return this._rentalService.apiRentalInspectionPost(inspectionRequest).pipe(
          map((inspectionResponse: GuidApiResponse) => ({
            rentalId,
            contractId,
            inspectionId: this._extractGuid(inspectionResponse, 'inspection'),
          })),
        );
      }),
      switchMap(({ rentalId, contractId, inspectionId }) => {
        this._step.set('signingContractRenter');
        const [renterSignature, staffSignature] = payload.signatures;
        return this._signContract(contractId, renterSignature).pipe(
          switchMap((firstSignatureId) => {
            this._step.set('signingContractStaff');
            return this._signContract(contractId, staffSignature).pipe(
              map((secondSignatureId) => ({
                rentalId,
                contractId,
                inspectionId,
                signatureIds: [firstSignatureId, secondSignatureId] as const,
              })),
            );
          }),
        );
      }),
      switchMap(({ rentalId, contractId, inspectionId, signatureIds }) => {
        this._step.set('receivingVehicle');
        const receiveRequest: ReceiveVehicleRequest = {
          rentalId,
          receivedAt: payload.receive.receivedAt,
          receivedByStaffId: payload.receive.receivedByStaffId,
        };
        return (
          this._rentalService.apiRentalVehicleReceivePost(receiveRequest) as Observable<unknown>
        ).pipe(
          map(() => ({
            bookingId: payload.bookingId,
            rentalId,
            contractId,
            inspectionId,
            signatureIds,
          })),
        );
      }),
      tap((result) => {
        this._result.set(result);
        this._step.set('completed');
      }),
      catchError((error: unknown) => {
        this._error.set(this._resolveErrorMessage(error));
        return throwError(() => error);
      }),
      finalize(() => {
        this._loading.set(false);
        if (this._step() !== 'completed') {
          this._step.set('idle');
        }
      }),
    );
  }

  private _signContract(contractId: string, payload: ContractSignaturePayload): Observable<string> {
    const request: SignContractRequest = {
      createSignaturePayloadDto: {
        contractId,
        documentUrl: payload.documentUrl ?? null,
        documentHash: payload.documentHash ?? null,
        role: payload.role,
        signatureEvent: payload.signatureEvent,
        type: payload.type,
        signedAt: payload.signedAt,
      },
      eSignPayload: payload.eSignPayload,
    };

    return this._rentalService
      .apiRentalContractSignPost(request)
      .pipe(map((response: GuidApiResponse) => this._extractGuid(response, 'signature')));
  }

  private _extractGuid(response: GuidApiResponse, label: string): string {
    const value = response.data?.trim();
    if (!value) {
      throw new Error(`Missing ${label} identifier in response.`);
    }
    return value;
  }

  private _resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string' && error.length > 0) {
      return error;
    }

    return 'Unable to complete booking workflow. Please try again.';
  }
}
