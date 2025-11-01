import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { UpdateUserRequest, User } from './user.types';

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
    return this._httpClient
      .get<User | null>('api/Account/profile')
      .pipe(tap((user) => this._user.set(user)));
  }

  /**
   * Update the user in the API
   */
  updateUser(user: UpdateUserRequest) {
    return this._httpClient.put('api/Account/update-profile', user).pipe(tap(() => this.getUser()));
  }
}
