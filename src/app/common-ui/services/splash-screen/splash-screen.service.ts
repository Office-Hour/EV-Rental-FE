import { DOCUMENT } from '@angular/common';
import { inject, Injectable, DestroyRef } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * SplashScreenService manages the application splash screen display timing.
 *
 * The splash screen will be hidden when:
 * 1. Angular routing navigation is complete (NavigationEnd event)
 * 2. Window load event fires (all resources loaded)
 * 3. Both conditions above are met AND minimum display time has passed
 *
 * Features:
 * - Minimum display time (800ms) to prevent flash
 * - Maximum display time (5000ms) as fallback to prevent infinite loading
 * - Automatic cleanup of timers and event listeners
 */
@Injectable({ providedIn: 'root' })
export class SplashScreenService {
  private readonly _document = inject(DOCUMENT);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _minDisplayTime = 2000; // Minimum time to display splash screen in ms
  private readonly _maxDisplayTime = 5000; // Maximum time to display splash screen in ms
  private _showTime: number | null = null;
  private _navigationComplete = false;
  private _windowLoadComplete = false;
  private _fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Hide splash screen when both navigation and window load are complete
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(() => {
        this._navigationComplete = true;
        this._checkAndHideSplashScreen();
      });

    // Listen to window load event to ensure all resources are loaded
    if (typeof window !== 'undefined') {
      const handleWindowLoad = () => {
        this._windowLoadComplete = true;
        this._checkAndHideSplashScreen();
      };

      window.addEventListener('load', handleWindowLoad, { once: true });

      // Fallback timer to ensure splash screen doesn't stay forever
      this._fallbackTimer = setTimeout(() => {
        console.warn('SplashScreenService: Fallback timeout reached, hiding splash screen');
        this.hide();
      }, this._maxDisplayTime);
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Check if both conditions are met and hide splash screen
   */
  private _checkAndHideSplashScreen(): void {
    if (this._navigationComplete && this._windowLoadComplete) {
      this._hideAfterMinimumTime();
    }
  }

  /**
   * Hide splash screen after ensuring minimum display time
   */
  private _hideAfterMinimumTime(): void {
    // Clear fallback timer since we're hiding now
    if (this._fallbackTimer) {
      clearTimeout(this._fallbackTimer);
      this._fallbackTimer = null;
    }

    if (!this._showTime) {
      this.hide();
      return;
    }

    const elapsedTime = Date.now() - this._showTime;
    const remainingTime = Math.max(0, this._minDisplayTime - elapsedTime);

    if (remainingTime === 0) {
      this.hide();
    } else {
      setTimeout(() => {
        this.hide();
      }, remainingTime);
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Show the splash screen
   */
  show(): void {
    this._showTime = Date.now();
    this._document.body.classList.remove('splash-screen-hidden');
  }

  /**
   * Hide the splash screen
   */
  hide(): void {
    // Clear fallback timer if it exists
    if (this._fallbackTimer) {
      clearTimeout(this._fallbackTimer);
      this._fallbackTimer = null;
    }

    this._document.body.classList.add('splash-screen-hidden');
  }
}
