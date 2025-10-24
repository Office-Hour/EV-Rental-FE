import { Injectable, inject } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Observable, ReplaySubject, map, switchMap } from 'rxjs';
import { SharedConfigService } from '../config/config.service';
import { fromPairs } from 'lodash-es';
import { Config } from '../config/config.types';

@Injectable({ providedIn: 'root' })
export class MediaWatcherService {
  private _breakpointObserver = inject(BreakpointObserver);
  private _sharedConfigService = inject(SharedConfigService);
  private _onMediaChange: ReplaySubject<{
    matchingAliases: string[];
    matchingQueries: Record<string, string>;
  }> = new ReplaySubject<{ matchingAliases: string[]; matchingQueries: Record<string, string> }>(1);

  /**
   * Constructor
   */
  constructor() {
    this._sharedConfigService.config$
      .pipe(
        map((config: Config) =>
          fromPairs(
            Object.entries(config.screens).map(([alias, screen]) => [
              alias,
              `(min-width: ${screen})`,
            ]),
          ),
        ),
        switchMap((screens: Record<string, string>) =>
          this._breakpointObserver.observe(Object.values(screens)).pipe(
            map((state: BreakpointState) => {
              // Prepare the observable values and set their defaults
              const matchingAliases: string[] = [];
              const matchingQueries: Record<string, string> = {};

              // Get the matching breakpoints and use them to fill the subject
              const matchingBreakpoints =
                Object.entries(state.breakpoints).filter(([, matches]) => matches) ?? [];
              for (const [, query] of matchingBreakpoints) {
                // Find the alias of the matching query
                const matchingAlias = Object.entries(screens).find(
                  ([, q]) => q === (query as unknown as string),
                )?.[0];

                // Add the matching query to the observable values
                if (matchingAlias && typeof matchingAlias === 'string') {
                  matchingAliases.push(matchingAlias);
                  matchingQueries[matchingAlias] = query as unknown as string;
                }
              }

              // Execute the observable
              this._onMediaChange.next({
                matchingAliases,
                matchingQueries,
              });
            }),
          ),
        ),
      )
      .subscribe();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter for _onMediaChange
   */
  get onMediaChange$(): Observable<{
    matchingAliases: string[];
    matchingQueries: Record<string, string>;
  }> {
    return this._onMediaChange.asObservable();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * On media query change
   *
   * @param query
   */
  onMediaQueryChange$(query: string | string[]): Observable<BreakpointState> {
    return this._breakpointObserver.observe(query);
  }
}
