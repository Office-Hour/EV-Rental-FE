import { computed, Injectable, signal } from '@angular/core';
import {
  BookingFulfillmentSummary,
  FulfillmentArtifact,
  FulfillmentError,
  FulfillmentStateSnapshot,
  FulfillmentStepId,
  FulfillmentStepState,
  FulfillmentTimelineEvent,
  FULFILLMENT_STEP_IDS,
} from './fulfillment.types';

const STEP_DEPENDENCIES: Record<FulfillmentStepId, readonly FulfillmentStepId[]> = {
  checkin: [],
  'create-rental': ['checkin'],
  'create-contract': ['checkin', 'create-rental'],
  inspection: ['create-contract'],
  'sign-renter': ['inspection'],
  'sign-staff': ['inspection', 'sign-renter'],
  'vehicle-receive': ['sign-staff'],
};

function createInitialSteps(): FulfillmentStepState[] {
  return FULFILLMENT_STEP_IDS.map((step, index) => ({
    step,
    status: 'pending',
    requires: STEP_DEPENDENCIES[step] ?? (index === 0 ? [] : [FULFILLMENT_STEP_IDS[index - 1]]),
  }));
}

@Injectable({ providedIn: 'root' })
export class FulfillmentStateStore {
  private readonly _steps = signal<readonly FulfillmentStepState[]>(createInitialSteps());
  private readonly _summary = signal<BookingFulfillmentSummary | undefined>(undefined);
  private readonly _isBusy = signal<boolean>(false);
  private readonly _lastUpdatedAt = signal<string | null>(null);

  readonly steps = computed<readonly FulfillmentStepState[]>(() =>
    this._steps().map((step) => ({
      ...step,
      requires: step.requires ? [...step.requires] : undefined,
      artifact: step.artifact ? { ...step.artifact } : undefined,
      error: step.error ? { ...step.error } : undefined,
    })),
  );

  readonly summary = computed<BookingFulfillmentSummary | undefined>(() => {
    const summary = this._summary();
    if (!summary) {
      return undefined;
    }

    return {
      ...summary,
      timeline: summary.timeline.map((event) => ({
        ...event,
        metadata: event.metadata ? { ...event.metadata } : undefined,
      })),
    };
  });

  readonly nextStep = computed<FulfillmentStepState | undefined>(() =>
    this._steps().find((step) => step.status !== 'fulfilled'),
  );

  readonly completionPercentage = computed<number>(() => {
    const steps = this._steps();
    if (steps.length === 0) {
      return 0;
    }

    const fulfilledCount = steps.filter((step) => step.status === 'fulfilled').length;
    return Math.round((fulfilledCount / steps.length) * 100);
  });

  readonly isBusy = this._isBusy.asReadonly();

  readonly snapshot = computed<FulfillmentStateSnapshot>(() => ({
    summary: this.summary(),
    steps: this.steps(),
    nextStep: this.nextStep(),
    completionPercentage: this.completionPercentage(),
    isBusy: this._isBusy(),
  }));

  readonly lastUpdatedAt = this._lastUpdatedAt.asReadonly();

  reset(): void {
    this._summary.set(undefined);
    this._steps.set(createInitialSteps());
    this._isBusy.set(false);
    this._lastUpdatedAt.set(new Date().toISOString());
  }

  setSummary(summary: BookingFulfillmentSummary | undefined): void {
    this._summary.set(summary ? { ...summary, timeline: [...summary.timeline] } : undefined);
    this._touch();
  }

  mergeSummary(partial: Partial<BookingFulfillmentSummary>): void {
    const current = this._summary();
    if (!current && !partial.bookingId) {
      return;
    }

    const nextTimeline = partial.timeline ?? current?.timeline ?? [];
    this._summary.set(
      current
        ? {
            ...current,
            ...partial,
            timeline: [...nextTimeline],
          }
        : partial.bookingId
          ? {
              bookingId: partial.bookingId,
              status: partial.status,
              verificationStatus: partial.verificationStatus,
              booking: partial.booking,
              renterProfile: partial.renterProfile,
              vehicleDetails: partial.vehicleDetails,
              rental: partial.rental,
              timeline: [...nextTimeline],
            }
          : undefined,
    );
    this._touch();
  }

  setTimeline(events: readonly FulfillmentTimelineEvent[]): void {
    this._summary.update((current) => {
      if (!current) {
        return current;
      }

      const ordered = [...events].sort(
        (first, second) => Date.parse(first.occurredAt) - Date.parse(second.occurredAt),
      );

      return {
        ...current,
        timeline: ordered.map((event) => ({
          ...event,
          metadata: event.metadata ? { ...event.metadata } : undefined,
        })),
      };
    });
    this._touch();
  }

  appendTimeline(event: FulfillmentTimelineEvent): void {
    this._summary.update((current) => {
      if (!current) {
        return current;
      }

      const nextTimeline = [...current.timeline, event].sort(
        (first, second) => Date.parse(first.occurredAt) - Date.parse(second.occurredAt),
      );

      return {
        ...current,
        timeline: nextTimeline.map((entry) => ({
          ...entry,
          metadata: entry.metadata ? { ...entry.metadata } : undefined,
        })),
      };
    });
    this._touch();
  }

  setBusy(isBusy: boolean): void {
    this._isBusy.set(isBusy);
    this._touch();
  }

  markStepInProgress(
    stepId: FulfillmentStepId,
    startedAt: string = new Date().toISOString(),
  ): void {
    this._applyStepUpdate(stepId, {
      status: 'in-progress',
      startedAt,
      error: undefined,
    });
  }

  markStepFulfilled(
    stepId: FulfillmentStepId,
    artifact?: FulfillmentArtifact,
    completedAt: string = new Date().toISOString(),
  ): void {
    this._applyStepUpdate(stepId, {
      status: 'fulfilled',
      completedAt,
      artifact,
      error: undefined,
    });
  }

  markStepError(stepId: FulfillmentStepId, error: FulfillmentError): void {
    this._applyStepUpdate(stepId, {
      status: 'error',
      error,
    });
  }

  clearStep(stepId: FulfillmentStepId): void {
    const requires = STEP_DEPENDENCIES[stepId];
    this._applyStepUpdate(stepId, {
      status: 'pending',
      startedAt: undefined,
      completedAt: undefined,
      artifact: undefined,
      error: undefined,
      requires,
    });
  }

  private _applyStepUpdate(
    stepId: FulfillmentStepId,
    changes: Partial<FulfillmentStepState>,
  ): void {
    this._steps.update((steps) => {
      const nextSteps: FulfillmentStepState[] = [];
      for (const step of steps) {
        if (step.step !== stepId) {
          nextSteps.push(step);
          continue;
        }

        nextSteps.push({
          ...step,
          ...changes,
          requires: changes.requires ?? step.requires,
          artifact: changes.artifact ?? step.artifact,
          error: changes.error,
        });
      }
      return nextSteps;
    });
    this._touch();
  }

  private _touch(): void {
    this._lastUpdatedAt.set(new Date().toISOString());
  }
}
