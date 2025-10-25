import { Component, Input, OnChanges } from '@angular/core';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';

@Component({
  selector: 'app-lottie-animation',
  standalone: true,
  imports: [LottieComponent],
  template: ` <ng-lottie [options]="options" [width]="width" [height]="height"> </ng-lottie> `,
})
export class LottieAnimationComponent implements OnChanges {
  @Input() animationPath = ''; // Path to the Lottie JSON file
  @Input() width = '300px'; // Animation width
  @Input() height = '300px'; // Animation height
  @Input() loop = true; // Whether the animation should loop
  @Input() autoplay = true; // Always set to true to ensure playback

  options: AnimationOptions = {
    path: this.animationPath,
    loop: this.loop,
    autoplay: this.autoplay,
  };

  ngOnChanges(): void {
    // Update options when inputs change
    this.options = {
      path: this.animationPath,
      loop: this.loop,
      autoplay: true, // Force autoplay to ensure the animation always plays
    };
  }
}
