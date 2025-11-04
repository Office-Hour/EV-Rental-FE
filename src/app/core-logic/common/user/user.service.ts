import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { UpdateUserRequest, User, UserRole } from './user.types';
import { AUTH_ENDPOINTS } from '../../api.config';

@Injectable({ providedIn: 'root' })
export class UserService {
  private _httpClient = inject(HttpClient);
  private _user = signal<User | null>(null);
  private _userRole = signal<UserRole>('renter');

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

  /**
   * Getter & Setter for the user role signal
   */
  get userRole(): UserRole {
    return this._userRole();
  }
  set userRole(role: UserRole) {
    this._userRole.set(role);
  }
  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get the user from the API
   */
  getUser(): Observable<User | null> {
    return this._httpClient
      .get<User | null>(AUTH_ENDPOINTS.profile)
      .pipe(tap((user) => this._user.set(user)));
  }

  /**
   * Update the user in the API
   */
  updateUser(user: UpdateUserRequest) {
    return this._httpClient.put(AUTH_ENDPOINTS.updateProfile, user).pipe(tap(() => this.getUser()));
  }
}
