import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { inject, provideEnvironmentInitializer } from '@angular/core';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

export const provideAuth = () => {
  return [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideEnvironmentInitializer(() => inject(AuthService)),
  ];
};
