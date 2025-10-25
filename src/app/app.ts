import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LottieAnimationComponent } from './common-ui/components/lottie-animation/lottie-animation.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LottieAnimationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('EV-Rental-FE');
  showSplash = true;

  /**
   * Constructor
   */
  constructor() {}

  ngOnInit(): void {
    // Hide splash after 500ms
    setTimeout(() => {
      this.showSplash = false;
    }, 1300);
  }
}
