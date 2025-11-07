import { inject, Injectable, signal } from '@angular/core';
import {
  BookingBriefDto,
  BookingService,
  ContractDto,
  RentalDetailsDto,
  RentalDetailsDtoListApiResponse,
  RenterProfileDto,
  RenterProfileDtoListApiResponse,
  StaffService,
  VehicleDetailsDto,
  VehicleDetailsDtoApiResponse,
  VehicleDto,
} from '../../../contract';
import type { RentalStatus } from '../../../contract';
import { catchError, finalize, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';

export interface StaffRentalRecord {
  readonly rentalId: string;
  readonly bookingId?: string;
  readonly status?: RentalStatus;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly ratedAt?: string;
  readonly score?: number;
  readonly comment?: string;
  readonly vehicleId?: string;
  readonly vehicle?: VehicleDto;
  readonly booking?: BookingBriefDto;
  readonly renterId?: string;
  readonly renterProfile?: RenterProfileDto;
  readonly vehicleDetails?: VehicleDetailsDto;
  readonly contracts?: readonly ContractDto[];
}

type VehicleDetailsMap = Map<string, VehicleDetailsDto | undefined>;

@Injectable({ providedIn: 'root' })
export class RentalsService {
  private readonly _staffService = inject(StaffService);
  private readonly _bookingService = inject(BookingService);

  private readonly _staffRentals = signal<StaffRentalRecord[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly staffRentals = this._staffRentals.asReadonly();
  readonly staffRentalsLoading = this._loading.asReadonly();
  readonly staffRentalsError = this._error.asReadonly();

  loadStaffRentals(): Observable<StaffRentalRecord[]> {
    this._loading.set(true);
    this._error.set(null);

    return forkJoin({
      rentalsResponse: this._staffService.apiStaffRentalsGet(),
      rentersResponse: this._staffService.apiStaffRentersGet(),
    }).pipe(
      switchMap(
        ({
          rentalsResponse,
          rentersResponse,
        }: {
          rentalsResponse: RentalDetailsDtoListApiResponse;
          rentersResponse: RenterProfileDtoListApiResponse;
        }) => {
          const rentalItems = rentalsResponse.data ?? [];
          const renterItems = rentersResponse.data ?? [];

          const vehicleIds = this._collectVehicleIds(rentalItems);
          if (vehicleIds.size === 0) {
            const records = this._mapStaffRentals(
              rentalItems,
              renterItems,
              new Map<string, VehicleDetailsDto | undefined>(),
            );
            return of(records);
          }

          const vehicleDetailRequests = Array.from(vehicleIds).map((vehicleId) =>
            this._bookingService.apiBookingVehiclesVehicleIdGet(vehicleId).pipe(
              map(
                (vehicleDetailResponse: VehicleDetailsDtoApiResponse) =>
                  [vehicleId, vehicleDetailResponse.data ?? undefined] as const,
              ),
              catchError(() =>
                of<readonly [string, VehicleDetailsDto | undefined]>([vehicleId, undefined]),
              ),
            ),
          );

          return forkJoin(vehicleDetailRequests).pipe(
            map((vehicles) => new Map<string, VehicleDetailsDto | undefined>(vehicles)),
            map((vehicleDetailsMap) =>
              this._mapStaffRentals(rentalItems, renterItems, vehicleDetailsMap),
            ),
          );
        },
      ),
      tap((records) => {
        this._staffRentals.set(records);
        this._error.set(null);
      }),
      catchError((error: unknown) => {
        this._error.set(this._resolveErrorMessage(error));
        const previousRecords = [...this._staffRentals()];
        return of<StaffRentalRecord[]>(previousRecords);
      }),
      finalize(() => {
        this._loading.set(false);
      }),
    );
  }

  private _mapStaffRentals(
    rentalDtos: readonly RentalDetailsDto[],
    renterDtos: readonly RenterProfileDto[],
    vehicleDetailsMap: VehicleDetailsMap,
  ): StaffRentalRecord[] {
    const renterById = new Map<string, RenterProfileDto>();
    for (const renter of renterDtos ?? []) {
      const renterId = this._normalizeString(renter?.renterId);
      if (renterId) {
        renterById.set(renterId, renter);
      }
    }

    const records: StaffRentalRecord[] = [];

    for (const rental of rentalDtos ?? []) {
      const rentalId = this._normalizeString(rental?.rentalId);
      if (!rentalId) {
        continue;
      }

      const bookingId = this._normalizeString(rental.bookingId ?? rental.booking?.bookingId);
      const renterId = this._normalizeString(rental.booking?.renterId);
      const vehicleId = this._normalizeString(rental.vehicleId ?? rental.vehicle?.vehicleId);
      const vehicleDetails = vehicleId ? vehicleDetailsMap.get(vehicleId) : undefined;

      const contracts = rental.contracts?.filter((contract): contract is ContractDto => !!contract);

      records.push({
        rentalId,
        bookingId,
        status: rental.status,
        startTime: this._normalizeString(rental.startTime ?? rental.booking?.startDate),
        endTime: this._normalizeString(rental.endTime ?? rental.booking?.endDate),
        ratedAt: this._normalizeString(rental.ratedAt),
        score: rental.score ?? undefined,
        comment: this._normalizeString(rental.comment ?? undefined),
        vehicleId,
        vehicle: rental.vehicle,
        booking: rental.booking,
        renterId,
        renterProfile: renterId ? renterById.get(renterId) : undefined,
        vehicleDetails,
        contracts: contracts && contracts.length > 0 ? contracts : undefined,
      });
    }

    return records.sort((a, b) => this._compareByDateDesc(a.startTime, b.startTime));
  }

  private _collectVehicleIds(rentals: readonly RentalDetailsDto[]): Set<string> {
    const ids = new Set<string>();

    for (const rental of rentals ?? []) {
      const vehicleId = this._normalizeString(rental?.vehicle?.vehicleId ?? rental?.vehicleId);
      if (vehicleId) {
        ids.add(vehicleId);
      }
    }

    return ids;
  }

  private _normalizeString(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private _compareByDateDesc(first?: string, second?: string): number {
    const firstTime = first ? Date.parse(first) : Number.NaN;
    const secondTime = second ? Date.parse(second) : Number.NaN;
    const safeFirst = Number.isNaN(firstTime) ? 0 : firstTime;
    const safeSecond = Number.isNaN(secondTime) ? 0 : secondTime;
    return safeSecond - safeFirst;
  }

  private _resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string' && error.length > 0) {
      return error;
    }

    return 'Không thể tải danh sách đơn thuê. Vui lòng thử lại.';
  }
}
