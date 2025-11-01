import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, switchMap, tap, throwError } from 'rxjs';
import { UserService } from '../user/user.service';
import { SignInRequest, SignInResponse, SignUpRequest } from './auth.types';
import { TokenService } from '../token/token.service';
import { UserRole } from '../user/user.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _httpClient = inject(HttpClient);
  private _userService = inject(UserService);
  private _tokenService = inject(TokenService);
  private _isAuthenticated = signal<boolean>(false);

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
    return this._httpClient.post<{ message: string }>('api/Account/change-password', password);
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

    return this._httpClient.post<SignInResponse>('api/Account/login', credentials).pipe(
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

        // Get the user from the user service
        this._userService.getUser().subscribe();

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
    // Return the observable
    return of(true);
  }

  /**
   * Sign up
   *
   * @param user
   */
  signUp(user: SignUpRequest) {
    return this._httpClient.post('api/Account/register', user).pipe(
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
      .post<SignInResponse>('api/Account/refresh-token', {
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
    return this._userService.user?.role === role ? true : false;
  }

  checkUserHasAnyRole(roles: UserRole[]): boolean {
    return roles.some((r) => this.checkUserRole(r));
  }
}
