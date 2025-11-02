import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-landing',
  imports: [MatIcon],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  isShown = signal(false);
  toggle() {
    this.isShown.update((isShown) => !isShown);
  }
}
