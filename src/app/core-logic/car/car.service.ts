import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Car } from './car.type';
import { Observable, tap } from 'rxjs';
import { CAR_ENDPOINTS } from '../api/api.config';

@Injectable({ providedIn: 'root' })
export class CarService {
  private _httpClient = inject(HttpClient);
  private _cars = signal<Car[]>([]);

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter & Setter for the user signal
   */
  get cars(): Car[] {
    return this._cars();
  }
  set cars(cars: Car[]) {
    this._cars.set(cars);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get the cars from the API
   */
  getCars(): Observable<Car[]> {
    return this._httpClient
      .get<Car[]>(CAR_ENDPOINTS.list)
      .pipe(tap((cars) => this._cars.set(cars)));
  }

  /**
   * Get the car by id from the API
   */
  getCarById(id: string): Observable<Car> {
    return this._httpClient.get<Car>(CAR_ENDPOINTS.get(id as string));
  }

  /**
   * Create a new car
   */
  createCar(car: Car): Observable<Car> {
    return this._httpClient.post<Car>('api/cars', car).pipe(tap(() => this.getCars()));
  }

  /**
   * Update a car
   *
   * @param car
   */
  updateCar(car: Car): Observable<Car> {
    return this._httpClient.put<Car>(`api/cars/${car.id}`, car).pipe(tap(() => this.getCars()));
  }

  /**
   * Delete a car
   *
   * @param id
   */
  deleteCar(id: string): Observable<void> {
    return this._httpClient.delete<void>(`api/cars/${id}`).pipe(tap(() => this.getCars()));
  }
}
