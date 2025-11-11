import type {
  BookingDetailsDto,
  BookingStatus,
  BookingVerificationStatus,
  RentalDetailsDto,
  RenterProfileDto,
  VehicleDetailsDto,
} from '../../../contract';

export const FULFILLMENT_STEP_IDS = [
  'checkin',
  'create-rental',
  'create-contract',
  'inspection',
  'sign-renter',
  'sign-staff',
  'vehicle-receive',
] as const;

export type FulfillmentStepId = (typeof FULFILLMENT_STEP_IDS)[number];

export type FulfillmentStepStatus = 'pending' | 'in-progress' | 'fulfilled' | 'error';

export interface FulfillmentError {
  readonly message: string;
  readonly code?: string;
  readonly detail?: unknown;
}

export interface FulfillmentArtifact {
  readonly rentalId?: string;
  readonly contractId?: string;
  readonly inspectionId?: string;
  readonly renterSignatureId?: string;
  readonly staffSignatureId?: string;
  readonly vehicleReceipt?: { readonly receivedAt: string; readonly receivedByStaffId: string };
}

export interface FulfillmentStepState {
  readonly step: FulfillmentStepId;
  readonly status: FulfillmentStepStatus;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly error?: FulfillmentError;
  readonly artifact?: FulfillmentArtifact;
  readonly requires?: readonly FulfillmentStepId[];
}

export interface FulfillmentTimelineEvent {
  readonly step: FulfillmentStepId;
  readonly title: string;
  readonly description?: string;
  readonly actor: 'staff' | 'renter' | 'system';
  readonly occurredAt: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface BookingFulfillmentSummary {
  readonly bookingId: string;
  readonly status?: BookingStatus;
  readonly verificationStatus?: BookingVerificationStatus;
  readonly booking?: BookingDetailsDto;
  readonly renterProfile?: RenterProfileDto;
  readonly vehicleDetails?: VehicleDetailsDto;
  readonly rental?: RentalDetailsDto;
  readonly timeline: readonly FulfillmentTimelineEvent[];
}

export interface FulfillmentStateSnapshot {
  readonly summary?: BookingFulfillmentSummary;
  readonly steps: readonly FulfillmentStepState[];
  readonly nextStep?: FulfillmentStepState;
  readonly completionPercentage: number;
  readonly isBusy: boolean;
}

export interface FulfillmentAnalyticsSuccessPayload {
  readonly name: 'staff_booking_fulfillment_step_completed';
  readonly bookingId: string;
  readonly step: FulfillmentStepId;
  readonly status: 'success';
  readonly durationMs?: number;
}

export interface FulfillmentAnalyticsFailurePayload {
  readonly name: 'staff_booking_fulfillment_step_failed';
  readonly bookingId: string;
  readonly step: FulfillmentStepId;
  readonly status: 'error';
  readonly durationMs?: number;
  readonly errorCode?: string;
}

export interface FulfillmentAnalyticsStartedPayload {
  readonly name: 'staff_booking_fulfillment_step_started';
  readonly bookingId: string;
  readonly step: FulfillmentStepId;
}

export interface FulfillmentAnalyticsRoutePayload {
  readonly name: 'staff_booking_fulfillment_route_viewed';
  readonly bookingId: string;
}

export type FulfillmentAnalyticsPayload =
  | FulfillmentAnalyticsSuccessPayload
  | FulfillmentAnalyticsFailurePayload
  | FulfillmentAnalyticsStartedPayload
  | FulfillmentAnalyticsRoutePayload;
