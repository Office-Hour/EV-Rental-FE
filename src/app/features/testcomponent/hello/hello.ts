import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-hello',
  imports: [],
  templateUrl: './hello.html',
  styleUrl: './hello.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hello {
  private cookieService = inject(CookieService);

  constructor() {
    this.cookieService.set('token', 'Hello World');
    console.log(this.cookieService.get('token'));
  }
}
