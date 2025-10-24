import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CONFIG_DEFAULT } from './config.constants';
import merge from 'lodash-es/merge';
import { Config } from './config.types';

@Injectable({ providedIn: 'root' })
export class SharedConfigService {
  private _config = new BehaviorSubject(inject(CONFIG_DEFAULT));

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Setter & getter for config
   */
  set config(value: Config) {
    // Merge the new config over to the current config
    const config = merge({}, this._config.getValue(), value);

    // Execute the observable
    this._config.next(config);
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  get config$(): Observable<Config> {
    return this._config.asObservable();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Resets the config to the default
   */
  reset(): void {
    // Set the config
    this._config.next(this.config);
  }
}
