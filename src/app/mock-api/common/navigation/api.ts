import { Injectable } from '@angular/core';
import { defaultNavigation } from '../../../mock-api/common/navigation/data';
import { cloneDeep } from 'lodash-es';
import { NavigationItem } from '../../../shared/services/navigation/navigation.types';
import { MockApiService } from '../../../shared/mock-api/mock-api.service';

@Injectable({ providedIn: 'root' })
export class NavigationMockApi {
  private readonly _defaultNavigation: NavigationItem[] = defaultNavigation;

  /**
   * Constructor
   */
  constructor(private _mockApiService: MockApiService) {
    // Register Mock API handlers
    this.registerHandlers();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Register Mock API handlers
   */
  registerHandlers(): void {
    // -----------------------------------------------------------------------------------------------------
    // @ Navigation - GET
    // -----------------------------------------------------------------------------------------------------
    this._mockApiService.onGet('api/common/navigation').reply(() => {
      // Fill compact navigation children using the default navigation
      // Return the response
      return [
        200,
        {
          default: cloneDeep(this._defaultNavigation),
        },
      ];
    });
  }
}
