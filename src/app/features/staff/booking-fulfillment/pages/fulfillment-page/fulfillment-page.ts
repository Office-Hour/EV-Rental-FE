import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EnvironmentInjector,
  computed,
  effect,
  inject,
  runInInjectionContext,
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
  InspectionPayload,
  SignaturePayload,
  VehicleReceivePayload,
} from '../../../../../core-logic/rental-fulfillment';
import type { FulfillmentStepState } from '../../../../../core-logic/rental-fulfillment';
import { EsignProvider as EsignProviderEnum } from '../../../../../../contract';
import { InspectionFormComponent } from '../../components/inspection-form/inspection-form';
import { SignatureStepComponent } from '../../components/signature-step/signature-step';
import { SummaryViewModel, StepViewModel, TimelineViewModel } from './fulfillment-page.models';
import { FulfillmentPagePresenter } from './fulfillment-page.presenter';

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
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly presenter = new FulfillmentPagePresenter();
  private lastInitializedBookingId: string | null = null;

  private readonly headingRef = viewChild<ElementRef<HTMLHeadingElement>>('pageHeading');
  private readonly initializationError = signal<string | null>(null);
  private readonly routeEntered = signal<boolean>(false);

  private readonly _contractProvider = signal<
    (typeof EsignProviderEnum)[keyof typeof EsignProviderEnum]
  >(EsignProviderEnum.Native);
  readonly contractProviders = this.presenter.contractProviders;
  readonly selectedContractProvider = this._contractProvider.asReadonly();

  private readonly vehicleReceiveSubmitAttempted = signal(false);
  readonly vehicleReceiveForm = this.formBuilder.group({
    receivedAt: this.formBuilder.control(this.presenter.defaultDateTimeInput(), {
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
  readonly summaryView = computed<SummaryViewModel | null>(() => {
    const summary = this.summary();
    if (!summary) {
      return null;
    }

    const artifacts = this.presenter.collectSummaryArtifacts(this.steps(), summary);
    return this.presenter.buildSummaryView(summary, artifacts);
  });

  readonly stepViewModels = computed<StepViewModel[]>(() => {
    return this.presenter.buildStepViewModels({
      steps: this.steps(),
      nextStep: this.nextStep(),
      isBusy: this.isBusy(),
    });
  });

  readonly timelineView = computed<readonly TimelineViewModel[]>(() => {
    return this.presenter.buildTimelineView(this.summary());
  });

  readonly hasFailure = computed(() => this.presenter.hasFailure(this.stepViewModels()));

  readonly initializationErrorMessage = computed(() => this.initializationError());

  constructor() {
    effect(() => {
      const rawBookingId = this.bookingIdSignal();
      const bookingId = rawBookingId.trim();
      if (!bookingId) {
        this.lastInitializedBookingId = null;
        return;
      }

      if (bookingId === this.lastInitializedBookingId) {
        return;
      }

      this.lastInitializedBookingId = bookingId;
      queueMicrotask(() => this._loadFulfillment(bookingId));
    });

    effect(() => {
      const canPerform = this.presenter.canPerformStep(
        'vehicle-receive',
        this.steps(),
        this.isBusy(),
      );
      if (!canPerform) {
        this.vehicleReceiveForm.disable({ emitEvent: false });
      } else {
        this.vehicleReceiveForm.enable({ emitEvent: false });
      }
    });

    effect(() => {
      const vehicleStep = this.stepViewModels().find((step) => step.step === 'vehicle-receive');
      if (vehicleStep?.status !== 'fulfilled' || !this.vehicleReceiveSubmitAttempted()) {
        return;
      }

      queueMicrotask(() => this.vehicleReceiveSubmitAttempted.set(false));
    });

    effect(() => {
      if (!this.routeEntered()) {
        return;
      }

      queueMicrotask(() => this._focusHeading());
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
    if (!this.presenter.canPerformStep('checkin', this.steps(), this.isBusy())) {
      return;
    }

    const bookingId = this._bookingId();
    if (bookingId) {
      this.analytics.stepStarted(bookingId, 'checkin');
    }

    this.orchestrator.checkInBooking().pipe(take(1)).subscribe();
  }

  onCreateRental(): void {
    if (!this.presenter.canPerformStep('create-rental', this.steps(), this.isBusy())) {
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

    this._contractProvider.set(this.presenter.resolveContractProvider(select.value));
  }

  onCreateContract(): void {
    if (!this.presenter.canPerformStep('create-contract', this.steps(), this.isBusy())) {
      return;
    }

    const bookingId = this._bookingId();
    if (bookingId) {
      this.analytics.stepStarted(bookingId, 'create-contract');
    }

    this.orchestrator.createContract(this._contractProvider()).pipe(take(1)).subscribe();
  }

  onSubmitInspection(payload: InspectionPayload): void {
    if (!this.presenter.canPerformStep('inspection', this.steps(), this.isBusy())) {
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
    if (!this.presenter.canPerformStep(stepId, this.steps(), this.isBusy())) {
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

    if (!this.presenter.canPerformStep('vehicle-receive', this.steps(), this.isBusy())) {
      return;
    }

    if (this.vehicleReceiveForm.invalid) {
      this.vehicleReceiveForm.markAllAsTouched();
      return;
    }

    const receivedAtInput = this.vehicleReceiveForm.controls.receivedAt.value;
    const receivedAtIso = this.presenter.toIsoString(receivedAtInput);
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
            { receivedAt: this.presenter.defaultDateTimeInput() },
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
    return this.presenter.statusLabel(status);
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

  private _setPageTitle(bookingId: string): void {
    this.title.setTitle(`Xử lý đặt xe · ${this._shortIdentifier(bookingId)}`);
  }

  private _focusHeading(): void {
    runInInjectionContext(this.environmentInjector, () => {
      afterNextRender(() => {
        const heading = this.headingRef();
        heading?.nativeElement.focus();
      });
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
