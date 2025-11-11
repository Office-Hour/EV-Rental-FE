import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { RenterProfileDto, StaffService } from '../../../contract';

export interface StaffRenterRecord {
  readonly renterId: string;
  readonly name: string;
  readonly driverLicense?: string;
  readonly dateOfBirth?: string;
  readonly address?: string;
  readonly riskScore?: number;
}

@Injectable({ providedIn: 'root' })
export class RentersService {
  private readonly _staffService = inject(StaffService);

  private readonly _staffRenters = signal<StaffRenterRecord[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly staffRenters = this._staffRenters.asReadonly();
  readonly staffRentersLoading = this._loading.asReadonly();
  readonly staffRentersError = this._error.asReadonly();

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

      records.push({
        renterId,
        name,
        driverLicense: this._normalizeString(renter.driverLicenseNo),
        dateOfBirth: this._normalizeString(renter.dateOfBirth),
        address: this._normalizeString(renter.address),
        riskScore: typeof renter.riskScore === 'number' ? renter.riskScore : undefined,
      });
    }

    return records.sort((first, second) => first.name.localeCompare(second.name));
  }

  private _normalizeString(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private _resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unable to load renters. Please try again later.';
  }
}
