import {
  BookingStatus as BookingStatusEnum,
  BookingVerificationStatus as BookingVerificationStatusEnum,
  RentalStatus as RentalStatusEnum,
} from '../../../../contract';
import type { BookingStatus, BookingVerificationStatus, RentalStatus } from '../../../../contract';
import type { StaffBookingRecord } from '../../../core-logic/bookings/bookings.service';

export type BookingTabKey = 'all' | 'pendingVerification' | 'verified' | 'cancelled';

export interface BookingStatusCounters {
  readonly total: number;
  readonly pendingVerification: number;
  readonly verified: number;
  readonly cancelled: number;
}

export interface BookingTabDescriptor {
  readonly key: BookingTabKey;
  readonly label: string;
  readonly description: string;
  readonly counterKey: keyof BookingStatusCounters;
}

export type StatusTone = 'pending' | 'success' | 'danger' | 'info';

export interface StatusBadge {
  readonly text: string;
  readonly tone: StatusTone;
}

export interface BookingCardViewModel {
  readonly key: string;
  readonly record: StaffBookingRecord;
  readonly customerDisplay: string;
  readonly bookingCreatedDisplay: string;
  readonly rentalStartDisplay: string;
  readonly rentalEndDisplay: string;
  readonly totalAmountDisplay: string;
  readonly depositDisplay: string;
  readonly vehicleDisplay: string;
  readonly rentalSummary: string;
  readonly badges: readonly StatusBadge[];
}

export interface SelectedBookingViewModel {
  readonly record: StaffBookingRecord;
  readonly customerDisplay: string;
  readonly badges: readonly StatusBadge[];
  readonly createdAtDisplay: string;
  readonly startDateTimeDisplay: string;
  readonly endDateTimeDisplay: string;
  readonly totalAmountDisplay: string;
  readonly depositDisplay: string;
  readonly vehicleDisplay: string;
  readonly rentalSummary: string;
  readonly rentalDays?: number;
}

export const BOOKING_TABS: readonly BookingTabDescriptor[] = [
  {
    key: 'all',
    label: 'All bookings',
    description: 'Every booking status',
    counterKey: 'total',
  },
  {
    key: 'pendingVerification',
    label: 'Pending verification',
    description: 'Awaiting review',
    counterKey: 'pendingVerification',
  },
  {
    key: 'verified',
    label: 'Verified',
    description: 'Approved bookings',
    counterKey: 'verified',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    description: 'No longer active',
    counterKey: 'cancelled',
  },
] as const;

export const BOOKING_STATUS_BADGES: Record<BookingStatus, StatusBadge> = {
  [BookingStatusEnum.PendingVerification]: { text: 'Pending Verification', tone: 'pending' },
  [BookingStatusEnum.Verified]: { text: 'Verified', tone: 'success' },
  [BookingStatusEnum.Cancelled]: { text: 'Cancelled', tone: 'danger' },
  [BookingStatusEnum.RentalCreated]: { text: 'Rental Created', tone: 'info' },
};

export const BOOKING_VERIFICATION_BADGES: Record<BookingVerificationStatus, StatusBadge> = {
  [BookingVerificationStatusEnum.Pending]: { text: 'Verification Pending', tone: 'pending' },
  [BookingVerificationStatusEnum.Approved]: { text: 'Verification Approved', tone: 'success' },
  [BookingVerificationStatusEnum.RejectedMismatch]: {
    text: 'Verification Rejected',
    tone: 'danger',
  },
  [BookingVerificationStatusEnum.RejectedOther]: {
    text: 'Verification Rejected',
    tone: 'danger',
  },
};

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  [RentalStatusEnum.Reserved]: 'Reserved',
  [RentalStatusEnum.InProgress]: 'In Progress',
  [RentalStatusEnum.Completed]: 'Completed',
  [RentalStatusEnum.Late]: 'Late',
  [RentalStatusEnum.Cancelled]: 'Cancelled',
};

export const RENTAL_STATUS_BADGES: Record<RentalStatus, StatusBadge> = {
  [RentalStatusEnum.Reserved]: { text: 'Rental Reserved', tone: 'info' },
  [RentalStatusEnum.InProgress]: { text: 'Rental In Progress', tone: 'info' },
  [RentalStatusEnum.Completed]: { text: 'Rental Completed', tone: 'success' },
  [RentalStatusEnum.Late]: { text: 'Rental Late', tone: 'danger' },
  [RentalStatusEnum.Cancelled]: { text: 'Rental Cancelled', tone: 'danger' },
};

export const RENTAL_NOT_CREATED_BADGE: StatusBadge = {
  text: 'Rental Not Created',
  tone: 'pending',
};

export const RENTAL_LINKED_BADGE: StatusBadge = {
  text: 'Rental Linked',
  tone: 'info',
};
