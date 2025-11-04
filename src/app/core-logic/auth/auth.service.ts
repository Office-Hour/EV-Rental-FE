import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, switchMap, tap, throwError } from 'rxjs';
import { UserService } from '../user/user.service';
import { SignInRequest, SignInResponse, SignUpRequest } from './auth.types';
import { TokenService } from '../token/token.service';
import { UserRole } from '../user/user.types';
import { CarService } from '../car/car.service';
import { BookingService } from '../booking/booking.service';
import { AUTH_ENDPOINTS } from '../api/api.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _httpClient = inject(HttpClient);
  private _userService = inject(UserService);
  private _tokenService = inject(TokenService);
  private _isAuthenticated = signal<boolean>(false);
  private _carService = inject(CarService);
  private _bookingService = inject(BookingService);

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter & Setter for the isAuthenticated signal
   */
  get isAuthenticated(): boolean {
    return this._isAuthenticated();
  }
  set isAuthenticated(isAuthenticated: boolean) {
    this._isAuthenticated.set(isAuthenticated);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Reset password
   *
   * @param password
   */
  resetPassword(password: string): Observable<{ message: string }> {
    return this._httpClient.post<{ message: string }>(AUTH_ENDPOINTS.changePassword, password);
  }

  /**
   * Login
   *
   * @param credentials
   */
  signIn(credentials: SignInRequest): Observable<SignInResponse> {
    // Throw error, if the user is already logged in
    if (this.isAuthenticated) {
      return throwError(() => new Error('User is already logged in.'));
    }

    return this._httpClient.post<SignInResponse>(AUTH_ENDPOINTS.login, credentials).pipe(
      switchMap((response) => {
        // Store the tokens in the token service
        this._tokenService.accessToken = {
          token: response.accessToken,
          expiration: new Date(response.accessTokenExpiration),
        };
        // Store the refresh token in the token service
        this._tokenService.refreshToken = {
          token: response.refreshToken,
          expiration: new Date(response.refreshTokenExpiration),
        };

        // Set the isAuthenticated signal to true
        this.isAuthenticated = true;

        // Decode the access token
        const decodedToken = this._tokenService.decodeToken(response.accessToken);
        console.log(decodedToken);
        if (decodedToken.Renter) {
          this._userService.userRole = 'renter';
        } else if (decodedToken.Admin) {
          this._userService.userRole = 'admin';
        } else if (decodedToken.Staff) {
          this._userService.userRole = 'staff';
        }

        // Get the user from the user service
        this._userService.getUser().subscribe();

        // Get the bookings from the booking service
        this._bookingService.getBookings().subscribe();

        // Get the cars from the car service
        this._carService.getCars().subscribe();

        // Return a new observable with the response
        return of(response);
      }),
    );
  }

  /**
   * Sign out
   */
  signOut(): Observable<true> {
    // Clear the tokens
    this._tokenService.clearAllTokens();
    // Clear the user from the user service
    this._userService.user = null;
    // Set the isAuthenticated signal to false
    this.isAuthenticated = false;
    // Clear the bookings from the booking service
    this._bookingService.bookings = [];
    // Clear the cars from the car service
    this._carService.cars = [];
    // Clear the user role from the user service
    this._userService.userRole = 'renter';
    // Return the observable
    return of(true);
  }

  /**
   * Sign up
   *
   * @param user
   */
  signUp(user: SignUpRequest) {
    return this._httpClient.post(AUTH_ENDPOINTS.register, user).pipe(
      tap(() => {
        this.signIn({ email: user.email, password: user.password }).subscribe();
      }),
    );
  }

  /**
   * Invoke access token expiration
   *
   */
  invokeAccessTokenExpiration(): Observable<SignInResponse> {
    return this._httpClient
      .post<SignInResponse>(AUTH_ENDPOINTS.refreshToken, {
        refreshToken: this._tokenService.refreshToken.token,
      })
      .pipe(
        tap((response: SignInResponse) => {
          this._tokenService.accessToken = {
            token: response.accessToken,
            expiration: new Date(response.accessTokenExpiration),
          };
          this._tokenService.refreshToken = {
            token: response.refreshToken,
            expiration: new Date(response.refreshTokenExpiration),
          };
        }),
      );
  }

  /**
   * Check if the user has a role
   */
  checkUserRole(role: UserRole) {
    return this._userService.userRole === role;
  }

  checkUserHasAnyRole(roles: UserRole[]): boolean {
    return roles.some((r) => this.checkUserRole(r));
  }
}
