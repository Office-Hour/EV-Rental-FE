import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import {
  ApiResponse,
  BookingService,
  KycType,
  RenterProfileDto,
  StaffService,
  UploadKycRequest,
} from '../../../contract';

type StaffKycType = (typeof KycType)[keyof typeof KycType] | 'unknown';

type KycStatusLevel = 'pending' | 'approved' | 'rejected' | 'unknown';

export interface StaffKycDocument {
  readonly type: StaffKycType;
  readonly label: string;
  readonly documentNumber?: string;
  readonly status?: string;
  readonly statusLevel: KycStatusLevel;
  readonly lastUpdated?: string;
}

export interface StaffRenterRecord {
  readonly renterId: string;
  readonly name: string;
  readonly driverLicense?: string;
  readonly dateOfBirth?: string;
  readonly address?: string;
  readonly riskScore?: number;
  readonly kycDocuments: readonly StaffKycDocument[];
}

const KYC_TYPE_LABELS: Record<StaffKycType, string> = {
  [KycType.DriverLicense]: 'Driver license',
  [KycType.NationalId]: 'National ID',
  [KycType.Passport]: 'Passport',
  [KycType.Other]: 'Other document',
  unknown: 'KYC document',
};

const KYC_TYPE_PRIORITY: readonly StaffKycType[] = [
  KycType.DriverLicense,
  KycType.NationalId,
  KycType.Passport,
  KycType.Other,
  'unknown',
];

const APPROVED_STATUS_KEYWORDS: readonly string[] = [
  'approved',
  'verified',
  'completed',
  'accepted',
  'success',
];

const PENDING_STATUS_KEYWORDS: readonly string[] = [
  'pending',
  'submitted',
  'processing',
  'review',
  'inprogress',
  'waiting',
];

const REJECTED_STATUS_KEYWORDS: readonly string[] = [
  'rejected',
  'failed',
  'declined',
  'denied',
  'invalid',
];

const KYC_SOURCE_KEYS: readonly string[] = [
  'kycDocuments',
  'kycs',
  'kycSummaries',
  'identityDocuments',
  'documents',
];

@Injectable({ providedIn: 'root' })
export class RentersService {
  private readonly _staffService = inject(StaffService);
  private readonly _bookingService = inject(BookingService);

  private readonly _staffRenters = signal<StaffRenterRecord[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly staffRenters = this._staffRenters.asReadonly();
  readonly staffRentersLoading = this._loading.asReadonly();
  readonly staffRentersError = this._error.asReadonly();

  forceUploadKyc(renterId: string): Observable<ApiResponse> {
    const payload: UploadKycRequest = {
      type: KycType.Other,
      documentNumber: renterId,
    };

    return this._bookingService.apiBookingUploadKycPost(payload);
  }

  loadStaffRenters(): Observable<StaffRenterRecord[]> {
    this._loading.set(true);
    this._error.set(null);

    return this._staffService.apiStaffRentersGet().pipe(
      map((response) => this._mapRenters(response.data ?? [])),
      tap((records) => {
        this._staffRenters.set(records);
        this._error.set(null);
      }),
      catchError((error: unknown) => {
        this._error.set(this._resolveErrorMessage(error));
        const fallback = [...this._staffRenters()];
        return of(fallback);
      }),
      finalize(() => {
        this._loading.set(false);
      }),
    );
  }

  private _mapRenters(renters: readonly (RenterProfileDto | null)[]): StaffRenterRecord[] {
    const records: StaffRenterRecord[] = [];

    for (const renter of renters) {
      if (!renter) {
        continue;
      }

      const renterId = this._normalizeString(renter.renterId);
      if (!renterId) {
        continue;
      }

      const name =
        this._normalizeString(renter.userName) ?? `Renter ${renterId.slice(-5).toUpperCase()}`;
      const driverLicense = this._normalizeString(renter.driverLicenseNo);
      const kycDocuments = this._extractKycDocuments(renter, driverLicense);

      records.push({
        renterId,
        name,
        driverLicense,
        dateOfBirth: this._normalizeString(renter.dateOfBirth),
        address: this._normalizeString(renter.address),
        riskScore: typeof renter.riskScore === 'number' ? renter.riskScore : undefined,
        kycDocuments,
      });
    }

    return records.sort((first, second) => first.name.localeCompare(second.name));
  }

  private _extractKycDocuments(
    renter: RenterProfileDto,
    driverLicense: string | undefined,
  ): StaffKycDocument[] {
    const sources = this._resolveKycSources(renter);
    const documents: StaffKycDocument[] = [];
    const seenKeys = new Set<string>();

    for (const item of sources) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const record = item as Record<string, unknown>;
      const type = this._normalizeKycType(
        record['type'] ?? record['kycType'] ?? record['documentType'] ?? record['name'],
      );
      const label = this._describeKycType(type);
      const documentNumber = this._firstNonEmptyString(
        record['documentNumber'],
        record['number'],
        record['identifier'],
        record['id'],
      );
      const statusText = this._firstNonEmptyString(
        record['status'],
        record['state'],
        record['verificationStatus'],
        record['result'],
      );
      const lastUpdated = this._firstNonEmptyString(
        record['lastUpdated'],
        record['updatedAt'],
        record['modifiedAt'],
        record['reviewedAt'],
        record['createdAt'],
      );
      const statusLevel = this._classifyKycStatus(statusText);
      const key = `${type}|${documentNumber ?? ''}|${statusText ?? ''}`;

      if (seenKeys.has(key)) {
        continue;
      }

      seenKeys.add(key);
      documents.push({
        type,
        label,
        documentNumber,
        status: statusText,
        statusLevel,
        lastUpdated,
      });
    }

    if (documents.length === 0 && driverLicense) {
      documents.push({
        type: KycType.DriverLicense,
        label: this._describeKycType(KycType.DriverLicense),
        documentNumber: driverLicense,
        status: undefined,
        statusLevel: 'unknown',
        lastUpdated: undefined,
      });
    }

    documents.sort((first, second) => this._compareKycDocuments(first, second));
    return documents;
  }

  private _resolveKycSources(renter: RenterProfileDto): unknown[] {
    const extended = renter as Record<string, unknown>;
    const collected: unknown[] = [];

    for (const key of KYC_SOURCE_KEYS) {
      const candidate = extended[key];
      if (!candidate) {
        continue;
      }

      if (Array.isArray(candidate)) {
        for (const entry of candidate) {
          collected.push(entry);
        }
        continue;
      }

      if (typeof candidate === 'object') {
        const dictionary = candidate as Record<string, unknown>;
        const values = Object.values(dictionary);
        for (const value of values) {
          collected.push(value);
        }
      }
    }

    return collected;
  }

  private _compareKycDocuments(first: StaffKycDocument, second: StaffKycDocument): number {
    const typePriority = this._kycTypePriority(first.type) - this._kycTypePriority(second.type);
    if (typePriority !== 0) {
      return typePriority;
    }

    const firstNumber = first.documentNumber ?? '';
    const secondNumber = second.documentNumber ?? '';
    const numberComparison = firstNumber.localeCompare(secondNumber);
    if (numberComparison !== 0) {
      return numberComparison;
    }

    const firstStatus = first.status ?? '';
    const secondStatus = second.status ?? '';
    return firstStatus.localeCompare(secondStatus);
  }

  private _kycTypePriority(type: StaffKycType): number {
    for (let index = 0; index < KYC_TYPE_PRIORITY.length; index += 1) {
      if (KYC_TYPE_PRIORITY[index] === type) {
        return index;
      }
    }

    return KYC_TYPE_PRIORITY.length;
  }

  private _normalizeKycType(value: unknown): StaffKycType {
    if (typeof value === 'number') {
      return this._normalizeKycType(String(value));
    }

    if (typeof value !== 'string') {
      return 'unknown';
    }

    const sanitized = this._sanitizeKeyword(value);

    if (sanitized.includes('driver') || sanitized.includes('license')) {
      return KycType.DriverLicense;
    }

    if (
      sanitized.includes('nationalid') ||
      sanitized.includes('citizen') ||
      sanitized.includes('cmnd') ||
      sanitized.includes('cccd')
    ) {
      return KycType.NationalId;
    }

    if (sanitized.includes('passport')) {
      return KycType.Passport;
    }

    if (sanitized.includes('other')) {
      return KycType.Other;
    }

    return 'unknown';
  }

  private _classifyKycStatus(statusText: string | undefined): KycStatusLevel {
    if (!statusText) {
      return 'unknown';
    }

    const sanitized = this._sanitizeKeyword(statusText);
    if (sanitized.length === 0) {
      return 'unknown';
    }

    if (this._includesKeyword(sanitized, APPROVED_STATUS_KEYWORDS)) {
      return 'approved';
    }

    if (this._includesKeyword(sanitized, REJECTED_STATUS_KEYWORDS)) {
      return 'rejected';
    }

    if (this._includesKeyword(sanitized, PENDING_STATUS_KEYWORDS)) {
      return 'pending';
    }

    return 'unknown';
  }

  private _sanitizeKeyword(value: string): string {
    const trimmed = value.trim().toLowerCase();
    let sanitized = '';

    for (let index = 0; index < trimmed.length; index += 1) {
      const character = trimmed.charAt(index);
      const isLetter = character >= 'a' && character <= 'z';
      if (isLetter) {
        sanitized += character;
      }
    }

    return sanitized;
  }

  private _includesKeyword(value: string, keywords: readonly string[]): boolean {
    for (const keyword of keywords) {
      if (value === keyword || value.includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  private _firstNonEmptyString(...values: unknown[]): string | undefined {
    for (const value of values) {
      const normalized = this._normalizeString(value);
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  private _describeKycType(type: StaffKycType): string {
    return KYC_TYPE_LABELS[type];
  }

  private _normalizeString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    return trimmed;
  }

  private _resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unable to load renters. Please try again later.';
  }
}
