import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, switchMap, throwError } from 'rxjs';
import { UserService } from '../user/user.service';
import { User } from '../user/user.types';
import { AuthUtils } from './auth.utils';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _httpClient = inject(HttpClient);
  private _isAuthenticated = signal<boolean>(false);
  private _userService = inject(UserService);

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter & Setter for access token in localStorage
   */
  get accessToken(): string {
    return localStorage.getItem('accessToken') ?? '';
  }
  set accessToken(token: string) {
    localStorage.setItem('accessToken', token);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Forgot password
   *
   * @param email
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this._httpClient.post<{ message: string }>('api/auth/forgot-password', email);
  }

  /**
   * Reset password
   *
   * @param password
   */
  resetPassword(password: string): Observable<{ message: string }> {
    return this._httpClient.post<{ message: string }>('api/auth/reset-password', password);
  }

  /**
   * Login
   *
   * @param credentials
   */
  login(credentials: {
    email: string;
    password: string;
  }): Observable<{ accessToken: string; user: User }> {
    // Throw error, if the user is already logged in
    if (this._isAuthenticated()) {
      return throwError(() => new Error('User is already logged in.'));
    }

    return this._httpClient
      .post<{ accessToken: string; user: User }>('api/auth/login', credentials)
      .pipe(
        switchMap((response) => {
          // Store the access token in the local storage
          this.accessToken = response.accessToken;

          // Set the authenticated flag to true
          this._isAuthenticated.set(true);

          // Store the user on the user service
          this._userService.user = response.user;

          // Return a new observable with the response
          return of(response);
        }),
      );
  }

  /**
   * Sign in using the access token
   */
  loginUsingToken(): Observable<boolean> {
    // Sign in using the token
    return this._httpClient
      .post<{ accessToken: string; user: User }>('api/auth/login-with-token', {
        accessToken: this.accessToken,
      })
      .pipe(
        catchError(() =>
          // Return false
          of(false as const),
        ),
        switchMap((response) => {
          if (typeof response === 'object' && 'accessToken' in response && response.accessToken) {
            this.accessToken = response.accessToken;
          }

          // Set the authenticated flag to true
          this._isAuthenticated.set(true);

          // Store the user on the user service
          this._userService.user =
            typeof response === 'object' && response?.user ? (response.user as User) : null;
          // Return true
          return of(true as const);
        }),
      );
  }

  /**
   * Sign out
   */
  logout(): Observable<true> {
    // Remove the access token from the local storage
    localStorage.removeItem('accessToken');

    // Set the authenticated flag to false
    this._isAuthenticated.set(false);

    // Clear the user from the user service
    this._userService.user = null;

    // Return the observable
    return of(true as const);
  }

  /**
   * Sign up
   *
   * @param user
   */
  register(user: {
    email: string;
    password: string;
  }): Observable<{ accessToken: string; user: User }> {
    return this._httpClient.post<{ accessToken: string; user: User }>('api/auth/register', user);
  }

  /**
   * Unlock session
   *
   * @param credentials
   */
  unlockSession(credentials: {
    email: string;
    password: string;
  }): Observable<{ accessToken: string; user: User }> {
    return this._httpClient.post<{ accessToken: string; user: User }>(
      'api/auth/unlock-session',
      credentials,
    );
  }

  /**
   * Check the authentication status
   */
  checkAuthenticationStatus(): Observable<boolean> {
    // Check if the user is logged in
    if (this._isAuthenticated()) {
      return of(true as const);
    }

    // Check the access token availability
    if (!this.accessToken) {
      return of(false as const);
    }

    // Check the access token expire date
    if (AuthUtils.isTokenExpired(this.accessToken)) {
      return of(false as const);
    }

    // If the access token exists, and it didn't expire, sign in using it
    return this.loginUsingToken();
  }
}
