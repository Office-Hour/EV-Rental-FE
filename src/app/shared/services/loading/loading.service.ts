import { Injectable, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

export type LoadingMode = 'determinate' | 'indeterminate';

export interface LoadingState {
  auto: boolean;
  mode: LoadingMode;
  progress: number;
  show: boolean;
  activeUrls: Set<string>;
}

@Injectable({ providedIn: 'root' })
export class SharedLoadingService {
  // Signals for reactive state
  private _auto = signal<boolean>(true);
  private _mode = signal<LoadingMode>('indeterminate');
  private _progress = signal<number>(0);
  private _show = signal<boolean>(false);
  private _activeUrls = signal<Set<string>>(new Set());

  // Computed values
  isAuto = computed(() => this._auto());
  currentMode = computed(() => this._mode());
  currentProgress = computed(() => this._progress());
  isVisible = computed(() => this._show());
  hasActiveRequests = computed(() => this._activeUrls().size > 0);

  // -----------------------------------------------------------------------------------------------------
  // @ Observable getters (for backward compatibility)
  // -----------------------------------------------------------------------------------------------------

  /**
   * Getter for auto mode observable
   */
  get auto$(): Observable<boolean> {
    return toObservable(this._auto);
  }

  /**
   * Getter for mode observable
   */
  get mode$(): Observable<LoadingMode> {
    return toObservable(this._mode);
  }

  /**
   * Getter for progress observable
   */
  get progress$(): Observable<number> {
    return toObservable(this._progress);
  }

  /**
   * Getter for show observable
   */
  get show$(): Observable<boolean> {
    return toObservable(this._show);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Show the loading bar
   */
  show(): void {
    this._show.set(true);
  }

  /**
   * Hide the loading bar
   */
  hide(): void {
    this._show.set(false);
  }

  /**
   * Toggle the loading bar visibility
   */
  toggle(): void {
    this._show.set(!this._show());
  }

  /**
   * Set the auto mode
   *
   * @param value - Whether to use auto mode
   */
  setAutoMode(value: boolean): void {
    this._auto.set(value);
  }

  /**
   * Set the mode
   *
   * @param value - The loading mode
   */
  setMode(value: LoadingMode): void {
    this._mode.set(value);
  }

  /**
   * Set the progress of the bar manually
   *
   * @param value - Progress value between 0 and 100
   */
  setProgress(value: number): void {
    if (!this._isValidProgress(value)) {
      console.error('Progress value must be between 0 and 100!');
      return;
    }

    this._progress.set(value);
    this._mode.set('determinate');
  }

  /**
   * Reset the loading bar to initial state
   */
  reset(): void {
    this._progress.set(0);
    this._mode.set('indeterminate');
    this._show.set(false);
    this._activeUrls.set(new Set());
  }

  /**
   * Sets the loading status on the given url
   *
   * @param status - Loading status
   * @param url - Request URL
   */
  _setLoadingStatus(status: boolean, url: string): void {
    if (!this._isValidUrl(url)) {
      console.error('The request URL must be provided!');
      return;
    }

    const currentUrls = new Set(this._activeUrls());

    if (status === true) {
      currentUrls.add(url);
      this._activeUrls.set(currentUrls);
      this._show.set(true);
    } else if (status === false && currentUrls.has(url)) {
      currentUrls.delete(url);
      this._activeUrls.set(currentUrls);

      // Only hide if no active requests remain
      if (currentUrls.size === 0) {
        this._show.set(false);
      }
    }
  }

  /**
   * Get the current loading state
   */
  getState(): LoadingState {
    return {
      auto: this._auto(),
      mode: this._mode(),
      progress: this._progress(),
      show: this._show(),
      activeUrls: this._activeUrls(),
    };
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Validate progress value
   */
  private _isValidProgress(value: number): boolean {
    return typeof value === 'number' && value >= 0 && value <= 100;
  }

  /**
   * Validate URL
   */
  private _isValidUrl(url: string): boolean {
    return typeof url === 'string' && url.trim().length > 0;
  }
}
