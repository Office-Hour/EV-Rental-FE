import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../user/user.service';

@Component({
  selector: 'app-auth-redirect',
  template: '',
  standalone: true,
})
export class AuthRedirectComponent implements OnInit {
  private _router = inject(Router);
  private _userService = inject(UserService);

  ngOnInit(): void {
    this.redirectBasedOnRole();
  }

  /**
   * Redirect user based on their role
   */
  private redirectBasedOnRole(): void {
    const userRole = this._userService.userRole;

    switch (userRole) {
      case 'admin':
        this._router.navigate(['/admin']);
        break;
      case 'staff':
        this._router.navigate(['/staff']);
        break;
      case 'renter':
        this._router.navigate(['/booking']);
        break;
      default:
        // Default fallback to booking for customers
        this._router.navigate(['/booking']);
        break;
    }
  }
}
