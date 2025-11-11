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
import { Router, RouterLink } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core-logic/auth/auth.service';
import { RegisterRequest } from '../../../../contract';
import { ToastService } from '../../../lib/common-ui/services/toast/toast.service';
import { extractAuthErrorMessage } from '../../../core-logic/auth/auth-error.util';
import { finalize } from 'rxjs';

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
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  encapsulation: ViewEncapsulation.None,
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatButton,
    MatIconButton,
    MatIcon,
    MatCheckbox,
    MatProgressSpinner,
    MatSuffix,
    RouterLink,
  ],
})
export class SignUpComponent {
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _toastService = inject(ToastService);

  signUpForm: FormGroup;
  isLoading = signal(false);
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);

  constructor() {
    this.signUpForm = this._formBuilder.group(
      {
        userName: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [Validators.required, Validators.minLength(8), passwordRequirementsValidator()],
        ],
        confirmPassword: ['', Validators.required],
        agreeToTerms: [false, Validators.requiredTrue],
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

    const passwordsMatch = password.value === confirmPassword.value;

    // Set error on confirmPassword control for better error display
    if (!passwordsMatch) {
      const errors = confirmPassword.errors || {};
      confirmPassword.setErrors({ ...errors, passwordMismatch: true });
    } else {
      // Remove the error if passwords match
      if (confirmPassword.hasError('passwordMismatch')) {
        const errors = { ...confirmPassword.errors };
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
      }
    }

    return passwordsMatch ? null : { passwordMismatch: true };
  }

  /**
   * Sign up
   */
  signUp(): void {
    // Return if the form is invalid
    if (this.signUpForm.invalid) {
      return;
    }

    // Set loading state
    this.isLoading.set(true);

    // Get the sign up data
    const signUpData: RegisterRequest = {
      userName: this.signUpForm.get('userName')?.value,
      email: this.signUpForm.get('email')?.value,
      password: this.signUpForm.get('password')?.value,
      confirmPassword: this.signUpForm.get('confirmPassword')?.value,
    };

    // Sign up
    this._authService
      .signUp(signUpData)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this._toastService.success(
            'Account created successfully. Redirecting to your personalized experience.',
          );
        },
        error: (error) => {
          console.error('Sign up error:', error);
          const message = extractAuthErrorMessage(
            error,
            'Unable to complete sign up. Please review your details and try again.',
          );
          this._toastService.error(message);
        },
      });
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

  /**
   * Check if passwords match
   */
  getPasswordsMatch(): boolean {
    const password = this.signUpForm.get('password')?.value;
    const confirmPassword = this.signUpForm.get('confirmPassword')?.value;
    return password && confirmPassword && password === confirmPassword;
  }

  /**
   * Debug method to check form state
   */
  debugFormState(): void {
    console.log('Form valid:', this.signUpForm.valid);
    console.log('Form errors:', this.signUpForm.errors);
    console.log('Confirm password control errors:', this.signUpForm.get('confirmPassword')?.errors);
    console.log('Passwords match:', this.getPasswordsMatch());
    console.log('Should show mismatch error:', this.shouldShowPasswordMismatchError());
  }

  /**
   * Check if should show password mismatch error
   */
  shouldShowPasswordMismatchError(): boolean {
    const confirmPasswordControl = this.signUpForm.get('confirmPassword');
    return !!(
      confirmPasswordControl?.value &&
      confirmPasswordControl?.dirty &&
      !this.getPasswordsMatch()
    );
  }

  /**
   * Get password requirements status
   */
  getPasswordRequirements(): { hasMinLength: boolean; hasUpperCase: boolean; hasDigit: boolean } {
    const password = this.signUpForm.get('password')?.value || '';
    return {
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasDigit: /\d/.test(password),
    };
  }
}
