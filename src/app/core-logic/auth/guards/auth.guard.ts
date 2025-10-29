import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateChildFn,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../auth.service';

export const AuthGuard: CanActivateFn | CanActivateChildFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Check the authentication status
  return authService.checkAuthenticationStatus().pipe(
    switchMap((authenticated: boolean) => {
      // If the user is not authenticated...
      if (!authenticated) {
        // Redirect to the sign-in page with a redirectUrl param
        const redirectURL = state.url === '/logout' ? '' : `redirectURL=${state.url}`;
        const urlTree = router.parseUrl(`/login?${redirectURL}`);

        return of(urlTree);
      }

      // Allow the access
      return of(true);
    }),
  );
};
