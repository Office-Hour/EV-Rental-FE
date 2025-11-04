import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core-logic/common/auth/auth.service';
import { SignInRequest } from '../../../core-logic/common/auth/auth.types';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  encapsulation: ViewEncapsulation.None,
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatButton,
    MatIcon,
    MatCheckbox,
    MatProgressSpinner,
  ],
})
export class SignInComponent {
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);

  signInForm: FormGroup;
  isLoading = signal(false);
  hidePassword = signal(true);

  constructor() {
    this.signInForm = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false],
    });
  }

  /**
   * Sign in
   */
  signIn(): void {
    // Return if the form is invalid
    if (this.signInForm.invalid) {
      return;
    }

    // Set loading state
    this.isLoading.set(true);

    // Get the credentials
    const credentials: SignInRequest = {
      email: this.signInForm.value.email,
      password: this.signInForm.value.password,
    };

    // Sign in
    this._authService.signIn(credentials).subscribe({
      next: () => {
        // Navigate to role-based redirect
        this._router.navigate(['/signed-in-redirect']);
      },
      error: (error) => {
        console.error('Sign in error:', error);
        // Reset loading state
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.hidePassword.update((value) => !value);
  }
}
