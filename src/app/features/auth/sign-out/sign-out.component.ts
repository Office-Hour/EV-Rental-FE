import { Component, ViewEncapsulation, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../../core-logic/auth/auth.service';

@Component({
  selector: 'app-sign-out',
  templateUrl: './sign-out.component.html',
  encapsulation: ViewEncapsulation.None,
  imports: [MatButton, MatIcon],
})
export class SignOutComponent implements OnInit {
  private _authService = inject(AuthService);
  private _router = inject(Router);

  countdown = signal(5);

  ngOnInit(): void {
    // Sign out the user
    this._authService.signOut().subscribe(() => {
      // Start countdown
      this.startCountdown();
    });
  }

  /**
   * Start countdown and redirect to sign-in
   */
  private startCountdown(): void {
    const interval = setInterval(() => {
      const currentValue = this.countdown();
      if (currentValue <= 1) {
        clearInterval(interval);
        // Redirect to sign-in page
        this._router.navigate(['/auth/sign-in']);
      } else {
        this.countdown.set(currentValue - 1);
      }
    }, 1000);
  }

  /**
   * Redirect to sign-in immediately
   */
  redirectToSignIn(): void {
    this._router.navigate(['/auth/sign-in']);
  }
}
