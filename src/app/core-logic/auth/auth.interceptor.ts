import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  of,
  shareReplay,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from './auth.service';
import { TokenService } from '../token/token.service';

let refreshInFlight$: Observable<unknown> | null = null;

const ensureFreshAccessToken = (
  authService: AuthService,
  tokenService: TokenService,
): Observable<unknown> => {
  const needsRefresh = tokenService.isAccessTokenExpiration();
  if (!needsRefresh) {
    return of(null);
  }

  const hasRefreshToken = !!tokenService.refreshToken.token;
  if (!hasRefreshToken) {
    return throwError(() => new Error('Missing refresh token.'));
  }

  if (!refreshInFlight$) {
    refreshInFlight$ = authService.invokeAccessTokenExpiration().pipe(
      finalize(() => {
        refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  return refreshInFlight$;
};

const attachAuthorizationHeader = (
  request: HttpRequest<unknown>,
  tokenService: TokenService,
): HttpRequest<unknown> => {
  const accessToken = tokenService.accessToken.token;
  if (!accessToken) {
    return request;
  }

  return request.clone({
    headers: request.headers.set('Authorization', `Bearer ${accessToken}`),
  });
};

/**
 * Intercept
 *
 * @param req
 * @param next
 */
export const authInterceptor = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  // Request
  //Check if the user is authenticated
  if (!authService.isAuthenticated) {
    return next(req);
  }
  return ensureFreshAccessToken(authService, tokenService).pipe(
    switchMap(() => next(attachAuthorizationHeader(req, tokenService))),
    catchError((error) => {
      // Catch "401 Unauthorized" responses
      if (error instanceof HttpErrorResponse && error.status === 401) {
        //Show alert message about 401 Unauthorized
        // alertService.show('401 Unauthorized');
        // Run when refresh token is expiration
        // Sign out
        return authService.signOut().pipe(
          take(1),
          finalize(() => {
            location.reload();
          }),
          switchMap(() => throwError(() => error)),
        );
      }
      // Catch other errors
      if (error instanceof HttpErrorResponse) {
        //Show alert message about other errors
        // alertService.show('Other errors');
        // Redirect to the login page
        router.navigate(['/error-page'], { state: { errorData: error } });
      }

      return throwError(() => error);
    }),
  );
};
