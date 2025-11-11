import { inject, Injectable, signal } from '@angular/core';
import {
  BookingBriefDto,
  StaffService,
  VehicleDetailsDto,
  VehicleDetailsDtoListApiResponse,
} from '../../../contract';
import type { VehicleAtStationStatus } from '../../../contract';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';

export interface StaffVehicleRecord {
  readonly vehicleId?: string;
  readonly vehicleAtStationId?: string;
  readonly stationId: string;
  readonly stationName: string;
  readonly stationAddress?: string;
  readonly status?: VehicleAtStationStatus;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly currentBatteryCapacityKwh?: number;
  readonly vehicleDetails?: VehicleDetailsDto;
  readonly upcomingBookings: readonly BookingBriefDto[];
}

@Injectable({ providedIn: 'root' })
export class VehiclesService {
  private readonly _staffService = inject(StaffService);

  private readonly _staffVehicles = signal<StaffVehicleRecord[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly staffVehicles = this._staffVehicles.asReadonly();
  readonly staffVehiclesLoading = this._loading.asReadonly();
  readonly staffVehiclesError = this._error.asReadonly();

  loadStaffVehicles(): Observable<StaffVehicleRecord[]> {
    this._loading.set(true);
    this._error.set(null);

    return this._staffService.apiStaffVehiclesGet().pipe(
      map((response: VehicleDetailsDtoListApiResponse) => response.data ?? []),
      map((vehicles) => this._mapStaffVehicles(vehicles)),
      tap((records) => {
        this._staffVehicles.set(records);
        this._error.set(null);
      }),
      catchError((error: unknown) => {
        this._error.set(this._resolveErrorMessage(error));
        const previous = [...this._staffVehicles()];
        return of(previous);
      }),
      finalize(() => this._loading.set(false)),
    );
  }

  private _mapStaffVehicles(vehicleDtos: readonly VehicleDetailsDto[]): StaffVehicleRecord[] {
    const records: StaffVehicleRecord[] = [];

    for (const vehicleDto of vehicleDtos ?? []) {
      if (!vehicleDto) {
        continue;
      }

      const vehicleId = this._normalizeString(vehicleDto.vehicleId);
      const vehicleAtStationId = this._normalizeString(vehicleDto.vehicleAtStationId);
      const stationId =
        this._readExtraField(vehicleDto, 'stationId') ??
        this._extractStationId(vehicleAtStationId) ??
        '__unknown_station__';

      const stationName =
        this._readExtraField(vehicleDto, 'stationName') ?? this._fallbackStationName(stationId);

      const stationAddress = this._readExtraField(vehicleDto, 'stationAddress');

      const startTime =
        this._readExtraField(vehicleDto, 'startTime') ??
        this._readExtraField(vehicleDto, 'currentRentalStart') ??
        this._readExtraField(vehicleDto, 'currentStartTime');

      const endTime =
        this._readExtraField(vehicleDto, 'endTime') ??
        this._readExtraField(vehicleDto, 'currentRentalEnd') ??
        this._readExtraField(vehicleDto, 'currentEndTime');

      records.push({
        vehicleId,
        vehicleAtStationId,
        stationId,
        stationName,
        stationAddress: stationAddress ?? undefined,
        status: vehicleDto.status ?? undefined,
        startTime,
        endTime,
        currentBatteryCapacityKwh: vehicleDto.currentBatteryCapacityKwh ?? undefined,
        vehicleDetails: vehicleDto,
        upcomingBookings: this._mapUpcomingBookings(vehicleDto.upcomingBookings),
      });
    }

    return records.sort((first, second) => {
      const stationCompare = first.stationName.localeCompare(second.stationName);
      if (stationCompare !== 0) {
        return stationCompare;
      }

      const firstLabel = first.vehicleAtStationId ?? first.vehicleId ?? '';
      const secondLabel = second.vehicleAtStationId ?? second.vehicleId ?? '';
      return firstLabel.localeCompare(secondLabel);
    });
  }

  private _mapUpcomingBookings(
    values: readonly BookingBriefDto[] | null | undefined,
  ): readonly BookingBriefDto[] {
    if (!values || values.length === 0) {
      return [];
    }

    const bookings: BookingBriefDto[] = [];
    for (const booking of values) {
      if (!booking) {
        continue;
      }
      const startDate = this._normalizeString(booking.startDate ?? undefined);
      const endDate = this._normalizeString(booking.endDate ?? undefined);
      const renterId = this._normalizeString(booking.renterId ?? undefined);
      const bookingId = this._normalizeString(booking.bookingId ?? undefined);

      bookings.push({
        startDate,
        endDate,
        renterId,
        bookingId,
      });
    }

    return bookings;
  }

  private _readExtraField(source: VehicleDetailsDto, key: string): string | undefined {
    const rawValue = (source as Record<string, unknown>)[key];
    if (typeof rawValue === 'string') {
      return this._normalizeString(rawValue);
    }
    return undefined;
  }

  private _extractStationId(vehicleAtStationId?: string): string | undefined {
    if (!vehicleAtStationId) {
      return undefined;
    }

    const normalized = vehicleAtStationId.trim();
    if (normalized.length === 0) {
      return undefined;
    }

    const separators = [':', '_', '-'];
    for (const separator of separators) {
      const [maybeStation] = normalized.split(separator);
      if (maybeStation && maybeStation.length > 0 && maybeStation !== normalized) {
        return maybeStation;
      }
    }

    return undefined;
  }

  private _fallbackStationName(stationId: string): string {
    if (!stationId || stationId === '__unknown_station__') {
      return 'Unknown station';
    }
    return `Station ${this._shortenIdentifier(stationId)}`;
  }

  private _normalizeString(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private _shortenIdentifier(value: string): string {
    if (value.length <= 8) {
      return value;
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }

  private _resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string' && error.length > 0) {
      return error;
    }

    return 'Không thể tải danh sách xe. Vui lòng thử lại.';
  }
}
