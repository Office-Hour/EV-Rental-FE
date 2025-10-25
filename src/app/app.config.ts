import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideCacheableAnimationLoader, provideLottieOptions } from 'ngx-lottie';
import { provideCommonUI } from './common-ui/provider';
import { provideScrollbarOptions } from 'ngx-scrollbar';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),

    // https://ngx-scrollbar.netlify.app/#/
    provideScrollbarOptions({
      visibility: 'hover',
      appearance: 'compact',
    }),

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
