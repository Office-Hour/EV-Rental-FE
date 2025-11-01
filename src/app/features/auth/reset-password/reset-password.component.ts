import { Component, ViewEncapsulation } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  encapsulation: ViewEncapsulation.None,

  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
})
export class ResetPasswordComponent {
  // @ViewChild('resetPasswordNgForm') resetPasswordNgForm: NgForm;
  // alert: { type: FuseAlertType; message: string } = {
  //   type: 'success',
  //   message: '',
  // };
  // resetPasswordForm: UntypedFormGroup;
  // showAlert: boolean = false;
  // /**
  //  * Constructor
  //  */
  // constructor(
  //   private _authService: AuthService,
  //   private _formBuilder: UntypedFormBuilder,
  // ) {}
  // // -----------------------------------------------------------------------------------------------------
  // // @ Lifecycle hooks
  // // -----------------------------------------------------------------------------------------------------
  // /**
  //  * On init
  //  */
  // ngOnInit(): void {
  //   // Create the form
  //   this.resetPasswordForm = this._formBuilder.group(
  //     {
  //       password: ['', Validators.required],
  //       passwordConfirm: ['', Validators.required],
  //     },
  //     {
  //       validators: FuseValidators.mustMatch('password', 'passwordConfirm'),
  //     },
  //   );
  // }
  // // -----------------------------------------------------------------------------------------------------
  // // @ Public methods
  // // -----------------------------------------------------------------------------------------------------
  // /**
  //  * Reset password
  //  */
  // resetPassword(): void {
  //   // Return if the form is invalid
  //   if (this.resetPasswordForm.invalid) {
  //     return;
  //   }
  //   // Disable the form
  //   this.resetPasswordForm.disable();
  //   // Hide the alert
  //   this.showAlert = false;
  //   // Send the request to the server
  //   this._authService
  //     .resetPassword(this.resetPasswordForm.get('password').value)
  //     .pipe(
  //       finalize(() => {
  //         // Re-enable the form
  //         this.resetPasswordForm.enable();
  //         // Reset the form
  //         this.resetPasswordNgForm.resetForm();
  //         // Show the alert
  //         this.showAlert = true;
  //       }),
  //     )
  //     .subscribe(
  //       (response) => {
  //         // Set the alert
  //         this.alert = {
  //           type: 'success',
  //           message: 'Your password has been reset.',
  //         };
  //       },
  //       (response) => {
  //         // Set the alert
  //         this.alert = {
  //           type: 'error',
  //           message: 'Something went wrong, please try again.',
  //         };
  //       },
  //     );
  // }
}
