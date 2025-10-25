import { InjectionToken } from '@angular/core';
import { Config } from './config.types';

export const CONFIG_DEFAULT = new InjectionToken<Config>('APP_CONFIG');
