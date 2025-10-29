import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideCommonUI } from './lib/common-ui/provider';
import { provideAuth } from './core-logic/auth/auth.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),

    //Common UI - MANY PROVIDERS IN HERE
    provideCommonUI(),
    //Auth
    provideAuth(),
  ],
};
