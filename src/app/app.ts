import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LottieAnimationComponent } from './common-ui/components/lottie-animation/lottie-animation.component';
import { NgScrollbarModule } from 'ngx-scrollbar';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LottieAnimationComponent, NgScrollbarModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('EV-Rental-FE');
  showSplash = signal(true);

  ngOnInit(): void {
    // Hide splash after 500ms
    setTimeout(() => {
      this.showSplash.update(() => false);
    }, 1300);
  }
}
