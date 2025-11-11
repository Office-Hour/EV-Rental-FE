import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ToastService } from '../../../lib/common-ui/services/toast/toast.service';

@Component({
  selector: 'app-confirmation-required',
  templateUrl: './confirmation-required.component.html',
  encapsulation: ViewEncapsulation.None,
  imports: [MatButton, MatIcon, MatProgressSpinner, RouterLink],
})
export class ConfirmationRequiredComponent {
  private _router = inject(Router);
  private _activatedRoute = inject(ActivatedRoute);
  private _toastService = inject(ToastService);

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
      this._toastService.error('We need a valid email address to resend the confirmation link.');
      return;
    }

    this.isResending.set(true);

    // TODO: Implement resend confirmation email in AuthService
    // For now, simulate API call
    setTimeout(() => {
      console.log('Confirmation email resent to:', this.userEmail());
      this.emailSent.set(true);
      this.isResending.set(false);
      this._toastService.success(
        `We resent the confirmation email to ${this.userEmail()}. Please check your inbox.`,
      );

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
