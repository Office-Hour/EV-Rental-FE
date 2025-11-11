import { inject, Injectable, signal } from '@angular/core';
import {
  BookingBriefDto,
  BookingService,
  StationDetailsDto,
  StationDetailsDtoApiResponse,
  StationDto,
  StationDtoPagedResultApiResponse,
  StationsService,
  VehicleDetailsDto,
  VehicleDetailsDtoApiResponse,
  VehicleDto,
} from '../../../contract';
import type { VehicleAtStationStatus as VehicleAtStationStatusType } from '../../../contract';
import { catchError, finalize, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';

type VehicleDetailsMap = Map<string, VehicleDetailsDto | undefined>;

type StationDetailsMap = Map<string, StationDetailsDto | undefined>;

interface StationVehicleSnapshot {
  readonly stationId: string;
  readonly stationName: string;
  readonly stationAddress?: string;
  readonly vehicleAtStationId?: string;
  readonly vehicleId?: string;
  readonly status?: VehicleAtStationStatusType;
  readonly currentBatteryCapacityKwh?: number;
  readonly startTime?: string;
  readonly endTime?: string | null;
}

export interface StaffVehicleRecord {
  readonly stationId: string;
  readonly stationName: string;
  readonly stationAddress?: string;
  readonly vehicleAtStationId?: string;
  readonly vehicleId?: string;
  readonly status?: VehicleAtStationStatusType;
  readonly currentBatteryCapacityKwh?: number;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly vehicleDetails?: VehicleDetailsDto;
  readonly upcomingBookings: readonly BookingBriefDto[];
}

@Injectable({ providedIn: 'root' })
export class VehiclesService {
  private readonly _stationsService = inject(StationsService);
  private readonly _bookingService = inject(BookingService);

  private readonly _staffVehicles = signal<StaffVehicleRecord[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly staffVehicles = this._staffVehicles.asReadonly();
  readonly staffVehiclesLoading = this._loading.asReadonly();
  readonly staffVehiclesError = this._error.asReadonly();

  loadStaffVehicles(): Observable<StaffVehicleRecord[]> {
    this._loading.set(true);
    this._error.set(null);

    return this._stationsService.apiStationsGet().pipe(
      switchMap((stationsResponse: StationDtoPagedResultApiResponse) => {
        const stationItems = stationsResponse.data?.items ?? [];
        const formattedStations = this._normalizeStations(stationItems);
        const stationIds = Array.from(formattedStations.keys());

        if (stationIds.length === 0) {
          const empty: StaffVehicleRecord[] = [];
          return of(empty);
        }

        return this._loadStationDetails(stationIds).pipe(
          switchMap((stationDetailsMap) => {
            const snapshots = this._buildVehicleSnapshots(formattedStations, stationDetailsMap);
            if (snapshots.length === 0) {
              const empty: StaffVehicleRecord[] = [];
              return of(empty);
            }

            const uniqueVehicleIds = this._collectVehicleIds(snapshots);
            if (uniqueVehicleIds.size === 0) {
              const records = this._mapSnapshotsToRecords(snapshots, new Map());
              return of(records);
            }

            return this._loadVehicleDetails(uniqueVehicleIds).pipe(
              map((vehicleDetailsMap) => this._mapSnapshotsToRecords(snapshots, vehicleDetailsMap)),
            );
          }),
        );
      }),
      tap((records) => {
        this._staffVehicles.set(records);
        this._error.set(null);
      }),
      catchError((error: unknown) => {
        this._error.set(this._resolveErrorMessage(error));
        const fallback = [...this._staffVehicles()];
        return of(fallback);
      }),
      finalize(() => {
        this._loading.set(false);
      }),
    );
  }

  private _loadStationDetails(stationIds: readonly string[]): Observable<StationDetailsMap> {
    const requests = stationIds.map((stationId) =>
      this._stationsService.apiStationsStationIdGet(stationId).pipe(
        map(
          (response: StationDetailsDtoApiResponse) =>
            [stationId, response.data ?? undefined] as const,
        ),
        catchError(() =>
          of<readonly [string, StationDetailsDto | undefined]>([stationId, undefined]),
        ),
      ),
    );

    if (requests.length === 0) {
      return of(new Map());
    }

    return forkJoin(requests).pipe(map((entries) => new Map(entries)));
  }

  private _loadVehicleDetails(vehicleIds: ReadonlySet<string>): Observable<VehicleDetailsMap> {
    const requests = Array.from(vehicleIds).map((vehicleId) =>
      this._bookingService.apiBookingVehiclesVehicleIdGet(vehicleId).pipe(
        map(
          (response: VehicleDetailsDtoApiResponse) =>
            [vehicleId, response.data ?? undefined] as const,
        ),
        catchError(() =>
          of<readonly [string, VehicleDetailsDto | undefined]>([vehicleId, undefined]),
        ),
      ),
    );

    if (requests.length === 0) {
      return of(new Map());
    }

    return forkJoin(requests).pipe(map((entries) => new Map(entries)));
  }

  private _normalizeStations(stations: readonly (StationDto | null)[]): Map<string, StationDto> {
    const result = new Map<string, StationDto>();

    for (const station of stations) {
      if (!station) {
        continue;
      }

      const stationId = this._normalizeString(station.id);
      if (!stationId) {
        continue;
      }

      result.set(stationId, {
        ...station,
        id: stationId,
        name: this._normalizeString(station.name) ?? `Station ${stationId.slice(-4)}`,
        address: this._normalizeString(station.address) ?? undefined,
      });
    }

    return result;
  }

  private _buildVehicleSnapshots(
    stations: Map<string, StationDto>,
    stationDetails: StationDetailsMap,
  ): StationVehicleSnapshot[] {
    const snapshots: StationVehicleSnapshot[] = [];

    for (const [stationId, stationInfo] of stations.entries()) {
      const details = stationDetails.get(stationId);
      const vehicles = details?.vehicles ?? [];

      for (const vehicle of vehicles ?? []) {
        snapshots.push(this._createSnapshot(stationInfo, vehicle));
      }
    }

    return snapshots;
  }

  private _createSnapshot(station: StationDto, vehicle: VehicleDto): StationVehicleSnapshot {
    return {
      stationId: station.id ?? '',
      stationName: station.name ?? `Station ${station.id?.slice(-4) ?? ''}`,
      stationAddress: station.address ?? undefined,
      vehicleAtStationId: this._normalizeString(vehicle.vehicleAtStationId) ?? undefined,
      vehicleId: this._normalizeString(vehicle.vehicleId) ?? undefined,
      status: vehicle.status,
      currentBatteryCapacityKwh: vehicle.currentBatteryCapacityKwh ?? undefined,
      startTime: this._normalizeString(vehicle.startTime) ?? undefined,
      endTime: this._normalizeString(vehicle.endTime ?? undefined) ?? undefined,
    } satisfies StationVehicleSnapshot;
  }

  private _collectVehicleIds(snapshots: readonly StationVehicleSnapshot[]): ReadonlySet<string> {
    const ids = new Set<string>();

    for (const snapshot of snapshots) {
      if (snapshot.vehicleId) {
        ids.add(snapshot.vehicleId);
      }
    }

    return ids;
  }

  private _mapSnapshotsToRecords(
    snapshots: readonly StationVehicleSnapshot[],
    vehicleDetailsMap: VehicleDetailsMap,
  ): StaffVehicleRecord[] {
    const records: StaffVehicleRecord[] = [];

    for (const snapshot of snapshots) {
      const detail = snapshot.vehicleId ? vehicleDetailsMap.get(snapshot.vehicleId) : undefined;
      const vehicleDetails = detail ? this._cloneVehicleDetails(detail) : undefined;
      const upcomingBookings = vehicleDetails?.upcomingBookings ?? [];

      records.push({
        stationId: snapshot.stationId,
        stationName: snapshot.stationName,
        stationAddress: snapshot.stationAddress,
        vehicleAtStationId: snapshot.vehicleAtStationId,
        vehicleId: snapshot.vehicleId,
        status: snapshot.status,
        currentBatteryCapacityKwh: snapshot.currentBatteryCapacityKwh,
        startTime: snapshot.startTime,
        endTime: snapshot.endTime ?? undefined,
        vehicleDetails,
        upcomingBookings,
      });
    }

    return records.sort((first, second) => this._compareRecords(first, second));
  }

  private _cloneVehicleDetails(detail: VehicleDetailsDto): VehicleDetailsDto {
    const safeBookings = this._sanitizeBookings(detail.upcomingBookings ?? []);
    return {
      ...detail,
      upcomingBookings: [...safeBookings],
    } satisfies VehicleDetailsDto;
  }

  private _sanitizeBookings(
    bookings: readonly (BookingBriefDto | null | undefined)[],
  ): BookingBriefDto[] {
    const results: BookingBriefDto[] = [];

    for (const booking of bookings) {
      if (!booking) {
        continue;
      }

      results.push({
        startDate: this._normalizeString(booking.startDate) ?? undefined,
        endDate: this._normalizeString(booking.endDate) ?? undefined,
        renterId: this._normalizeString(booking.renterId) ?? undefined,
        bookingId: this._normalizeString(booking.bookingId) ?? undefined,
      });
    }

    return results;
  }

  private _compareRecords(first: StaffVehicleRecord, second: StaffVehicleRecord): number {
    const stationComparison = first.stationName.localeCompare(second.stationName);
    if (stationComparison !== 0) {
      return stationComparison;
    }

    const firstDisplay = this._resolveVehicleDisplay(first);
    const secondDisplay = this._resolveVehicleDisplay(second);
    return firstDisplay.localeCompare(secondDisplay);
  }

  private _resolveVehicleDisplay(record: StaffVehicleRecord): string {
    const make = this._normalizeString(record.vehicleDetails?.make ?? undefined);
    const model = this._normalizeString(record.vehicleDetails?.model ?? undefined);
    const modelYear = record.vehicleDetails?.modelYear;
    const parts = [make, model, modelYear ? modelYear.toString() : undefined].filter(
      (value): value is string => !!value,
    );

    if (parts.length > 0) {
      return parts.join(' ');
    }

    if (record.vehicleAtStationId) {
      return `Vehicle ${this._shortenIdentifier(record.vehicleAtStationId)}`;
    }

    if (record.vehicleId) {
      return `Vehicle ${this._shortenIdentifier(record.vehicleId)}`;
    }

    return 'Vehicle';
  }

  private _shortenIdentifier(value: string): string {
    if (value.length <= 8) {
      return value;
    }

    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }

  private _normalizeString(value: string | null | undefined): string | undefined {
    if (value === null || value === undefined) {
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

    return 'Không thể tải danh sách xe. Vui lòng thử lại.';
  }
}
