import { Component, ViewEncapsulation, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../../core-logic/auth/auth.service';
import { ToastService } from '../../../lib/common-ui/services/toast/toast.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-sign-out',
  templateUrl: './sign-out.component.html',
  encapsulation: ViewEncapsulation.None,
  imports: [MatButton, MatIcon],
})
export class SignOutComponent implements OnInit {
  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _toastService = inject(ToastService);

  countdown = signal(5);

  ngOnInit(): void {
    // Start countdown
    this.startCountdown();
  }

  /**
   * Start countdown and redirect to sign-in
   */
  private startCountdown(): void {
    const interval = setInterval(() => {
      const currentValue = this.countdown();
      if (currentValue <= 1) {
        clearInterval(interval);
        if (this._authService.isAuthenticated) {
          this.redirectToSignIn();
        }
      }
      this.countdown.set(currentValue - 1);
    }, 1000);
  }

  /**
   * Redirect to sign-in page
   */
  redirectToSignIn(): void {
    // Sign out the user
    this._authService
      .signOut()
      .pipe(
        finalize(() => {
          this._toastService.info('You are now signed out. Come back anytime.');
        }),
      )
      .subscribe({
        next: () => {
          // Redirect to sign-in page
          this._router.navigate(['/sign-in']);
        },
        error: (error) => {
          console.error('Sign out error:', error);
          this._toastService.error('Something went wrong while signing out. Please try again.');
        },
      });
  }
}
