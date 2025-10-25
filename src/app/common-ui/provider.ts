import {
  EnvironmentProviders,
  Provider,
  inject,
  provideEnvironmentInitializer,
} from '@angular/core';
import { SplashScreenService } from './services/splash-screen/splash-screen.service';
import { provideScrollbarOptions } from 'ngx-scrollbar';
import { provideCacheableAnimationLoader, provideLottieOptions } from 'ngx-lottie';

/**
 * Provider
 */
export const provideCommonUI = (): (Provider | EnvironmentProviders)[] => {
  // Base providers
  const providers: (Provider | EnvironmentProviders)[] = [
    //Components

    //Services
    provideEnvironmentInitializer(() => inject(SplashScreenService)),

    //Lottie Animation
    provideLottieOptions({
      player: () => import('lottie-web'),
    }),

    // Optional: Enable caching for better performance
    provideCacheableAnimationLoader(),

    // https://ngx-scrollbar.netlify.app/#/
    //Scrollbar
    provideScrollbarOptions({
      visibility: 'hover',
      appearance: 'compact',
    }),
  ];

  // Return the providers
  return providers;
};
