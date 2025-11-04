import { inject, Injectable, signal } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import {
  ApiResponseOfPagedResultOfStationDto,
  ApiResponseOfStationDetailsDto,
  ApiResponseOfVehicleDetailsDto,
  BookingService,
  StationDetailsDto,
  StationsService,
  VehicleDetailsDto,
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
    return this._stations();
  }
  set stations(stations: Station[]) {
    this._stations.set(stations);
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
      .pipe(map((response: ApiResponseOfVehicleDetailsDto) => response.data ?? {}));
  }

  /**
   * Get the station details by id
   */
  getStationById(id: string): Observable<StationDetailsDto> {
    return this._stationsService
      .apiStationsStationIdGet(id)
      .pipe(map((response: ApiResponseOfStationDetailsDto) => response.data ?? {}));
  }

  /**
   * Get the stations from the API
   */
  getStations(): Observable<Station[]> {
    return this._stationsService.apiStationsGet().pipe(
      switchMap((response: ApiResponseOfPagedResultOfStationDto) => {
        // Update pagination signals
        this._total.set(response.data?.total ?? 0);
        this._page.set(response.data?.page ?? 1);
        this._pageSize.set(response.data?.pageSize ?? 10);

        const stationIds = (response.data?.items ?? []).map((item) => item.id ?? '');

        // Get detailed info for all stations in parallel
        const stationDetailsRequests = stationIds.map((id) => this.getStationById(id));

        return forkJoin(stationDetailsRequests).pipe(
          switchMap((stationDetails: StationDetailsDto[]) => {
            // For each station, get vehicle details in parallel
            const vehicleDetailRequests = stationDetails.flatMap((station) =>
              (station.vehicles ?? []).map((vehicle) =>
                this.getVehicleDetails(vehicle.vehicleId ?? ''),
              ),
            );

            if (vehicleDetailRequests.length === 0) {
              // No vehicles to fetch, return stations with empty vehicle arrays
              const stations = stationDetails.map((station: StationDetailsDto) => ({
                id: station.id ?? '',
                name: station.name ?? '',
                address: station.address ?? '',
                capacity: station.capacity ?? 0,
                vehicles: [],
              }));
              return of(stations).pipe(tap((stations: Station[]) => this._stations.set(stations)));
            }

            return forkJoin(vehicleDetailRequests).pipe(
              map((vehicleDetails: VehicleDetailsDto[]) => {
                let vehicleIndex = 0;

                return stationDetails.map((station: StationDetailsDto) => {
                  const stationVehicles = station.vehicles ?? [];
                  const stationVehicleDetails = stationVehicles.map(
                    () => vehicleDetails[vehicleIndex++],
                  );

                  return {
                    id: station.id ?? '',
                    name: station.name ?? '',
                    address: station.address ?? '',
                    capacity: station.capacity ?? 0,
                    vehicles: stationVehicleDetails,
                  };
                });
              }),
              tap((stations: Station[]) => this._stations.set(stations)),
            );
          }),
        );
      }),
    );
  }
}
