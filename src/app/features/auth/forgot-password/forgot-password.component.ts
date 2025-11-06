import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core-logic/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  encapsulation: ViewEncapsulation.None,
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatButton,
    MatIcon,
    MatProgressSpinner,
    RouterLink,
  ],
})
export class ForgotPasswordComponent {
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);

  forgotPasswordForm: FormGroup;
  isLoading = signal(false);
  isResending = signal(false);
  isEmailSent = signal(false);

  constructor() {
    this.forgotPasswordForm = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  /**
   * Send password reset email
   */
  sendResetLink(): void {
    // Return if the form is invalid
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    // Set loading state
    this.isLoading.set(true);

    // Get the email
    const email = this.forgotPasswordForm.value.email;

    // TODO: Implement forgotPassword method in AuthService
    // For now, simulate API call
    setTimeout(() => {
      console.log('Password reset requested for:', email);
      // Set success state
      this.isEmailSent.set(true);
      this.isLoading.set(false);
    }, 2000);
  }

  /**
   * Resend reset link
   */
  resendResetLink(): void {
    // Return if the form is invalid
    if (this.isResending()) {
      return;
    }

    // Set loading state
    this.isResending.set(true);

    // TODO: Implement resendResetLink method in AuthService
    // For now, simulate API call
    setTimeout(() => {
      // Show success message
      //<AlertComponent>
      // Set resending state
      this.isResending.set(false);
    }, 2000);
  }

  /**
   * Can resend reset link
   */
  canResend(): boolean {
    return !this.isResending() && !this.isEmailSent();
  }

  /**
   * Get resending state
   */
  getResendingState(): string {
    return this.isResending() ? 'Sending...' : 'Resend email';
  }

  /**
   * Get email sent state
   */
  getEmailSentState(): string {
    return this.isEmailSent() ? 'Email sent' : 'Email not sent';
  }
}
