import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-sign-out',
  templateUrl: './sign-out.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class SignOutComponent {
  countdown = 5;
}
