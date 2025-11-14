import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideCommonUI } from './lib/common-ui/provider';
import { provideAuth } from './core-logic/auth/auth.provider';
import { APIS, provideApi } from '../contract';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideApi({
      basePath:
        'https://swd-production-webapi-app-2.orangewater-0e3c8677.japaneast.azurecontainerapps.io',
    }),
    APIS,

    //Common UI - MANY PROVIDERS IN HERE
    provideCommonUI(),
    //Auth
    provideAuth(),
  ],
};
