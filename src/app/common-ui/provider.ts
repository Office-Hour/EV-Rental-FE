import {
  EnvironmentProviders,
  Provider,
  inject,
  provideEnvironmentInitializer,
} from '@angular/core';
import { SplashScreenService } from './services/splash-screen/splash-screen.service';

/**
 * Provider
 */
export const provideCommonUI = (): (Provider | EnvironmentProviders)[] => {
  // Base providers
  const providers: (Provider | EnvironmentProviders)[] = [
    //Components

    //Services
    provideEnvironmentInitializer(() => inject(SplashScreenService)),
  ];

  // Return the providers
  return providers;
};
