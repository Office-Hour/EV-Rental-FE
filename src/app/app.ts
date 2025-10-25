import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LottieAnimationComponent } from './common-ui/components/lottie-animation/lottie-animation.component';
import { SplashScreenService } from './common-ui/services/splash-screen/splash-screen.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LottieAnimationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly _splashScreenService = inject(SplashScreenService);

  protected readonly title = signal('EV-Rental-FE');

  /**
   * Constructor - Initialize splash screen
   */
  constructor() {
    // Show splash screen when app starts
    this._splashScreenService.show();
  }
}
