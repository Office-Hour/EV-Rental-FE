import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { map, take } from 'rxjs';
import {
  BookingStatus,
  BookingVerificationStatus,
  RentalStatus,
  SignatureType,
} from '../../../../contract';
import { BookingsService, StaffBookingRecord } from '../../../core-logic/bookings/bookings.service';
import {
  BookingWorkflowPayload,
  BookingWorkflowService,
  BookingWorkflowStepState,
  BookingWorkflowStepStatus,
  BookingWorkflowSummary,
} from '../../../core-logic/bookings/booking-workflow.service';
import { UserService } from '../../../core-logic/user/user.service';
import { ToastService } from '../../../lib/common-ui/services/toast/toast.service';

interface SignatureFormGroup {
  documentUrl: FormControl<string>;
  documentHash: FormControl<string>;
  signatureType: FormControl<SignatureType>;
  signedAt: FormControl<string>;
  signerIp: FormControl<string | null>;
  userAgent: FormControl<string | null>;
  signatureImageUrl: FormControl<string | null>;
  providerSignatureId: FormControl<string | null>;
  signatureHash: FormControl<string | null>;
  evidenceUrl: FormControl<string | null>;
}

interface InspectionFormGroup {
  batteryCapacity: FormControl<number>;
  inspectedAt: FormControl<string>;
  inspectionUrl: FormControl<string | null>;
}

interface VehicleReceiveFormGroup {
  receivedAt: FormControl<string>;
}

interface BookingWorkflowFormModel {
  inspection: FormGroup<InspectionFormGroup>;
  renterSignature: FormGroup<SignatureFormGroup>;
  staffSignature: FormGroup<SignatureFormGroup>;
  vehicleReceive: FormGroup<VehicleReceiveFormGroup>;
}

interface StatusBadgeViewModel {
  readonly label: string;
  readonly tone: 'pending' | 'success' | 'danger' | 'info';
}

interface BookingSummaryViewModel {
  readonly bookingId: string;
  readonly customer: string;
  readonly badges: readonly StatusBadgeViewModel[];
  readonly createdAt?: string;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly deposit?: string;
  readonly total?: string;
  readonly vehicle?: string;
  readonly rentalId?: string;
  readonly rentalStatus?: string;
}

const SIGNATURE_TYPE_OPTIONS: readonly { value: SignatureType; label: string }[] = [
  { value: SignatureType.Drawn, label: 'Drawn (handwritten)' },
  { value: SignatureType.Typed, label: 'Typed' },
  { value: SignatureType.DigitalCert, label: 'Digital certificate' },
  { value: SignatureType.OnPaper, label: 'On paper upload' },
];

const STEP_STATUS_LABELS: Record<BookingWorkflowStepStatus, string> = {
  idle: 'Pending',
  running: 'In progress',
  success: 'Completed',
  error: 'Failed',
};

const BOOKING_STATUS_BADGES: Partial<Record<BookingStatus, StatusBadgeViewModel>> = {
  pending_Verification: { label: 'Pending Verification', tone: 'pending' },
  verified: { label: 'Verified', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  rental_Created: { label: 'Rental Created', tone: 'info' },
};

const BOOKING_VERIFICATION_BADGES: Partial<
  Record<BookingVerificationStatus, StatusBadgeViewModel>
> = {
  pending: { label: 'Verification Pending', tone: 'pending' },
  approved: { label: 'Verification Approved', tone: 'success' },
  rejected_Mismatch: { label: 'Verification Rejected', tone: 'danger' },
  rejected_Other: { label: 'Verification Rejected', tone: 'danger' },
};

const RENTAL_STATUS_LABELS: Partial<Record<RentalStatus, string>> = {
  reserved: 'Reserved',
  in_Progress: 'In Progress',
  completed: 'Completed',
  late: 'Late',
  cancelled: 'Cancelled',
};

@Component({
  selector: 'app-staff-booking-detail',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './booking-detail.html',
  styleUrl: './booking-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffBookingDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly bookingsService = inject(BookingsService);
  private readonly workflowService = inject(BookingWorkflowService);
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);

  private readonly bookingIdSignal = toSignal(this.route.paramMap.pipe(map(mapParamToBookingId)), {
    initialValue: this.route.snapshot.paramMap.get('bookingId') ?? '',
  });

  readonly workflowForm: FormGroup<BookingWorkflowFormModel> =
    this.formBuilder.group<BookingWorkflowFormModel>({
      inspection: this.formBuilder.group<InspectionFormGroup>({
        batteryCapacity: this.formBuilder.nonNullable.control<number>(80, {
          validators: [Validators.required, Validators.min(0)],
        }),
        inspectedAt: this.formBuilder.nonNullable.control<string>(
          this._defaultDateTimeValue(),
          Validators.required,
        ),
        inspectionUrl: this.formBuilder.control<string | null>(null),
      }),
      renterSignature: this._createSignatureGroup(),
      staffSignature: this._createSignatureGroup(),
      vehicleReceive: this.formBuilder.group<VehicleReceiveFormGroup>({
        receivedAt: this.formBuilder.nonNullable.control<string>(
          this._defaultDateTimeValue(),
          Validators.required,
        ),
      }),
    });

  readonly bookingId = computed(() => this.bookingIdSignal());

  readonly bookingRecord = computed<StaffBookingRecord | null>(() => {
    const id = this.bookingId();
    if (!id) {
      return null;
    }

    const records = this.bookingsService.staffBookings();
    return records.find((record) => record.bookingId === id) ?? null;
  });

  readonly bookingSummary = computed<BookingSummaryViewModel | null>(() => {
    const record = this.bookingRecord();
    if (!record) {
      return null;
    }

    const badges: StatusBadgeViewModel[] = [];
    const statusBadge = record.status ? BOOKING_STATUS_BADGES[record.status] : undefined;
    if (statusBadge) {
      badges.push(statusBadge);
    }
    const verificationBadge = record.verificationStatus
      ? BOOKING_VERIFICATION_BADGES[record.verificationStatus]
      : undefined;
    if (verificationBadge) {
      badges.push(verificationBadge);
    }
    const rentalBadge = record.rental?.status
      ? this._resolveRentalBadge(record.rental.status)
      : undefined;
    if (rentalBadge) {
      badges.push(rentalBadge);
    }

    return {
      bookingId: record.bookingId,
      customer: this._resolveCustomerLabel(record),
      badges,
      createdAt: this._formatDateTime(record.bookingCreatedAt),
      startTime: this._formatDateTime(record.startTime),
      endTime: this._formatDateTime(record.endTime),
      deposit: this._formatCurrency(record.vehicleDetails?.depositPrice),
      total: this._formatCurrency(this._computeEstimatedTotal(record)),
      vehicle: this._resolveVehicleLabel(record),
      rentalId: record.rental?.rentalId ?? undefined,
      rentalStatus: record.rental?.status ? RENTAL_STATUS_LABELS[record.rental.status] : undefined,
    } satisfies BookingSummaryViewModel;
  });

  readonly workflowSteps = computed<BookingWorkflowStepState[]>(() =>
    this.workflowService.steps().map((step) => ({ ...step })),
  );
  readonly workflowRunning = computed(() => this.workflowService.running());
  readonly workflowError = computed(() => this.workflowService.error());
  readonly workflowResult = computed<BookingWorkflowSummary | null>(() =>
    this.workflowService.result(),
  );

  readonly signatureTypeOptions = SIGNATURE_TYPE_OPTIONS;

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

  private readonly _ensureBookingEffect = effect(() => {
    const id = this.bookingId();
    if (!id) {
      return;
    }
    const existing = this.bookingRecord();
    if (existing) {
      return;
    }

    this.bookingsService.loadStaffBookings().pipe(take(1)).subscribe();
  });

  constructor() {
    this.workflowService.reset();
  }

  get inspectionGroup(): FormGroup<InspectionFormGroup> {
    return this.workflowForm.controls.inspection;
  }

  get renterSignatureGroup(): FormGroup<SignatureFormGroup> {
    return this.workflowForm.controls.renterSignature;
  }

  get staffSignatureGroup(): FormGroup<SignatureFormGroup> {
    return this.workflowForm.controls.staffSignature;
  }

  get vehicleReceiveGroup(): FormGroup<VehicleReceiveFormGroup> {
    return this.workflowForm.controls.vehicleReceive;
  }

  statusLabel(status: BookingWorkflowStepStatus): string {
    return STEP_STATUS_LABELS[status];
  }

  runWorkflow(): void {
    if (this.workflowRunning()) {
      return;
    }

    const booking = this.bookingRecord();
    if (!booking) {
      this.toastService.error('Booking information could not be loaded.');
      return;
    }

    if (this.workflowForm.invalid) {
      this.workflowForm.markAllAsTouched();
      this.toastService.error('Please review the workflow form before continuing.');
      return;
    }

    const payload = this._buildPayload(booking);
    if (!payload) {
      this.toastService.error('Unable to build workflow payload.');
      return;
    }

    this.workflowService
      .executeWorkflow(payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.toastService.success('Booking workflow completed successfully.');
        },
        error: (error: unknown) => {
          console.error('Booking workflow failed', error);
          const message =
            this.workflowService.error() ?? 'Booking workflow failed. Please try again.';
          this.toastService.error(message);
        },
      });
  }

  private _createSignatureGroup(): FormGroup<SignatureFormGroup> {
    return this.formBuilder.group<SignatureFormGroup>({
      documentUrl: this.formBuilder.nonNullable.control<string>('', Validators.required),
      documentHash: this.formBuilder.nonNullable.control<string>('', Validators.required),
      signatureType: this.formBuilder.nonNullable.control<SignatureType>(
        SignatureType.Drawn,
        Validators.required,
      ),
      signedAt: this.formBuilder.nonNullable.control<string>(
        this._defaultDateTimeValue(),
        Validators.required,
      ),
      signerIp: this.formBuilder.control<string | null>(null),
      userAgent: this.formBuilder.control<string | null>(null),
      signatureImageUrl: this.formBuilder.control<string | null>(null),
      providerSignatureId: this.formBuilder.control<string | null>(null),
      signatureHash: this.formBuilder.control<string | null>(null),
      evidenceUrl: this.formBuilder.control<string | null>(null),
    });
  }

  private _buildPayload(record: StaffBookingRecord): BookingWorkflowPayload | null {
    const staffId = this.userService.user?.id ?? undefined;

    const inspectionGroup = this.inspectionGroup.controls;
    const renterGroup = this.renterSignatureGroup.controls;
    const staffGroup = this.staffSignatureGroup.controls;
    const vehicleGroup = this.vehicleReceiveGroup.controls;

    const batteryCapacity = inspectionGroup.batteryCapacity.value;
    const inspectedAt = inspectionGroup.inspectedAt.value;
    const inspectionUrl = inspectionGroup.inspectionUrl.value;

    const renterSignatureType = renterGroup.signatureType.value;
    const staffSignatureType = staffGroup.signatureType.value;

    if (batteryCapacity === null || batteryCapacity === undefined) {
      return null;
    }

    return {
      bookingId: record.bookingId,
      staffId: staffId ?? undefined,
      rentalStart: record.startTime ?? undefined,
      rentalEnd: record.endTime ?? undefined,
      inspection: {
        currentBatteryCapacityKwh: Number(batteryCapacity),
        inspectedAt: this._toIsoString(inspectedAt),
        url: this._sanitizeOptional(inspectionUrl),
      },
      renterSignature: {
        documentUrl: renterGroup.documentUrl.value,
        documentHash: renterGroup.documentHash.value,
        signatureType: renterSignatureType ?? SignatureType.Drawn,
        signedAt: this._toIsoString(renterGroup.signedAt.value),
        signerIp: this._sanitizeOptional(renterGroup.signerIp.value),
        userAgent: this._sanitizeOptional(renterGroup.userAgent.value),
        signatureImageUrl: this._sanitizeOptional(renterGroup.signatureImageUrl.value),
        providerSignatureId: this._sanitizeOptional(renterGroup.providerSignatureId.value),
        signatureHash: this._sanitizeOptional(renterGroup.signatureHash.value),
        evidenceUrl: this._sanitizeOptional(renterGroup.evidenceUrl.value),
      },
      staffSignature: {
        documentUrl: staffGroup.documentUrl.value,
        documentHash: staffGroup.documentHash.value,
        signatureType: staffSignatureType ?? SignatureType.Drawn,
        signedAt: this._toIsoString(staffGroup.signedAt.value),
        signerIp: this._sanitizeOptional(staffGroup.signerIp.value),
        userAgent: this._sanitizeOptional(staffGroup.userAgent.value),
        signatureImageUrl: this._sanitizeOptional(staffGroup.signatureImageUrl.value),
        providerSignatureId: this._sanitizeOptional(staffGroup.providerSignatureId.value),
        signatureHash: this._sanitizeOptional(staffGroup.signatureHash.value),
        evidenceUrl: this._sanitizeOptional(staffGroup.evidenceUrl.value),
      },
      vehicleReceive: {
        receivedAt: this._toIsoString(vehicleGroup.receivedAt.value),
      },
    } satisfies BookingWorkflowPayload;
  }

  private _resolveCustomerLabel(record: StaffBookingRecord): string {
    const renterName = record.renterProfile?.userName?.trim();
    if (renterName && renterName.length > 0) {
      return renterName;
    }

    return record.renterId ?? 'Unknown customer';
  }

  private _resolveVehicleLabel(record: StaffBookingRecord): string | undefined {
    const vehicle = record.vehicleDetails;
    if (!vehicle) {
      return undefined;
    }

    const make = vehicle.make?.trim();
    const model = vehicle.model?.trim();
    const year = vehicle.modelYear;
    const vehicleId = vehicle.vehicleId;

    const parts: string[] = [];
    if (make) {
      parts.push(make);
    }
    if (model) {
      parts.push(model);
    }
    if (year) {
      parts.push(String(year));
    }
    const name = parts.join(' ');

    if (name.length > 0) {
      return vehicleId ? `${name} · ${vehicleId}` : name;
    }

    return vehicleId ?? undefined;
  }

  private _resolveRentalBadge(status: RentalStatus): StatusBadgeViewModel | undefined {
    const label = RENTAL_STATUS_LABELS[status];
    if (!label) {
      return undefined;
    }

    const tone: StatusBadgeViewModel['tone'] =
      status === 'completed' ? 'success' : status === 'cancelled' ? 'danger' : 'info';

    return { label, tone } satisfies StatusBadgeViewModel;
  }

  private _computeEstimatedTotal(record: StaffBookingRecord): number | undefined {
    const vehicleDetails = record.vehicleDetails;
    if (!vehicleDetails) {
      return undefined;
    }

    const rentalDays = this._computeRentalDays(record);
    if (!rentalDays) {
      return undefined;
    }

    const dailyPrice = vehicleDetails.rentalPricePerDay ?? undefined;
    if (!dailyPrice) {
      return undefined;
    }

    return rentalDays * dailyPrice;
  }

  private _computeRentalDays(record: StaffBookingRecord): number | undefined {
    const start = record.startTime ? Date.parse(record.startTime) : Number.NaN;
    const end = record.endTime ? Date.parse(record.endTime) : Number.NaN;

    if (Number.isNaN(start) || Number.isNaN(end)) {
      return undefined;
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const days = Math.max(1, Math.round((end - start) / millisecondsPerDay));
    return Number.isFinite(days) ? days : undefined;
  }

  private _formatCurrency(value?: number | null): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    return this.currencyFormatter.format(value);
  }

  private _formatDateTime(value?: string | null): string | undefined {
    if (!value) {
      return undefined;
    }
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return undefined;
    }

    return this.dateTimeFormatter.format(new Date(timestamp));
  }

  private _defaultDateTimeValue(): string {
    const now = new Date();
    now.setSeconds(0, 0);
    return this._formatDateForInput(now);
  }

  private _formatDateForInput(date: Date): string {
    const offsetMilliseconds = date.getTimezoneOffset() * 60 * 1000;
    const localTime = new Date(date.getTime() - offsetMilliseconds);
    return localTime.toISOString().slice(0, 16);
  }

  private _toIsoString(value: string): string {
    if (!value) {
      return new Date().toISOString();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toISOString();
    }

    return parsed.toISOString();
  }

  private _sanitizeOptional(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}

function mapParamToBookingId(paramMap: ParamMap): string {
  return paramMap.get('bookingId') ?? '';
}
