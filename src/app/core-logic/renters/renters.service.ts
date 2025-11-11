import { inject, Injectable, signal } from '@angular/core';
import { RenterProfileDto, RenterProfileDtoListApiResponse, StaffService } from '../../../contract';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';

export interface StaffRenterRecord {
  readonly renterId: string;
  readonly userName?: string;
  readonly driverLicenseNo?: string;
  readonly dateOfBirth?: string;
  readonly address?: string;
  readonly riskScore?: number;
}

@Injectable({ providedIn: 'root' })
export class RentersService {
  private readonly _staffService = inject(StaffService);

  private readonly _renters = signal<StaffRenterRecord[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly staffRenters = this._renters.asReadonly();
  readonly staffRentersLoading = this._loading.asReadonly();
  readonly staffRentersError = this._error.asReadonly();

  loadStaffRenters(): Observable<StaffRenterRecord[]> {
    this._loading.set(true);
    this._error.set(null);

    return this._staffService.apiStaffRentersGet().pipe(
      map((response: RenterProfileDtoListApiResponse) => {
        const renterItems = response.data ?? [];
        return this._mapRenters(renterItems);
      }),
      tap((records) => {
        this._renters.set(records);
        this._error.set(null);
      }),
      catchError((error: unknown) => {
        this._error.set(this._resolveErrorMessage(error));
        const fallback = [...this._renters()];
        return of(fallback);
      }),
      finalize(() => {
        this._loading.set(false);
      }),
    );
  }

  private _mapRenters(
    renters: readonly (RenterProfileDto | null | undefined)[],
  ): StaffRenterRecord[] {
    const records: StaffRenterRecord[] = [];

    for (const renter of renters) {
      if (!renter) {
        continue;
      }

      const renterId = this._normalizeString(renter.renterId);
      if (!renterId) {
        continue;
      }

      records.push({
        renterId,
        userName: this._normalizeString(renter.userName ?? undefined),
        driverLicenseNo: this._normalizeString(renter.driverLicenseNo ?? undefined),
        dateOfBirth: this._normalizeString(renter.dateOfBirth ?? undefined),
        address: this._normalizeString(renter.address ?? undefined),
        riskScore: renter.riskScore ?? undefined,
      });
    }

    return records.sort((first, second) => first.renterId.localeCompare(second.renterId));
  }

  private _normalizeString(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private _resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string' && error.length > 0) {
      return error;
    }

    return 'Không thể tải danh sách khách thuê. Vui lòng thử lại sau.';
  }
}
