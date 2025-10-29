import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../auth.service';

export const NoAuthGuard: CanActivateFn | CanActivateChildFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  //check the user status
  return authService.checkAuthenticationStatus().pipe(
    switchMap((authenticated: boolean) => {
      // If the user is not authenticated...
      if (!authenticated) {
        // Redirect to the sign-in page with a redirectUrl param
        router.navigate(['/']);
        return of(false);
      }

      // Allow the access
      return of(true);
    }),
  );
};
