import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideCacheableAnimationLoader, provideLottieOptions } from 'ngx-lottie';
import { provideCommonUI } from './common-ui/provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),

    //Common UI
    provideCommonUI(),

    //Lottie Animation
    provideLottieOptions({
      player: () => import('lottie-web'),
    }),

    // Optional: Enable caching for better performance
    provideCacheableAnimationLoader(),
  ],
};
