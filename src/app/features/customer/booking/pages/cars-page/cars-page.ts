import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  DestroyRef,
  inject,
  signal,
  afterNextRender,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { MatStep, MatStepLabel, MatStepper } from '@angular/material/stepper';
import { catchError, of } from 'rxjs';
import { Checkout, BookingData } from '../checkout/checkout';
import { CarDetail } from '../car-detail/car-detail';
import { StationService } from '../../../../../core-logic/station/station.service';
import { PaymentsService } from '../../../../../core-logic/payments/payments.service';
import { Station } from '../../../../../core-logic/station/station.type';

interface BookingStep {
  readonly label: string;
  readonly key: 'details' | 'checkout' | 'payment' | 'deposit';
}

type StepKey = BookingStep['key'];

@Component({
  selector: 'app-cars-page',
  standalone: true,
  imports: [MatStepper, MatStep, MatStepLabel, CarDetail, Checkout],
  templateUrl: './cars-page.html',
  styleUrl: './cars-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'booking-page block',
  },
})
export class CarsPage {
  @ViewChild(MatStepper) private matStepper?: MatStepper;

  private readonly stationService = inject(StationService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly steps: BookingStep[] = [
    { key: 'details', label: 'Thông tin xe' },
    { key: 'checkout', label: 'Xác nhận thông tin' },
    { key: 'payment', label: 'Thanh toán' },
    { key: 'deposit', label: 'Đặt cọc hoàn tất' },
  ];

  readonly activeStep = signal<number>(0);
  readonly stations = signal<Station[]>([]);
  readonly bookingData = signal<BookingData | null>(null);
  readonly paymentStarted = signal<boolean>(false);

  readonly isFirstStep = computed(() => this.activeStep() === 0);
  readonly detailsCompleted = computed(() => !!this.bookingData());

  constructor() {
    // Load stations if not already loaded (for car-detail)
    if (this.stationService.stations.length === 0) {
      this.stationService.getStations().subscribe({
        next: (stations: Station[]) => {
          this.stations.set(stations);
        },
        error: () => {
          // Silently ignore errors. They can be retried later.
        },
      });
    } else {
      this.stations.set(this.stationService.stations);
    }

    // Handle payment return only; ignore external step changes via URL
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      // Check if this is a payment return (VnPay usually returns with vnp_* params)
      const hasPaymentParams = Object.keys(params).some((key) => key.startsWith('vnp_'));
      if (hasPaymentParams) {
        this.handlePaymentReturn();
      }
    });

    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fragment) => {
      const normalized = fragment?.trim().toLowerCase();
      if (!normalized) {
        return;
      }

      const targetIndex = this.steps.findIndex((step) => step.key === normalized);
      if (targetIndex < 0 || targetIndex === this.activeStep()) {
        return;
      }

      this.setActiveStep(targetIndex, { updateFragment: false });
    });
  }

  private handlePaymentReturn(): void {
    this.paymentsService
      .getPaymentReturn()
      .pipe(
        catchError(() => {
          // On error, go back to checkout step
          this.setActiveStep(1);
          // Clear query params
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true,
          });
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        // Clear query params
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true,
        });

        if (response.isSuccess && response.data?.isSuccess) {
          const bookingId = response.data.orderId?.trim();
          if (bookingId) {
            this.setActiveStep(3);
            this.router.navigate(['/bookings', bookingId]);
            return;
          }

          // Missing booking id - fall back to checkout step
          this.setActiveStep(1);
          return;
        } else {
          // Payment failed - go back to checkout step
          this.setActiveStep(1);
        }
      });
  }

  onStepSelectionChange(event: StepperSelectionEvent): void {
    const nextIndex = event.selectedIndex;
    if (nextIndex !== this.activeStep()) {
      this.activeStep.set(nextIndex);
    }
  }

  goToNextStep(): void {
    const currentIndex = this.activeStep();
    // Gate transitions by step
    if (currentIndex === 0 && !this.detailsCompleted()) {
      return;
    }
    if (currentIndex === 1 && !this.paymentStarted()) {
      return;
    }

    if (currentIndex >= this.steps.length - 1) {
      return;
    }

    this.setActiveStep(currentIndex + 1);
  }

  goToPreviousStep(): void {
    const currentIndex = this.activeStep();
    if (currentIndex <= 0) {
      return;
    }
    this.setActiveStep(currentIndex - 1);
  }

  onBookingDataReady(data: BookingData): void {
    this.bookingData.set(data);
  }

  // Called from checkout when payment url is ready (via nextStep emission)
  // We mark that payment has begun so step 1 can be considered completed.
  // The actual navigation to the payment provider is handled in checkout.
  markPaymentStarted(): void {
    this.paymentStarted.set(true);
  }

  private setActiveStep(nextIndex: number, options: { updateFragment?: boolean } = {}): void {
    const previousIndex = this.activeStep();
    const boundedIndex = Math.max(0, Math.min(this.steps.length - 1, nextIndex));
    const shouldUpdateFragment = options?.updateFragment !== false;

    this.activeStep.set(boundedIndex);

    if (boundedIndex === 0) {
      this.paymentStarted.set(false);
    }
    if (boundedIndex < previousIndex && boundedIndex <= 1) {
      this.paymentStarted.set(false);
    }

    const renderRef = afterNextRender({
      read: () => {
        if (!this.matStepper) {
          return;
        }

        const desiredIndex = this.activeStep();
        this.matStepper.selectedIndex = desiredIndex;

        const actualIndex = this.matStepper.selectedIndex;
        if (shouldUpdateFragment) {
          const key = this.steps[actualIndex]?.key;
          if (key) {
            this.updateFragment(key);
          }
        }

        if (actualIndex !== desiredIndex) {
          this.activeStep.set(actualIndex);
        }
      },
    });
    this.destroyRef.onDestroy(() => renderRef.destroy());
  }

  private updateFragment(step: StepKey): void {
    this.router.navigate([], {
      relativeTo: this.route,
      fragment: step,
      queryParamsHandling: 'preserve',
      replaceUrl: true,
    });
  }
}
