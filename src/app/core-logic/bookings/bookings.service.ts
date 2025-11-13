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
  BookingVerificationStatus as BookingVerificationStatusEnum,
  ContractDto,
  RentalDetailsDto,
  RentalDetailsDtoListApiResponse,
  RentalService,
  RenterProfileDto,
  RenterProfileDtoListApiResponse,
  StaffService,
  VehicleDetailsDto,
  VehicleDetailsDtoApiResponse,
} from '../../../contract';
import {
  BookingFulfillmentSummary,
  FulfillmentTimelineEvent,
} from '../rental-fulfillment/fulfillment.types';

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
  private readonly _bookingIndex = new Map<string, StaffBookingRecord>();

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
        this._rebuildBookingIndex(records);
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

  loadBookingFulfillmentSummary(
    bookingId: string,
    options?: { readonly forceRefresh?: boolean },
  ): Observable<BookingFulfillmentSummary | undefined> {
    const normalizedId = this._normalizeString(bookingId);
    if (!normalizedId) {
      return of(undefined);
    }

    const cachedRecord = this._bookingIndex.get(normalizedId);
    if (cachedRecord && !options?.forceRefresh) {
      return of(this._toFulfillmentSummary(cachedRecord));
    }

    return this._fetchBookingRecord(normalizedId).pipe(
      tap((record) => {
        if (record) {
          this._upsertBookingRecord(record);
          return;
        }

        this._removeBookingRecord(normalizedId);
      }),
      map((record) => (record ? this._toFulfillmentSummary(record) : undefined)),
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

  private _fetchBookingRecord(bookingId: string): Observable<StaffBookingRecord | undefined> {
    return this._staffService.apiStaffBookingsGet().pipe(
      map((response: BookingDetailsDtoListApiResponse) => response.data ?? []),
      map((bookings) =>
        bookings.find((booking) => this._normalizeString(booking.bookingId) === bookingId),
      ),
      switchMap((booking) => {
        if (!booking) {
          return of(undefined);
        }

        const bookingIdentifier = this._normalizeString(booking.bookingId) ?? bookingId;
        const renterId = this._normalizeString(booking.renterId);

        const renter$ = renterId
          ? this._bookingService.apiBookingRenterProfileGet(renterId).pipe(
              map((response: RenterProfileDtoApiResponse) => response.data ?? undefined),
              catchError(() => of(undefined)),
            )
          : of(undefined);

        const rental$ = renterId
          ? this._rentalService.apiRentalByRenterGet(renterId).pipe(
              map((response) => response.data?.items ?? []),
              map((items) =>
                items.find((item) => this._normalizeString(item.bookingId) === bookingIdentifier),
              ),
              switchMap((match) => {
                const rentalId = this._normalizeString(match?.rentalId);
                if (!rentalId) {
                  return of(undefined);
                }

                return this._rentalService.apiRentalRentalIdGet(rentalId).pipe(
                  map((response) => response.data ?? undefined),
                  catchError(() => of(undefined)),
                );
              }),
              catchError(() => of(undefined)),
            )
          : of(undefined);

        return forkJoin({ renter: renter$, rental: rental$ }).pipe(
          switchMap(({ renter, rental }) => {
            const vehicleId = this._normalizeString(
              rental?.vehicle?.vehicleId ?? rental?.vehicleId,
            );
            const vehicle$ = vehicleId
              ? this._bookingService.apiBookingVehiclesVehicleIdGet(vehicleId).pipe(
                  map((response: VehicleDetailsDtoApiResponse) => response.data ?? undefined),
                  catchError(() => of(undefined)),
                )
              : of(undefined);

            return vehicle$.pipe(
              map(
                (vehicle) =>
                  ({
                    bookingId: bookingIdentifier,
                    renterId,
                    status: booking.status,
                    verificationStatus: booking.verificationStatus,
                    bookingCreatedAt: this._normalizeString(booking.bookingCreatedAt),
                    startTime: this._normalizeString(booking.startTime),
                    endTime: this._normalizeString(booking.endTime),
                    vehicleAtStationId: this._normalizeString(booking.vehicleAtStationId),
                    verifiedAt: this._normalizeString(booking.verifiedAt),
                    verifiedByStaffId: this._normalizeString(booking.verifiedByStaffId),
                    cancelReason: this._normalizeString(booking.cancelReason),
                    renterProfile: renter,
                    rental,
                    vehicleDetails: vehicle,
                  }) satisfies StaffBookingRecord,
              ),
            );
          }),
        );
      }),
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

  private _upsertBookingRecord(record: StaffBookingRecord): void {
    this._bookingIndex.set(record.bookingId, record);

    const current = this._staffBookings();
    const index = current.findIndex((item) => item.bookingId === record.bookingId);
    if (index === -1) {
      return;
    }

    const next = [...current];
    next[index] = record;
    this._staffBookings.set(next);
  }

  private _removeBookingRecord(bookingId: string): void {
    this._bookingIndex.delete(bookingId);

    const current = this._staffBookings();
    const index = current.findIndex((item) => item.bookingId === bookingId);
    if (index === -1) {
      return;
    }

    const next = [...current];
    next.splice(index, 1);
    this._staffBookings.set(next);
  }

  private _rebuildBookingIndex(records: readonly StaffBookingRecord[]): void {
    this._bookingIndex.clear();
    for (const record of records) {
      this._bookingIndex.set(record.bookingId, record);
    }
  }

  private _toFulfillmentSummary(record: StaffBookingRecord): BookingFulfillmentSummary {
    const booking: BookingDetailsDto = {
      bookingId: record.bookingId,
      renterId: record.renterId,
      vehicleAtStationId: record.vehicleAtStationId,
      bookingCreatedAt: record.bookingCreatedAt,
      startTime: record.startTime,
      endTime: record.endTime,
      status: record.status,
      verificationStatus: record.verificationStatus,
      verifiedByStaffId: record.verifiedByStaffId ?? null,
      verifiedAt: record.verifiedAt ?? null,
      cancelReason: record.cancelReason ?? null,
    };

    return {
      bookingId: record.bookingId,
      status: record.status,
      verificationStatus: record.verificationStatus,
      booking,
      renterProfile: record.renterProfile,
      vehicleDetails: record.vehicleDetails,
      rental: record.rental,
      timeline: this._buildFulfillmentTimeline(record),
    };
  }

  private _buildFulfillmentTimeline(record: StaffBookingRecord): FulfillmentTimelineEvent[] {
    const now = new Date().toISOString();
    const events: FulfillmentTimelineEvent[] = [];

    if (record.verificationStatus === BookingVerificationStatusEnum.Approved) {
      const occurredAt =
        this._normalizeString(record.verifiedAt) ??
        this._normalizeString(record.bookingCreatedAt) ??
        now;

      events.push({
        step: 'checkin',
        title: 'Đặt xe đã được duyệt',
        description: 'Nhân viên đã xác nhận đặt xe và chuyển sang chuẩn bị thuê.',
        actor: 'staff',
        occurredAt,
        metadata: this._buildMetadata({ staffId: record.verifiedByStaffId }),
      });
    }

    const rentalId = this._normalizeString(record.rental?.rentalId);
    if (rentalId) {
      const rentalStartAt =
        this._normalizeString(record.rental?.startTime) ??
        this._normalizeString(record.rental?.booking?.startDate) ??
        now;

      events.push({
        step: 'create-rental',
        title: 'Đơn thuê đã được tạo',
        description: 'Đơn thuê được khởi tạo sau khi booking được phê duyệt.',
        actor: 'staff',
        occurredAt: rentalStartAt,
        metadata: this._buildMetadata({ rentalId }),
      });

      const validContracts = (record.rental?.contracts ?? []).reduce<ContractDto[]>(
        (accumulator, contract) => {
          if (contract?.contractId) {
            accumulator.push(contract);
          }
          return accumulator;
        },
        [],
      );

      if (validContracts.length > 0) {
        const sortedContracts = [...validContracts].sort((first, second) => {
          const firstTime = Date.parse(first.issuedAt ?? '');
          const secondTime = Date.parse(second.issuedAt ?? '');
          return firstTime - secondTime;
        });

        const latestContract = sortedContracts[sortedContracts.length - 1];
        const occurredAt = this._normalizeString(latestContract.issuedAt) ?? rentalStartAt;

        events.push({
          step: 'create-contract',
          title: 'Hợp đồng đã được phát hành',
          description: 'Hợp đồng điện tử gắn với đơn thuê đã sẵn sàng cho chữ ký.',
          actor: 'staff',
          occurredAt,
          metadata: this._buildMetadata({ contractId: latestContract.contractId }),
        });
      }
    }

    return events.sort(
      (first, second) => Date.parse(first.occurredAt) - Date.parse(second.occurredAt),
    );
  }

  private _buildMetadata(
    entries: Record<string, string | undefined | null>,
  ): Readonly<Record<string, string>> | undefined {
    const metadata: Record<string, string> = {};

    for (const [key, value] of Object.entries(entries)) {
      const normalized = this._normalizeString(value);
      if (normalized) {
        metadata[key] = normalized;
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
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
