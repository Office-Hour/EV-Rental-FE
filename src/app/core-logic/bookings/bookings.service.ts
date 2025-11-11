import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import type {
  ApiResponse,
  BookingStatus,
  BookingVerificationStatus,
  CancelCheckinRequest,
  CreateBookingRequest,
  DepositFeeDtoApiResponse,
  RenterProfileDtoApiResponse,
} from '../../../contract';
import {
  BookingDetailsDto,
  BookingDetailsDtoListApiResponse,
  BookingService,
  BookingStatus as BookingStatusEnum,
  RentalDetailsDto,
  RentalDetailsDtoListApiResponse,
  RentalService,
  RenterProfileDto,
  RenterProfileDtoListApiResponse,
  StaffService,
  VehicleDetailsDto,
  VehicleDetailsDtoApiResponse,
} from '../../../contract';

export interface StaffBookingRecord {
  readonly bookingId: string;
  readonly renterId?: string;
  readonly status?: BookingStatus;
  readonly verificationStatus?: BookingVerificationStatus;
  readonly bookingCreatedAt?: string;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly vehicleAtStationId?: string;
  readonly verifiedAt?: string;
  readonly verifiedByStaffId?: string;
  readonly cancelReason?: string;
  readonly renterProfile?: RenterProfileDto;
  readonly rental?: RentalDetailsDto;
  readonly vehicleDetails?: VehicleDetailsDto;
}

type VehicleDetailsMap = Map<string, VehicleDetailsDto | undefined>;

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private readonly _bookingService = inject(BookingService);
  private readonly _staffService = inject(StaffService);
  private readonly _rentalService = inject(RentalService);
  private readonly _staffBookings = signal<StaffBookingRecord[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly staffBookings = this._staffBookings.asReadonly();
  readonly staffBookingsLoading = this._loading.asReadonly();
  readonly staffBookingsError = this._error.asReadonly();

  cancelCheckinBooking(
    cancelCheckinRequest: CancelCheckinRequest,
  ): Observable<DepositFeeDtoApiResponse> {
    return this._bookingService.apiBookingCancelPost(cancelCheckinRequest);
  }

  createBooking(booking: CreateBookingRequest): Observable<ApiResponse> {
    return this._bookingService.apiBookingPost(booking);
  }

  getRenterProfile(renterId: string): Observable<RenterProfileDto> {
    return this._bookingService
      .apiBookingRenterProfileGet(renterId)
      .pipe(
        map((response: RenterProfileDtoApiResponse) => response.data ?? ({} as RenterProfileDto)),
      );
  }

  loadStaffBookings(): Observable<StaffBookingRecord[]> {
    this._loading.set(true);
    this._error.set(null);

    return forkJoin({
      bookingsResponse: this._staffService.apiStaffBookingsGet(),
      rentersResponse: this._staffService.apiStaffRentersGet(),
    }).pipe(
      switchMap(
        ({
          bookingsResponse,
          rentersResponse,
        }: {
          bookingsResponse: BookingDetailsDtoListApiResponse;
          rentersResponse: RenterProfileDtoListApiResponse;
        }) => {
          const bookingItems = bookingsResponse.data ?? [];
          const renterItems = rentersResponse.data ?? [];

          if (!this._shouldFetchRentals(bookingItems)) {
            const records = this._mapStaffBookings(
              bookingItems,
              [],
              renterItems,
              new Map<string, VehicleDetailsDto | undefined>(),
            );
            return of(records);
          }

          return this._fetchRentalsWithVehicleDetails(bookingItems, renterItems);
        },
      ),
      tap((records) => {
        this._staffBookings.set(records);
        this._error.set(null);
      }),
      catchError((error: unknown) => {
        this._error.set(this._resolveErrorMessage(error));
        const previousRecords = [...this._staffBookings()];
        return of<StaffBookingRecord[]>(previousRecords);
      }),
      finalize(() => {
        this._loading.set(false);
      }),
    );
  }

  /**
   * Get bookings for a renter (customer view)
   */
  getBookings(
    renterId: string,
    pageNumber?: number,
    pageSize?: number,
  ): Observable<BookingDetailsDto[]> {
    return this._bookingService.apiBookingGet(renterId, pageNumber, pageSize).pipe(
      map((response) => response.data?.items ?? []),
      catchError(() => of<BookingDetailsDto[]>([])),
    );
  }

  private _fetchRentalsWithVehicleDetails(
    bookingDtos: readonly BookingDetailsDto[],
    renterDtos: readonly RenterProfileDto[],
  ): Observable<StaffBookingRecord[]> {
    return this._staffService.apiStaffRentalsGet().pipe(
      switchMap((rentalsResponse: RentalDetailsDtoListApiResponse) => {
        const rentalItems = rentalsResponse.data ?? [];
        const vehicleIds = this._collectVehicleIds(rentalItems);

        if (vehicleIds.size === 0) {
          const records = this._mapStaffBookings(
            bookingDtos,
            rentalItems,
            renterDtos,
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
            this._mapStaffBookings(bookingDtos, rentalItems, renterDtos, vehicleDetailsMap),
          ),
        );
      }),
      catchError(() => {
        const fallbackRecords = this._mapStaffBookings(
          bookingDtos,
          [],
          renterDtos,
          new Map<string, VehicleDetailsDto | undefined>(),
        );
        return of(fallbackRecords);
      }),
    );
  }

  private _shouldFetchRentals(bookings: readonly BookingDetailsDto[]): boolean {
    return bookings.some((booking) => booking?.status === BookingStatusEnum.RentalCreated);
  }

  private _mapStaffBookings(
    bookingDtos: readonly BookingDetailsDto[],
    rentalDtos: readonly RentalDetailsDto[],
    renterDtos: readonly RenterProfileDto[],
    vehicleDetailsMap: VehicleDetailsMap,
  ): StaffBookingRecord[] {
    const rentalByBookingId = new Map<string, RentalDetailsDto>();
    for (const rentalDto of rentalDtos ?? []) {
      if (!rentalDto) {
        continue;
      }

      const bookingId = this._normalizeString(rentalDto.bookingId ?? rentalDto.booking?.bookingId);
      if (!bookingId) {
        continue;
      }

      rentalByBookingId.set(bookingId, rentalDto);
    }

    const renterById = new Map<string, RenterProfileDto>();
    for (const renter of renterDtos ?? []) {
      if (!renter?.renterId) {
        continue;
      }
      renterById.set(renter.renterId, renter);
    }

    const records: StaffBookingRecord[] = [];

    for (const booking of bookingDtos ?? []) {
      if (!booking?.bookingId) {
        continue;
      }

      const bookingId = booking.bookingId;
      const rental = rentalByBookingId.get(bookingId);
      const renterProfile = booking.renterId ? renterById.get(booking.renterId) : undefined;
      const vehicleDetails = this._resolveVehicleDetails(rental, vehicleDetailsMap);

      records.push({
        bookingId,
        renterId: this._normalizeString(booking.renterId),
        status: booking.status,
        verificationStatus: booking.verificationStatus,
        bookingCreatedAt: this._normalizeString(booking.bookingCreatedAt),
        startTime: this._normalizeString(booking.startTime),
        endTime: this._normalizeString(booking.endTime),
        vehicleAtStationId: this._normalizeString(booking.vehicleAtStationId),
        verifiedAt: this._normalizeString(booking.verifiedAt),
        verifiedByStaffId: this._normalizeString(booking.verifiedByStaffId),
        cancelReason: this._normalizeString(booking.cancelReason),
        renterProfile,
        rental,
        vehicleDetails,
      });
    }

    return records.sort((a, b) => this._compareByDateDesc(a.bookingCreatedAt, b.bookingCreatedAt));
  }

  private _resolveVehicleDetails(
    rental: RentalDetailsDto | undefined,
    vehicleDetailsMap: VehicleDetailsMap,
  ): VehicleDetailsDto | undefined {
    if (!rental) {
      return undefined;
    }

    const vehicleId = this._normalizeString(rental.vehicle?.vehicleId ?? rental.vehicleId);
    if (!vehicleId) {
      return undefined;
    }

    return vehicleDetailsMap.get(vehicleId);
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

    return 'Không thể tải danh sách đặt xe. Vui lòng thử lại.';
  }
}
