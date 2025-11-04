import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core-logic/auth/auth.service';

/**
 * Custom validator for password requirements
 * Must contain at least one uppercase letter (A-Z) and one digit
 */
export function passwordRequirementsValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasDigit = /\d/.test(value);

    const passwordValid = hasUpperCase && hasDigit;
    return !passwordValid ? { passwordRequirements: { hasUpperCase, hasDigit } } : null;
  };
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
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
  ],
})
export class ResetPasswordComponent {
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);

  resetPasswordForm: FormGroup;
  isLoading = signal(false);
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  isPasswordReset = signal(false);

  constructor() {
    this.resetPasswordForm = this._formBuilder.group(
      {
        password: [
          '',
          [Validators.required, Validators.minLength(8), passwordRequirementsValidator()],
        ],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );
  }

  /**
   * Custom validator to check if password and confirm password match
   */
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  /**
   * Reset password
   */
  resetPassword(): void {
    // Return if the form is invalid
    if (this.resetPasswordForm.invalid) {
      return;
    }

    // Set loading state
    this.isLoading.set(true);

    // Get the new password
    const newPassword = this.resetPasswordForm.value.password;

    // TODO: Implement resetPassword method in AuthService with token from URL
    // For now, simulate API call
    setTimeout(() => {
      console.log('Password reset to:', newPassword);
      // Set success state
      this.isPasswordReset.set(true);
      this.isLoading.set(false);
    }, 2000);
  }

  /**
   * Get password requirements status
   */
  getPasswordRequirements(): { hasMinLength: boolean; hasUpperCase: boolean; hasDigit: boolean } {
    const password = this.resetPasswordForm.get('password')?.value || '';
    return {
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasDigit: /\d/.test(password),
    };
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.hidePassword.update((value) => !value);
  }

  /**
   * Toggle confirm password visibility
   */
  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.update((value) => !value);
  }
}
