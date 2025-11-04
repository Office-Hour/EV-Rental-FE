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
import { UserRole } from '../../user/user.types';

export const AuthGuard: CanActivateFn | CanActivateChildFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const requiredRoles = route.data['roles'] as UserRole[];

  // Check the authentication status
  return of(authService.isAuthenticated).pipe(
    switchMap((isAuthenticated) => {
      // If the user is not authenticated...
      if (!isAuthenticated) {
        // Redirect to the sign-in page with a redirectUrl param
        const redirectURL = state.url === '/sign-out' ? '' : `redirectURL=${state.url}`;
        const urlTree = router.parseUrl(`/sign-in?${redirectURL}`);

        return of(urlTree);
      }

      // Check if the user has the required roles
      if (requiredRoles && requiredRoles.length > 0) {
        const hasAnyRole = authService.checkUserHasAnyRole(requiredRoles);
        if (!hasAnyRole) {
          router.navigate(['/error-page'], {
            state: { errorData: { status: 403, message: 'Forbidden' } },
          });
          return of(false);
        }
      }

      // Allow the access
      return of(true);
    }),
  );
};
