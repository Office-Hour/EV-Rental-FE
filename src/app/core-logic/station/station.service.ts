import { inject, Injectable, signal } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import {
  BookingService,
  StationDetailsDto,
  StationDetailsDtoApiResponse,
  StationDto,
  StationDtoPagedResultApiResponse,
  StationsService,
  VehicleDetailsDto,
  VehicleDetailsDtoApiResponse,
} from '../../../contract';
import { Station } from './station.type';

@Injectable({ providedIn: 'root' })
export class StationService {
  private _stationsService = inject(StationsService);
  private _bookingService = inject(BookingService);
  private _stations = signal<Station[]>([]);
  private _page = signal<number>(1);
  private _pageSize = signal<number>(10);
  private _total = signal<number>(0);

  /**
   * Getter & Setter for the stations signal
   */
  get stations(): Station[] {
    return [...this._stations()];
  }
  set stations(stations: Station[]) {
    this._stations.set([...stations]);
  }

  /**
   * Get pagination signals
   */
  get total() {
    return this._total.asReadonly();
  }

  get page() {
    return this._page.asReadonly();
  }

  get pageSize() {
    return this._pageSize.asReadonly();
  }

  /**
   * Get the vehicle details by vehicle id
   */
  getVehicleDetails(vehicleId: string): Observable<VehicleDetailsDto> {
    return this._bookingService
      .apiBookingVehiclesVehicleIdGet(vehicleId)
      .pipe(
        map((response: VehicleDetailsDtoApiResponse) => response.data ?? ({} as VehicleDetailsDto)),
      );
  }

  /**
   * Get the station details by id
   */
  getStationById(id: string): Observable<StationDetailsDto> {
    return this._stationsService
      .apiStationsStationIdGet(id)
      .pipe(
        map((response: StationDetailsDtoApiResponse) => response.data ?? ({} as StationDetailsDto)),
      );
  }

  /**
   * Get the stations from the API
   */
  getStations(): Observable<Station[]> {
    return this._stationsService.apiStationsGet().pipe(
      switchMap((response: StationDtoPagedResultApiResponse) => {
        // Update pagination signals
        this._total.set(response.data?.total ?? 0);
        this._page.set(response.data?.page ?? 1);
        this._pageSize.set(response.data?.pageSize ?? 10);

        const stationItems = response.data?.items ?? [];
        const stationIds = stationItems
          .map((item: StationDto | null) => item?.id ?? '')
          .filter((id): id is string => id.length > 0);

        if (stationIds.length === 0) {
          const emptyStations: Station[] = [];
          this._stations.set(emptyStations);
          return of(emptyStations);
        }

        const stationDetailsRequests = stationIds.map((id: string) => this.getStationById(id));

        return forkJoin(stationDetailsRequests).pipe(
          switchMap((stationDetailsList: StationDetailsDto[]) => {
            if (stationDetailsList.length === 0) {
              const emptyStations: Station[] = [];
              this._stations.set(emptyStations);
              return of(emptyStations);
            }

            const stationsWithVehicles$ = stationDetailsList.map((stationDetail) => {
              const vehicleIds = (stationDetail.vehicles ?? [])
                .map((vehicle) => vehicle.vehicleId ?? '')
                .filter((vehicleId): vehicleId is string => vehicleId.length > 0);

              if (vehicleIds.length === 0) {
                const station = this._mapStationWithVehicles(stationDetail, []);
                return of(station);
              }

              const vehicleDetailRequests = vehicleIds.map((vehicleId) =>
                this.getVehicleDetails(vehicleId),
              );

              return forkJoin(vehicleDetailRequests).pipe(
                map((vehicleDetails: VehicleDetailsDto[]) =>
                  this._mapStationWithVehicles(stationDetail, vehicleDetails),
                ),
              );
            });

            return forkJoin(stationsWithVehicles$).pipe(
              tap((stations: Station[]) => this._stations.set(stations)),
            );
          }),
        );
      }),
    );
  }

  private _mapStationWithVehicles(
    stationDetail: StationDetailsDto,
    vehicleDetails: VehicleDetailsDto[],
  ): Station {
    return {
      id: stationDetail.id ?? '',
      name: stationDetail.name ?? '',
      address: stationDetail.address ?? '',
      capacity: stationDetail.capacity ?? 0,
      vehicles: [...vehicleDetails],
    };
  }
}
