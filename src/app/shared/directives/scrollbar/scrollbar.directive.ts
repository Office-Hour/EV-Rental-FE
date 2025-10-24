/* eslint-disable @angular-eslint/directive-selector */
import { BooleanInput } from '@angular/cdk/coercion';
import { Platform } from '@angular/cdk/platform';
import {
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'lodash-es';
import PerfectScrollbar from 'perfect-scrollbar';
import { debounceTime, fromEvent } from 'rxjs';
import {
  ScrollbarGeometry,
  ScrollbarGeometryImpl,
  ScrollbarPosition,
  ScrollbarPositionImpl,
  ScrollbarState,
  PerfectScrollbarOptions,
  PerfectScrollbarInstance,
} from './scrollbar.types';

/**
 * Modern scrollbar directive using Angular 20 best practices
 * Wrapper directive for Perfect Scrollbar: https://github.com/mdbootstrap/perfect-scrollbar
 */
@Directive({
  selector: '[Scrollbar]',
  exportAs: 'Scrollbar',
})
export class ScrollbarDirective implements OnInit, OnDestroy {
  static ngAcceptInputType_Scrollbar: BooleanInput;

  private _elementRef = inject(ElementRef);
  private _platform = inject(Platform);
  private _destroyRef = inject(DestroyRef);

  // Modern input signals
  Scrollbar = input<boolean>(true);
  ScrollbarOptions = input<PerfectScrollbarOptions>({});

  // Internal signals
  private _isInitialized = signal<boolean>(false);
  private _isVisible = signal<boolean>(false);
  private _geometry = signal<ScrollbarGeometry | null>(null);
  private _position = signal<ScrollbarPosition | null>(null);

  // Computed values
  isInitialized = computed(() => this._isInitialized());
  isVisible = computed(() => this._isVisible());
  geometry = computed(() => this._geometry());
  position = computed(() => this._position());

  // State management
  private _animation: number | null = null;
  private _options: PerfectScrollbarOptions = {};
  private _ps: PerfectScrollbarInstance | null = null;

  constructor() {
    // Watch for input changes
    effect(() => {
      const enabled = this.Scrollbar();
      const options = this.ScrollbarOptions();

      if (enabled) {
        this._initialize(options);
      } else {
        this._destroy();
      }
    });
  }

  ngOnInit(): void {
    if (this._platform.isBrowser) {
      this._setupResizeObserver();
    }
  }

  ngOnDestroy(): void {
    this._destroy();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get the element reference
   */
  get elementRef(): ElementRef {
    return this._elementRef;
  }

  /**
   * Get the Perfect Scrollbar instance
   */
  get ps(): PerfectScrollbar | null {
    return this._ps;
  }

  /**
   * Get the current scrollbar state
   */
  getState(): ScrollbarState {
    return {
      isInitialized: this._isInitialized(),
      isVisible: this._isVisible(),
      geometry: this._geometry(),
      position: this._position(),
    };
  }

  /**
   * Update scrollbar options
   */
  updateOptions(options: PerfectScrollbarOptions): void {
    if (this._ps) {
      this._options = merge(this._options, options);
      this._ps.update();
    }
  }

  /**
   * Scroll to position
   */
  scrollTo(x: number, y: number, speed?: number): void {
    if (this._ps) {
      this._ps.scrollTo(x, y, speed);
    }
  }

  /**
   * Scroll to element
   */
  scrollToElement(element: HTMLElement, offset?: number, speed?: number): void {
    if (this._ps) {
      this._ps.scrollToElement(element, offset, speed);
    }
  }

  /**
   * Scroll to top
   */
  scrollToTop(speed?: number): void {
    this.scrollTo(0, 0, speed);
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(speed?: number): void {
    if (this._ps) {
      const geometry = this._ps.geometry();
      this.scrollTo(0, geometry.contentHeight, speed);
    }
  }

  /**
   * Scroll to left
   */
  scrollToLeft(speed?: number): void {
    this.scrollTo(0, 0, speed);
  }

  /**
   * Scroll to right
   */
  scrollToRight(speed?: number): void {
    if (this._ps) {
      const geometry = this._ps.geometry();
      this.scrollTo(geometry.contentWidth, 0, speed);
    }
  }

  /**
   * Update scrollbar
   */
  update(): void {
    if (this._ps) {
      this._ps.update();
    }
  }

  /**
   * Destroy scrollbar
   */
  destroy(): void {
    this._destroy();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Initialize Perfect Scrollbar
   */
  private _initialize(options: PerfectScrollbarOptions = {}): void {
    if (!this._platform.isBrowser || this._ps) {
      return;
    }

    try {
      this._options = merge({}, options);
      this._ps = new PerfectScrollbar(this._elementRef.nativeElement, this._options);

      this._isInitialized.set(true);
      this._setupEventListeners();
      this._updateGeometry();
    } catch (error) {
      console.error('Failed to initialize Perfect Scrollbar:', error);
    }
  }

  /**
   * Destroy Perfect Scrollbar
   */
  private _destroy(): void {
    if (this._ps) {
      try {
        this._ps.destroy();
        this._ps = null;
        this._isInitialized.set(false);
        this._isVisible.set(false);
        this._geometry.set(null);
        this._position.set(null);
      } catch (error) {
        console.error('Failed to destroy Perfect Scrollbar:', error);
      }
    }
  }

  /**
   * Setup event listeners
   */
  private _setupEventListeners(): void {
    if (!this._ps) return;

    // Listen to scroll events
    fromEvent(this._elementRef.nativeElement, 'ps-scroll-y')
      .pipe(debounceTime(10), takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this._updatePosition());

    fromEvent(this._elementRef.nativeElement, 'ps-scroll-x')
      .pipe(debounceTime(10), takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this._updatePosition());

    // Listen to update events
    fromEvent(this._elementRef.nativeElement, 'ps-update')
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this._updateGeometry());
  }

  /**
   * Setup resize observer
   */
  private _setupResizeObserver(): void {
    if (!this._platform.isBrowser || !window.ResizeObserver) return;

    const resizeObserver = new ResizeObserver(() => {
      this._handleResize();
    });

    resizeObserver.observe(this._elementRef.nativeElement);

    // Cleanup on destroy
    this._destroyRef.onDestroy(() => {
      resizeObserver.disconnect();
    });
  }

  /**
   * Handle resize events
   */
  private _handleResize(): void {
    if (this._animation) {
      cancelAnimationFrame(this._animation);
    }

    this._animation = requestAnimationFrame(() => {
      this.update();
    });
  }

  /**
   * Update geometry
   */
  private _updateGeometry(): void {
    if (!this._ps) return;

    try {
      const geometry = this._ps.geometry();
      this._geometry.set(ScrollbarGeometryImpl.fromPerfectScrollbar(geometry));
      this._isVisible.set(geometry.isRtl || geometry.isBottomVisible || geometry.isRightVisible);
    } catch (error) {
      console.error('Failed to update scrollbar geometry:', error);
    }
  }

  /**
   * Update position
   */
  private _updatePosition(): void {
    if (!this._ps) return;

    try {
      const position = this._ps.position();
      this._position.set(ScrollbarPositionImpl.fromPerfectScrollbar(position));
    } catch (error) {
      console.error('Failed to update scrollbar position:', error);
    }
  }
}
