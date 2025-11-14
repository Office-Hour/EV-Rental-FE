import {
  FulfillmentStepId,
  FulfillmentStepState,
} from '../../../../../core-logic/rental-fulfillment';
import { EsignProvider as EsignProviderEnum } from '../../../../../../contract';

export type StepActionKind =
  | 'button'
  | 'contract'
  | 'inspection'
  | 'signature'
  | 'vehicle'
  | 'none';

export interface SummaryViewModel {
  readonly bookingId: string;
  readonly bookingStatusLabel: string;
  readonly verificationStatusLabel: string;
  readonly renterName: string;
  readonly renterLicense: string;
  readonly renterAddress: string;
  readonly vehicleLabel: string;
  readonly depositDisplay: string;
  readonly rentalWindowDisplay: string;
  readonly createdAtDisplay: string;
  readonly rentalId?: string;
  readonly contractId?: string;
  readonly inspectionId?: string;
  readonly renterSignatureId?: string;
  readonly staffSignatureId?: string;
  readonly vehicleReceipt?: {
    readonly receivedAtDisplay: string;
    readonly receivedByStaffId?: string;
  };
}
export interface StepViewModel {
  readonly step: FulfillmentStepId;
  readonly title: string;
  readonly description: string;
  readonly status: FulfillmentStepState['status'];
  readonly isCurrent: boolean;
  readonly canPerform: boolean;
  readonly disabled: boolean;
  readonly errorMessage?: string;
  readonly completedAtDisplay?: string;
  readonly action: StepActionConfig;
  readonly artifactEntries: readonly StepArtifactEntry[];
}

export interface TimelineViewModel {
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  readonly actorLabel: string;
  readonly occurredAtDisplay: string;
  readonly metadataEntries: readonly { readonly label: string; readonly value: string }[];
}

export type StepActionConfig =
  | { readonly kind: 'button'; readonly label: string }
  | { readonly kind: 'contract' }
  | { readonly kind: 'inspection' }
  | { readonly kind: 'signature'; readonly role: 'renter' | 'staff' }
  | { readonly kind: 'vehicle' }
  | { readonly kind: 'none' };

export interface StepArtifactEntry {
  readonly label: string;
  readonly value: string;
}

export interface SummaryArtifacts {
  readonly rentalId?: string;
  readonly contractId?: string;
  readonly inspectionId?: string;
  readonly renterSignatureId?: string;
  readonly staffSignatureId?: string;
  readonly vehicleReceipt?: {
    readonly receivedAt?: string;
    readonly receivedByStaffId?: string;
  };
}

export interface StepDefinition {
  readonly title: string;
  readonly description: string;
  readonly action: StepActionConfig;
}

export const CONTRACT_PROVIDERS: readonly {
  readonly value: (typeof EsignProviderEnum)[keyof typeof EsignProviderEnum];
  readonly label: string;
}[] = [
  { value: EsignProviderEnum.Native, label: 'EV Rental eSign' },
  { value: EsignProviderEnum.Docusign, label: 'DocuSign' },
  { value: EsignProviderEnum.Adobesign, label: 'Adobe Sign' },
  { value: EsignProviderEnum.Signnow, label: 'SignNow' },
  { value: EsignProviderEnum.Other, label: 'Nhà cung cấp khác' },
] as const;

export const STEP_CONFIG: Readonly<Record<FulfillmentStepId, StepDefinition>> = {
  checkin: {
    title: 'Duyệt đặt xe',
    description: 'Xác nhận khách đã hoàn tất kiểm tra và cho phép tạo đơn thuê.',
    action: { kind: 'button', label: 'Xác nhận check-in booking' },
  },
  'create-rental': {
    title: 'Tạo đơn thuê',
    description: 'Tạo đơn thuê từ booking đã duyệt để bắt đầu quy trình bàn giao.',
    action: { kind: 'button', label: 'Tạo đơn thuê' },
  },
  'create-contract': {
    title: 'Phát hành hợp đồng',
    description: 'Khởi tạo hợp đồng điện tử cho đơn thuê và gửi tới các bên liên quan.',
    action: { kind: 'contract' },
  },
  inspection: {
    title: 'Ghi nhận kiểm tra xe',
    description: 'Thu thập thông tin kiểm tra xe trước khi bàn giao cho khách.',
    action: { kind: 'inspection' },
  },
  'sign-renter': {
    title: 'Khách ký hợp đồng',
    description: 'Lấy chữ ký số của khách thuê trên hợp đồng điện tử.',
    action: { kind: 'signature', role: 'renter' },
  },
  'sign-staff': {
    title: 'Nhân viên ký hợp đồng',
    description: 'Nhân viên xác nhận hợp đồng sau khi khách đã ký.',
    action: { kind: 'signature', role: 'staff' },
  },
  'vehicle-receive': {
    title: 'Xác nhận bàn giao xe',
    description: 'Ghi nhận thời điểm bàn giao xe và người phụ trách.',
    action: { kind: 'vehicle' },
  },
};
