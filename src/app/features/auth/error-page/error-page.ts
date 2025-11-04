import { Component, ViewEncapsulation, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

export interface ErrorPageData {
  title?: string;
  message?: string;
  code?: string;
  icon?: string;
  actionText?: string;
  actionRoute?: string;
}

@Component({
  selector: 'app-error-page',
  templateUrl: './error-page.html',
  encapsulation: ViewEncapsulation.None,
  imports: [MatButton, MatIcon],
})
export class ErrorPageComponent {
  private _router = inject(Router);
  private _activatedRoute = inject(ActivatedRoute);

  // Default error data
  errorData: ErrorPageData = {
    code: 'ERROR',
    title: 'Something went wrong',
    message:
      'An unexpected error occurred. Please try again or contact support if the problem persists.',
    icon: 'error_outline',
    actionText: 'Go to Home',
    actionRoute: '/',
  };

  constructor() {
    // Check for error data from route or query params
    const navigation = this._router.getCurrentNavigation();
    if (navigation?.extras?.state?.['errorData']) {
      this.errorData = { ...this.errorData, ...navigation.extras.state['errorData'] };
    }

    // Check query params for error type
    this._activatedRoute.queryParams.subscribe((params) => {
      if (params['type']) {
        this.setErrorType(params['type']);
      }
    });
  }

  /**
   * Set error type based on query parameter
   */
  private setErrorType(type: string): void {
    const errorTypes: Record<string, Partial<ErrorPageData>> = {
      '404': {
        code: '404',
        title: 'Page Not Found',
        message:
          'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
        icon: 'web',
        actionText: 'Go to Home',
        actionRoute: '/',
      },
      '403': {
        code: '403',
        title: 'Access Forbidden',
        message:
          "You don't have permission to access this page. Please contact your administrator if you believe this is an error.",
        icon: 'lock',
        actionText: 'Go to Sign In',
        actionRoute: '/sign-in',
      },
      '500': {
        code: '500',
        title: 'Internal Server Error',
        message:
          "Something went wrong on our end. We're working to fix this issue. Please try again later.",
        icon: 'cloud_off',
        actionText: 'Go to Home',
        actionRoute: '/',
      },
      network: {
        code: 'NETWORK',
        title: 'Connection Error',
        message:
          'Unable to connect to our servers. Please check your internet connection and try again.',
        icon: 'wifi_off',
        actionText: 'Try Again',
        actionRoute: '/',
      },
    };

    if (errorTypes[type]) {
      this.errorData = { ...this.errorData, ...errorTypes[type] };
    }
  }

  /**
   * Navigate to the action route
   */
  takeAction(): void {
    if (this.errorData.actionRoute) {
      this._router.navigate([this.errorData.actionRoute]);
    }
  }

  /**
   * Get current timestamp for debugging
   */
  get currentTime(): string {
    return new Date().toLocaleString();
  }

  /**
   * Go back to previous page
   */
  goBack(): void {
    // Try to go back in history, fallback to home if no history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this._router.navigate(['/']);
    }
  }
}
