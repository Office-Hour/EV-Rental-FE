import { inject, Injectable, signal } from '@angular/core';
import {
  BookingBriefDto,
  BookingDetailsDto,
  BookingDetailsDtoListApiResponse,
  ContractDto,
  RentalDetailsDto,
  RentalDetailsDtoListApiResponse,
  RentalService,
  RenterProfileDto,
  RenterProfileDtoListApiResponse,
  StaffService,
  VehicleDetailsDto,
  VehicleDetailsDtoListApiResponse,
  VehicleDto,
} from '../../../contract';
import type {
  BookingStatus,
  BookingVerificationStatus,
  RentalDetailsDtoApiResponse,
  RentalStatus,
} from '../../../contract';
import { catchError, finalize, forkJoin, map, Observable, of, tap } from 'rxjs';

export interface StaffRentalRecord {
  readonly rentalId: string;
  readonly bookingId?: string;
  readonly status?: RentalStatus;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly bookingCreatedAt?: string;
  readonly ratedAt?: string;
  readonly score?: number;
  readonly comment?: string;
  readonly vehicleId?: string;
  readonly vehicle?: VehicleDto;
  readonly booking?: BookingBriefDto;
  readonly bookingDetails?: BookingDetailsDto;
  readonly bookingStatus?: BookingStatus;
  readonly bookingVerificationStatus?: BookingVerificationStatus;
  readonly verifiedAt?: string;
  readonly verifiedByStaffId?: string;
  readonly cancelReason?: string;
  readonly renterId?: string;
  readonly renterProfile?: RenterProfileDto;
  readonly vehicleDetails?: VehicleDetailsDto;
  readonly contracts?: readonly ContractDto[];
}

type VehicleDetailsMap = Map<string, VehicleDetailsDto | undefined>;

@Injectable({ providedIn: 'root' })
export class RentalsService {
  private readonly _staffService = inject(StaffService);
  private readonly _rentalService = inject(RentalService);
  private readonly _staffRentals = signal<StaffRentalRecord[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly staffRentals = this._staffRentals.asReadonly();
  readonly staffRentalsLoading = this._loading.asReadonly();
  readonly staffRentalsError = this._error.asReadonly();

  getRental(rentalId: string): Observable<RentalDetailsDto> {
    return this._rentalService
      .apiRentalRentalIdGet(rentalId)
      .pipe(
        map((response: RentalDetailsDtoApiResponse) => response.data ?? ({} as RentalDetailsDto)),
      );
  }

  loadStaffRentals(): Observable<StaffRentalRecord[]> {
    this._loading.set(true);
    this._error.set(null);

    return forkJoin({
      rentalsResponse: this._staffService.apiStaffRentalsGet(),
      bookingsResponse: this._staffService
        .apiStaffBookingsGet()
        .pipe(catchError(() => of<BookingDetailsDtoListApiResponse>({ data: [] }))),
      rentersResponse: this._staffService
        .apiStaffRentersGet()
        .pipe(catchError(() => of<RenterProfileDtoListApiResponse>({ data: [] }))),
      vehiclesResponse: this._staffService
        .apiStaffVehiclesGet()
        .pipe(catchError(() => of<VehicleDetailsDtoListApiResponse>({ data: [] }))),
    }).pipe(
      map(
        ({
          rentalsResponse,
          bookingsResponse,
          rentersResponse,
          vehiclesResponse,
        }: {
          rentalsResponse: RentalDetailsDtoListApiResponse;
          bookingsResponse: BookingDetailsDtoListApiResponse;
          rentersResponse: RenterProfileDtoListApiResponse;
          vehiclesResponse: VehicleDetailsDtoListApiResponse;
        }) => {
          const rentalItems = rentalsResponse.data ?? [];
          const bookingItems = bookingsResponse.data ?? [];
          const renterItems = rentersResponse.data ?? [];
          const vehicleItems = vehiclesResponse.data ?? [];

          const vehicleDetailsMap = this._mapVehicleDetails(vehicleItems);

          return this._mapStaffRentals(rentalItems, bookingItems, renterItems, vehicleDetailsMap);
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

  private _mapVehicleDetails(vehicleDtos: readonly VehicleDetailsDto[]): VehicleDetailsMap {
    const map = new Map<string, VehicleDetailsDto | undefined>();

    for (const vehicle of vehicleDtos ?? []) {
      const vehicleId = this._normalizeString(vehicle?.vehicleId);
      if (!vehicleId) {
        continue;
      }

      map.set(vehicleId, vehicle ?? undefined);
    }

    return map;
  }

  private _mapStaffRentals(
    rentalDtos: readonly RentalDetailsDto[],
    bookingDtos: readonly BookingDetailsDto[],
    renterDtos: readonly RenterProfileDto[],
    vehicleDetailsMap: VehicleDetailsMap,
  ): StaffRentalRecord[] {
    const bookingById = new Map<string, BookingDetailsDto>();
    for (const booking of bookingDtos ?? []) {
      const bookingId = this._normalizeString(booking?.bookingId);
      if (!bookingId) {
        continue;
      }

      bookingById.set(bookingId, booking);
    }

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
      const bookingDetails = bookingId ? bookingById.get(bookingId) : undefined;
      const renterId =
        this._normalizeString(rental.booking?.renterId) ??
        this._normalizeString(bookingDetails?.renterId);
      const vehicleId = this._normalizeString(rental.vehicleId ?? rental.vehicle?.vehicleId);
      const vehicleDetails = vehicleId ? vehicleDetailsMap.get(vehicleId) : undefined;

      const contracts = rental.contracts?.filter((contract): contract is ContractDto => !!contract);

      records.push({
        rentalId,
        bookingId,
        status: rental.status,
        startTime:
          this._normalizeString(rental.startTime) ??
          this._normalizeString(bookingDetails?.startTime) ??
          this._normalizeString(rental.booking?.startDate),
        endTime:
          this._normalizeString(rental.endTime) ??
          this._normalizeString(bookingDetails?.endTime) ??
          this._normalizeString(rental.booking?.endDate),
        bookingCreatedAt: this._normalizeString(bookingDetails?.bookingCreatedAt),
        ratedAt: this._normalizeString(rental.ratedAt),
        score: rental.score ?? undefined,
        comment: this._normalizeString(rental.comment ?? undefined),
        vehicleId,
        vehicle: rental.vehicle,
        booking: rental.booking,
        bookingDetails,
        bookingStatus: bookingDetails?.status ?? undefined,
        bookingVerificationStatus: bookingDetails?.verificationStatus ?? undefined,
        verifiedAt: this._normalizeString(bookingDetails?.verifiedAt ?? undefined),
        verifiedByStaffId: this._normalizeString(bookingDetails?.verifiedByStaffId ?? undefined),
        cancelReason: this._normalizeString(bookingDetails?.cancelReason ?? undefined),
        renterId,
        renterProfile: renterId ? renterById.get(renterId) : undefined,
        vehicleDetails,
        contracts: contracts && contracts.length > 0 ? contracts : undefined,
      });
    }

    return records.sort((a, b) => this._compareByDateDesc(a.startTime, b.startTime));
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
