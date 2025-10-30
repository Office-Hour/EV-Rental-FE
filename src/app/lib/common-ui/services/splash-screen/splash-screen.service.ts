import { DOCUMENT } from '@angular/common';
import {
  inject,
  Injectable,
  signal,
  computed,
  effect,
  DestroyRef,
  afterNextRender,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * SplashScreenService manages the application splash screen display timing.
 *
 * The splash screen will be hidden when:
 * 1. Angular routing navigation is complete (NavigationEnd event)
 * 2. Initial rendering is complete (afterNextRender)
 * 3. Both conditions above are met AND minimum display time has passed
 *
 * Features:
 * - Minimum display time (2000ms) to prevent flash
 * - Maximum display time (5000ms) as fallback to prevent infinite loading
 * - Reactive state management with signals and computed properties
 * - Automatic hide logic with effect-based reactivity
 * - Modern Angular patterns with afterNextRender and takeUntilDestroyed
 * - Observable state getters for external monitoring
 */
@Injectable({ providedIn: 'root' })
export class SplashScreenService {
  private readonly _document = inject(DOCUMENT);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);

  // Configuration
  private readonly _minDisplayTime = 2000; // Minimum time to display splash screen in ms
  private readonly _maxDisplayTime = 5000; // Maximum time to display splash screen in ms

  // Reactive state
  private readonly _showTime = signal<number | null>(null);
  private readonly _navigationComplete = signal(false);
  private readonly _windowLoadComplete = signal(false);
  private readonly _fallbackTimer = signal<ReturnType<typeof setTimeout> | null>(null);

  // Computed state
  private readonly _shouldHideSplash = computed(() => {
    return this._navigationComplete() && this._windowLoadComplete();
  });

  // Current visibility state
  private readonly _isVisible = signal(true);

  constructor() {
    // Setup navigation completion listener
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(() => {
        this._navigationComplete.set(true);
      });

    // Setup window load detection using afterNextRender
    afterNextRender(() => {
      // Mark window load as complete immediately in browser environment
      if (typeof window !== 'undefined') {
        // Use afterNextRender to ensure all initial rendering is complete
        this._windowLoadComplete.set(true);
      }
    });

    // Reactive effect to automatically hide splash screen when conditions are met
    effect(() => {
      if (this._shouldHideSplash()) {
        this._hideAfterMinimumTime();
      }
    });

    // Setup fallback timer
    if (typeof window !== 'undefined') {
      const fallbackTimerId = setTimeout(() => {
        console.warn('SplashScreenService: Fallback timeout reached, hiding splash screen');
        this.hide();
      }, this._maxDisplayTime);

      this._fallbackTimer.set(fallbackTimerId);
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Hide splash screen after ensuring minimum display time
   */
  private _hideAfterMinimumTime(): void {
    // Clear fallback timer since we're hiding now
    const timerId = this._fallbackTimer();
    if (timerId) {
      clearTimeout(timerId);
      this._fallbackTimer.set(null);
    }

    const showTime = this._showTime();
    if (!showTime) {
      this.hide();
      return;
    }

    const elapsedTime = Date.now() - showTime;
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
    this._showTime.set(Date.now());
    this._isVisible.set(true);
    this._document.body.classList.remove('splash-screen-hidden');
  }

  /**
   * Hide the splash screen
   */
  hide(): void {
    // Clear fallback timer if it exists
    const timerId = this._fallbackTimer();
    if (timerId) {
      clearTimeout(timerId);
      this._fallbackTimer.set(null);
    }

    this._isVisible.set(false);
    this._document.body.classList.add('splash-screen-hidden');
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public getters
  // -----------------------------------------------------------------------------------------------------

  /**
   * Check if splash screen is currently visible
   */
  get isVisible(): boolean {
    return this._isVisible();
  }

  /**
   * Check if navigation is complete
   */
  get navigationComplete(): boolean {
    return this._navigationComplete();
  }

  /**
   * Check if window load is complete
   */
  get windowLoadComplete(): boolean {
    return this._windowLoadComplete();
  }
}
