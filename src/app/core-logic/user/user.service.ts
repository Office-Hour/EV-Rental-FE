import { inject, Injectable, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { AccountService, ApiResponseOfUserInfoDto, UserInfoDto } from '../../../contract';
import { UpdateUserRequest, UserRole } from './user.types';

@Injectable({ providedIn: 'root' })
export class UserService {
  private _user = signal<UserInfoDto | undefined>(undefined);
  private _userRole = signal<UserRole>('renter');
  private _accountService = inject(AccountService);

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter & Setter for the user signal
   */
  get user(): UserInfoDto | undefined {
    return this._user();
  }
  set user(user: UserInfoDto | undefined) {
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
  getUser(): Observable<ApiResponseOfUserInfoDto> {
    return this._accountService.apiAccountProfileGet().pipe(
      tap((response: ApiResponseOfUserInfoDto) => {
        const data: UserInfoDto = response.data ?? {};
        if (data) {
          this._user.set(data);
        }
      }),
    );
  }

  /**
   * Update the user in the API
   */
  updateUser(user: UpdateUserRequest) {
    return this._accountService.apiAccountUpdateProfilePut(user).pipe(
      switchMap(() => {
        return this.getUser();
      }),
    );
  }
}
