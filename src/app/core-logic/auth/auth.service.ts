import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, switchMap, take, throwError } from 'rxjs';
import { Router } from '@angular/router';
import {
  AccountService,
  ApiResponse,
  AuthDto,
  AuthDtoApiResponse,
  ChangePasswordRequest,
  LoginRequest,
  LogoutRequest,
  RegisterRequest,
} from '../../../contract';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { UserRole } from '../user/user.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _userService = inject(UserService);
  private _tokenService = inject(TokenService);
  private _isAuthenticated = signal<boolean>(false);
  private _accountService = inject(AccountService);
  private _router = inject(Router);

  constructor() {
    this._restoreSessionFromTokens();
  }

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
  resetPassword(changePasswordRequest: ChangePasswordRequest): Observable<ApiResponse> {
    return this._accountService.apiAccountChangePasswordPost(changePasswordRequest).pipe(
      switchMap(() => {
        return of({ data: null, message: 'Password changed successfully', isSuccess: true });
      }),
    );
  }

  /**
   * Login
   *
   * @param credentials
   */
  signIn(credentials: LoginRequest): Observable<ApiResponse> {
    // Throw error, if the user is already logged in
    if (this.isAuthenticated) {
      return throwError(() => new Error('User is already logged in.'));
    }

    return this._accountService.apiAccountLoginPost(credentials).pipe(
      switchMap((response: AuthDtoApiResponse) => {
        const data: AuthDto = response.data ?? {};
        if (data) {
          // Store the tokens in the token service
          this._tokenService.accessToken = {
            token: data.accessToken ?? '',
            expiration: new Date(data.accessTokenExpiration ?? ''),
          };
          // Store the refresh token in the token service
          this._tokenService.refreshToken = {
            token: data.refreshToken ?? '',
            expiration: new Date(data.refreshTokenExpiration ?? ''),
          };
        }
        // Set the isAuthenticated signal to true
        this.isAuthenticated = true;

        // Decode the access token
        this._applyRoleFromToken(data.accessToken ?? '');

        // Get the user from the user service and chain it
        return this._userService.getUser().pipe(
          switchMap(() => {
            // Navigate to role-based redirect
            this.redirectUser();
            return of(response);
          }),
        );
      }),
    );
  }

  /**
   * Sign out
   */
  signOut(): Observable<ApiResponse> {
    const logoutRequest: LogoutRequest = {
      refreshToken: this._tokenService.refreshToken.token ?? '',
    };
    return this._accountService.apiAccountLogoutPost(logoutRequest).pipe(
      switchMap(() => {
        // Clear the tokens
        this._tokenService.clearAllTokens();
        // Clear the user from the user service
        this._userService.user = undefined;
        // Set the isAuthenticated signal to false
        this.isAuthenticated = false;
        // Clear the user role from the user service
        this._userService.userRole = 'renter';
        // Return the observable
        return of({
          data: null,
          message: 'User logged out successfully',
          isSuccess: true,
        });
      }),
    );
  }

  /**
   * Sign up
   *
   * @param user
   */
  signUp(user: RegisterRequest) {
    return this._accountService.apiAccountRegisterPost(user).pipe(
      switchMap(() => {
        // Return the observable of the sign in method
        return this.signIn({ email: user.email, password: user.password });
      }),
    );
  }

  /**
   * Invoke access token expiration
   *
   */
  invokeAccessTokenExpiration(): Observable<ApiResponse> {
    return this._accountService
      .apiAccountInvokeTokenPost({ refreshToken: this._tokenService.refreshToken.token ?? '' })
      .pipe(
        switchMap((response: AuthDtoApiResponse) => {
          const data: AuthDto = response.data ?? {};
          if (data) {
            this._tokenService.accessToken = {
              token: data.accessToken ?? '',
              expiration: new Date(data.accessTokenExpiration ?? ''),
            };
          }
          return of(response);
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

  /**
   * Redirect user based on their role
   */
  redirectUser(): void {
    const userRole = this._userService.userRole;
    switch (userRole) {
      case 'admin':
        this._router.navigateByUrl('/admin');
        break;
      case 'staff':
        this._router.navigateByUrl('/staff');
        break;
      case 'renter':
        this._router.navigateByUrl('/cars');
        break;
      default:
        this._router.navigateByUrl('/cars');
        break;
    }
  }

  private _restoreSessionFromTokens(): void {
    const refreshToken = this._tokenService.refreshToken.token;
    const accessToken = this._tokenService.accessToken.token;

    if (!refreshToken) {
      return;
    }

    if (this._tokenService.isRefreshTokenExpiration()) {
      this._handleFailedSessionRestore();
      return;
    }

    if (!accessToken || this._tokenService.isAccessTokenExpiration()) {
      this.invokeAccessTokenExpiration()
        .pipe(take(1))
        .subscribe({
          next: (response) => {
            const token = response.data?.accessToken ?? this._tokenService.accessToken.token;
            this._establishAuthenticatedSession(token);
          },
          error: () => {
            this._handleFailedSessionRestore();
          },
        });
      return;
    }

    this._establishAuthenticatedSession(accessToken);
  }

  private _establishAuthenticatedSession(accessToken?: string): void {
    if (!accessToken) {
      this._handleFailedSessionRestore();
      return;
    }

    this.isAuthenticated = true;
    this._applyRoleFromToken(accessToken);
    this._preloadUser();
  }

  private _applyRoleFromToken(accessToken: string): void {
    if (!accessToken) {
      this._userService.userRole = 'renter';
      return;
    }

    try {
      const decodedToken = this._tokenService.decodeToken(accessToken);
      if (decodedToken.Admin) {
        this._userService.userRole = 'admin';
      } else if (decodedToken.Staff) {
        this._userService.userRole = 'staff';
      } else if (decodedToken.Renter) {
        this._userService.userRole = 'renter';
      }
    } catch {
      this._userService.userRole = 'renter';
    }
  }

  private _preloadUser(): void {
    if (this._userService.user) {
      return;
    }

    this._userService
      .getUser()
      .pipe(take(1))
      .subscribe({
        error: () => {
          // Silently ignore preload errors. Interceptor or guards will handle hard failures.
        },
      });
  }

  private _handleFailedSessionRestore(): void {
    this.isAuthenticated = false;
    this._tokenService.clearAllTokens();
    this._userService.user = undefined;
    this._userService.userRole = 'renter';
  }
}
