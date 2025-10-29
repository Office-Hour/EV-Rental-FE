import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from './user.types';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private _httpClient = inject(HttpClient);
  private _user = signal<User | null>(null);

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter & Setter for the user signal
   */
  get user(): User | null {
    return this._user();
  }
  set user(user: User | null) {
    this._user.set(user);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get the user from the API
   */
  getUser(): Observable<User | null> {
    return this._httpClient.get<User | null>('api/user').pipe(tap((user) => this._user.set(user)));
  }

  /**
   * Update the user in the API
   */
  updateUser(user: User) {
    return this._httpClient.put<User>('api/user', user).pipe(tap((user) => this._user.set(user)));
  }
}
