import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-confirmation-required',
  templateUrl: './confirmation-required.component.html',
  encapsulation: ViewEncapsulation.None,
  imports: [MatButton, MatIcon, MatProgressSpinner, RouterLink],
})
export class ConfirmationRequiredComponent {
  private _router = inject(Router);
  private _activatedRoute = inject(ActivatedRoute);

  isResending = signal(false);
  emailSent = signal(false);
  userEmail = signal('');

  constructor() {
    // Check if email was passed as query parameter
    this._activatedRoute.queryParams.subscribe((params) => {
      if (params['email']) {
        this.userEmail.set(params['email']);
      }
    });
  }

  /**
   * Navigate to sign in page
   */
  goToSignIn(): void {
    this._router.navigate(['/sign-in']);
  }

  /**
   * Resend confirmation email
   */
  resendConfirmation(): void {
    if (!this.userEmail()) {
      return;
    }

    this.isResending.set(true);

    // TODO: Implement resend confirmation email in AuthService
    // For now, simulate API call
    setTimeout(() => {
      console.log('Confirmation email resent to:', this.userEmail());
      this.emailSent.set(true);
      this.isResending.set(false);

      // Reset the success message after 5 seconds
      setTimeout(() => {
        this.emailSent.set(false);
      }, 5000);
    }, 2000);
  }

  /**
   * Check if resend is available
   */
  canResend(): boolean {
    return !!this.userEmail() && !this.isResending() && !this.emailSent();
  }
}
