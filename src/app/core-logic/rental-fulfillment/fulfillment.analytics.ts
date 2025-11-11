import { Injectable } from '@angular/core';
import {
  FulfillmentAnalyticsFailurePayload,
  FulfillmentAnalyticsPayload,
  FulfillmentAnalyticsRoutePayload,
  FulfillmentAnalyticsStartedPayload,
  FulfillmentAnalyticsSuccessPayload,
  FulfillmentStepId,
} from './fulfillment.types';

interface GlobalAnalyticsChannel {
  readonly dataLayer?: unknown[];
  readonly gtag?: (...args: unknown[]) => void;
}

@Injectable({ providedIn: 'root' })
export class FulfillmentAnalyticsService {
  routeEntered(bookingId: string): void {
    if (!bookingId) {
      return;
    }

    const payload: FulfillmentAnalyticsRoutePayload = {
      name: 'staff_booking_fulfillment_route_viewed',
      bookingId,
    };
    this._emit(payload);
  }

  stepStarted(bookingId: string, step: FulfillmentStepId): void {
    if (!bookingId || !step) {
      return;
    }

    const payload: FulfillmentAnalyticsStartedPayload = {
      name: 'staff_booking_fulfillment_step_started',
      bookingId,
      step,
    };
    this._emit(payload);
  }

  stepCompleted(bookingId: string, step: FulfillmentStepId, durationMs?: number): void {
    const payload: FulfillmentAnalyticsSuccessPayload = {
      name: 'staff_booking_fulfillment_step_completed',
      bookingId,
      step,
      status: 'success',
      durationMs,
    };
    this._emit(payload);
  }

  stepFailed(
    bookingId: string,
    step: FulfillmentStepId,
    errorCode?: string,
    durationMs?: number,
  ): void {
    const payload: FulfillmentAnalyticsFailurePayload = {
      name: 'staff_booking_fulfillment_step_failed',
      bookingId,
      step,
      status: 'error',
      durationMs,
      errorCode,
    };
    this._emit(payload);
  }

  private _emit(payload: FulfillmentAnalyticsPayload): void {
    if (!payload.bookingId) {
      return;
    }

    if ('step' in payload && !payload.step) {
      return;
    }

    const channel = this._resolveGlobalChannel();
    let emitted = false;

    if (channel?.dataLayer && Array.isArray(channel.dataLayer)) {
      channel.dataLayer.push(payload);
      emitted = true;
    }

    if (typeof channel?.gtag === 'function') {
      channel.gtag('event', payload.name, payload);
      emitted = true;
    }

    if (!emitted && typeof console !== 'undefined') {
      console.info('[analytics] staff fulfillment event', payload);
    }

    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('staff-booking-fulfillment-analytics', {
        detail: payload,
      });
      window.dispatchEvent(customEvent);
    }
  }

  private _resolveGlobalChannel(): GlobalAnalyticsChannel | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    return window as unknown as GlobalAnalyticsChannel;
  }
}
