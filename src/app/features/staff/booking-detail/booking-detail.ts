import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';
import {
  BookingVerificationStatus as BookingVerificationStatusEnum,
  EsignProvider,
  PartyRole,
  SignatureEvent,
  SignatureType,
} from '../../../../contract';
import { BookingsService, StaffBookingRecord } from '../../../core-logic/bookings/bookings.service';
import {
  BookingWorkflowPayload,
  BookingWorkflowService,
  BookingWorkflowStep,
  ContractSignaturePayload,
} from '../../../core-logic/bookings/booking-workflow.service';
import { ToastService } from '../../../lib/common-ui/services/toast/toast.service';

interface BookingWorkflowFormValue {
  readonly booking: {
    readonly verifiedByStaffId: string;
    readonly verificationStatus: BookingVerificationStatusEnum;
  };
  readonly rental: {
    readonly startTime: string;
    readonly endTime: string;
  };
  readonly contract: {
    readonly provider: EsignProvider;
  };
  readonly inspection: {
    readonly currentBatteryCapacityKwh: number;
    readonly inspectedAt: string;
    readonly inspectorStaffId: string;
    readonly url: string;
  };
  readonly renterSignature: SignatureFormValue;
  readonly staffSignature: SignatureFormValue;
  readonly receive: {
    readonly receivedAt: string;
    readonly receivedByStaffId: string;
  };
}

interface SignatureFormValue {
  readonly documentUrl: string;
  readonly documentHash: string;
  readonly signatureEvent: SignatureEvent;
  readonly type: SignatureType;
  readonly signedAt: string;
  readonly role: PartyRole;
}

const STEP_LABELS: Record<BookingWorkflowStep, string> = {
  idle: 'Ready',
  checkingIn: 'Checking in booking',
  creatingRental: 'Creating rental',
  creatingContract: 'Creating contract',
  recordingInspection: 'Recording inspection',
  signingContractRenter: 'Collecting renter signature',
  signingContractStaff: 'Collecting staff signature',
  receivingVehicle: 'Receiving vehicle',
  completed: 'Workflow completed',
};

@Component({
  selector: 'app-staff-booking-detail',
  templateUrl: './booking-detail.html',
  styleUrl: './booking-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
})
export class StaffBookingDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingsService = inject(BookingsService);
  private readonly workflowService = inject(BookingWorkflowService);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly BookingVerificationStatusEnum = BookingVerificationStatusEnum;
  readonly EsignProvider = EsignProvider;
  readonly SignatureEvent = SignatureEvent;
  readonly SignatureType = SignatureType;

  readonly bookingId = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  } as const);

  readonly bookingIdValue = computed(() => this._currentBookingId());

  readonly form = this.formBuilder.group({
    booking: this.formBuilder.group({
      verifiedByStaffId: this.formBuilder.control('', {
        validators: [Validators.required],
      }),
      verificationStatus: this.formBuilder.control<BookingVerificationStatusEnum>(
        BookingVerificationStatusEnum.Approved,
        { validators: [Validators.required] },
      ),
    }),
    rental: this.formBuilder.group({
      startTime: this.formBuilder.control('', { validators: [Validators.required] }),
      endTime: this.formBuilder.control('', { validators: [Validators.required] }),
    }),
    contract: this.formBuilder.group({
      provider: this.formBuilder.control<EsignProvider>(EsignProvider.Native, {
        validators: [Validators.required],
      }),
    }),
    inspection: this.formBuilder.group({
      currentBatteryCapacityKwh: this.formBuilder.control(60, {
        validators: [Validators.required, Validators.min(0)],
      }),
      inspectedAt: this.formBuilder.control(this._formatLocalDateTime(new Date().toISOString()), {
        validators: [Validators.required],
      }),
      inspectorStaffId: this.formBuilder.control('', {
        validators: [Validators.required],
      }),
      url: this.formBuilder.control('', []),
    }),
    renterSignature: this._createSignatureGroup(),
    staffSignature: this._createSignatureGroup(PartyRole.Staff),
    receive: this.formBuilder.group({
      receivedAt: this.formBuilder.control(this._formatLocalDateTime(new Date().toISOString()), {
        validators: [Validators.required],
      }),
      receivedByStaffId: this.formBuilder.control('', {
        validators: [Validators.required],
      }),
    }),
  });

  readonly booking = computed<StaffBookingRecord | null>(() => {
    const id = this._currentBookingId();
    if (!id) {
      return null;
    }
    return this.bookingsService.staffBookings().find((record) => record.bookingId === id) ?? null;
  });

  readonly workflowStepLabel = computed(() => STEP_LABELS[this.workflowService.step()]);

  readonly hasMissingBooking = computed(() => {
    const currentId = this._currentBookingId();
    return Boolean(currentId && !this.booking());
  });

  readonly processingState = computed(() => this.workflowService.loading());
  readonly errorState = computed(() => this.workflowService.error());
  readonly resultState = computed(() => this.workflowService.result());

  constructor() {
    if (this.bookingsService.staffBookings().length === 0) {
      this.bookingsService.loadStaffBookings().pipe(take(1)).subscribe();
    }

    effect(() => {
      const record = this.booking();
      if (record) {
        this._prefillForm(record);
      }
    });
  }

  submitWorkflow(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const bookingId = this._currentBookingId();
    if (!bookingId) {
      return;
    }

    const payload = this._buildPayload(bookingId);

    this.workflowService
      .process(payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.toastService.success('Booking workflow completed successfully.');
        },
        error: (error) => {
          console.error('Booking workflow failed', error);
          const message = this.workflowService.error() ?? 'Unable to complete booking workflow.';
          this.toastService.error(message);
        },
      });
  }

  private _createSignatureGroup(defaultRole: PartyRole = PartyRole.Renter) {
    return this.formBuilder.group({
      documentUrl: this.formBuilder.control('', []),
      documentHash: this.formBuilder.control('', []),
      signatureEvent: this.formBuilder.control<SignatureEvent>(SignatureEvent.Pickup, {
        validators: [Validators.required],
      }),
      type: this.formBuilder.control<SignatureType>(SignatureType.Drawn, {
        validators: [Validators.required],
      }),
      signedAt: this.formBuilder.control(this._formatLocalDateTime(new Date().toISOString()), {
        validators: [Validators.required],
      }),
      role: this.formBuilder.control<PartyRole>(defaultRole),
    });
  }

  private _prefillForm(record: StaffBookingRecord): void {
    const start = this._formatLocalDateTime(record.startTime);
    const end = this._formatLocalDateTime(record.endTime);
    const inspectorId = record.verifiedByStaffId ?? '';
    const staffId = record.verifiedByStaffId ?? '';

    this.form.patchValue(
      {
        booking: {
          verifiedByStaffId: staffId,
          verificationStatus: record.verificationStatus ?? BookingVerificationStatusEnum.Approved,
        },
        rental: {
          startTime: start,
          endTime: end,
        },
        inspection: {
          inspectorStaffId: inspectorId,
        },
        receive: {
          receivedByStaffId: staffId,
        },
      },
      { emitEvent: false },
    );
  }

  private _buildPayload(bookingId: string): BookingWorkflowPayload {
    const raw = this.form.getRawValue() as BookingWorkflowFormValue;

    const rentalStartIso = this._toIso(raw.rental.startTime);
    const rentalEndIso = this._toIso(raw.rental.endTime);
    const inspectionIso = this._toIso(raw.inspection.inspectedAt);
    const renterSignedIso = this._toIso(raw.renterSignature.signedAt);
    const staffSignedIso = this._toIso(raw.staffSignature.signedAt);
    const receivedAtIso = this._toIso(raw.receive.receivedAt);

    if (
      !rentalStartIso ||
      !rentalEndIso ||
      !inspectionIso ||
      !renterSignedIso ||
      !staffSignedIso ||
      !receivedAtIso
    ) {
      throw new Error('Invalid date/time input detected.');
    }

    const batteryCapacity = Number(raw.inspection.currentBatteryCapacityKwh);
    if (!Number.isFinite(batteryCapacity) || batteryCapacity < 0) {
      throw new Error('Invalid battery capacity provided.');
    }

    return {
      bookingId,
      verificationStatus: raw.booking.verificationStatus,
      verifiedByStaffId: raw.booking.verifiedByStaffId,
      rental: {
        startTime: rentalStartIso,
        endTime: rentalEndIso,
      },
      contract: {
        provider: raw.contract.provider,
      },
      inspection: {
        currentBatteryCapacityKwh: batteryCapacity,
        inspectedAt: inspectionIso,
        inspectorStaffId: raw.inspection.inspectorStaffId,
        url: raw.inspection.url.trim() ? raw.inspection.url.trim() : undefined,
      },
      signatures: [
        this._buildSignaturePayload(raw.renterSignature),
        this._buildSignaturePayload(raw.staffSignature),
      ],
      receive: {
        receivedAt: receivedAtIso,
        receivedByStaffId: raw.receive.receivedByStaffId,
      },
    } satisfies BookingWorkflowPayload;
  }

  private _buildSignaturePayload(value: SignatureFormValue): ContractSignaturePayload {
    const signedIso = this._toIso(value.signedAt);
    if (!signedIso) {
      throw new Error('Invalid signature date.');
    }

    return {
      role: value.role,
      signatureEvent: value.signatureEvent,
      type: value.type,
      signedAt: signedIso,
      documentUrl: value.documentUrl.trim() ? value.documentUrl.trim() : undefined,
      documentHash: value.documentHash.trim() ? value.documentHash.trim() : undefined,
    } satisfies ContractSignaturePayload;
  }

  private _formatLocalDateTime(value?: string | null): string {
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    const year = parsed.getFullYear();
    const month = this._pad(parsed.getMonth() + 1);
    const day = this._pad(parsed.getDate());
    const hour = this._pad(parsed.getHours());
    const minute = this._pad(parsed.getMinutes());
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  private _pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  private _toIso(value: string): string | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed.toISOString();
  }

  private _currentBookingId(): string | null {
    const params = this.bookingId();
    const value = params?.get('bookingId');
    return value ?? null;
  }
}
