import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, take, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenService } from '../token/token.service';

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
  // Clone the request object
  let newReq = req.clone();

  // Request
  // Check if the access token is expiration
  if (tokenService.isAccessTokenExpiration()) {
    // Invoke access token expiration
    authService.invokeAccessTokenExpiration().subscribe({
      next: () => {
        newReq = req.clone({
          headers: req.headers.set('Authorization', 'Bearer ' + tokenService.accessToken.token),
        });
      },
      error: () => {
        return throwError(() => new Error('Failed to invoke access token expiration.'));
      },
    });
  } else {
    // If the access token exists, add the Authorization header.
    newReq = req.clone({
      headers: req.headers.set('Authorization', 'Bearer ' + tokenService.accessToken.token),
    });
  }

  // Response
  return next(newReq).pipe(
    catchError((error) => {
      // Catch "401 Unauthorized" responses
      if (error instanceof HttpErrorResponse && error.status === 401) {
        //Show alert message about 401 Unauthorized
        // alertService.show('401 Unauthorized');
        // Run when refresh token is expiration
        // Sign out
        authService
          .signOut()
          .pipe(
            take(1),
            finalize(() => {
              // Reload the app
              location.reload();
            }),
          )
          .subscribe({
            next: () => {
              return next(newReq);
            },
            error: () => {
              return throwError(() => error);
            },
            complete: () => {
              return next(newReq);
            },
          });
      }
      // Catch other errors
      if (error instanceof HttpErrorResponse) {
        //Show alert message about other errors
        // alertService.show('Other errors');
        // Redirect to the login page
        router.navigate(['/error-page']);
      }

      return throwError(() => error);
    }),
  );
};
