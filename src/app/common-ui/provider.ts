import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  EnvironmentProviders,
  Provider,
  importProvidersFrom,
  inject,
  provideEnvironmentInitializer,
  provideAppInitializer,
} from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { SplashScreenService } from './services/splash-screen/splash-screen.service';

/**
 * Provider
 */
export const provideCommonUI = (): Array<Provider | EnvironmentProviders> => {
  // Base providers
  const providers: Array<Provider | EnvironmentProviders> = [
    //Components

    //Services
    provideEnvironmentInitializer(() => inject(SplashScreenService)),
  ];

  // Return the providers
  return providers;
};
