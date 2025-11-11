import {
  EnvironmentProviders,
  Provider,
  importProvidersFrom,
  inject,
  provideEnvironmentInitializer,
} from '@angular/core';
import { SplashScreenService } from './services/splash-screen/splash-screen.service';
import { provideScrollbarOptions } from 'ngx-scrollbar';
import { provideCacheableAnimationLoader, provideLottieOptions } from 'ngx-lottie';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { MatSnackBarModule } from '@angular/material/snack-bar';

/**
 * Provider
 */
export const provideCommonUI = (): (Provider | EnvironmentProviders)[] => {
  // Base providers
  const providers: (Provider | EnvironmentProviders)[] = [
    //Components

    //Services
    provideEnvironmentInitializer(() => inject(SplashScreenService)),
    importProvidersFrom(MatSnackBarModule),

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

    //Charts - chart.js - ng2-charts
    provideCharts(withDefaultRegisterables()),
  ];

  // Return the providers
  return providers;
};
