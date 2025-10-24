import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  input,
  OnChanges,
  OnDestroy,
  OnInit,
  output,
  QueryList,
  Renderer2,
  signal,
  SimpleChanges,
  ViewChild,
  ViewChildren,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { delay, filter, merge, ReplaySubject, Subscription } from 'rxjs';
import { sharedAnimations } from '../../../animations/public-api';
import { ScrollbarDirective } from '../../../directives/scrollbar/scrollbar.directive';
import { SharedNavigationService } from '../../../services/navigation/navigation.service';
import {
  NavigationItem,
  VerticalNavigationAppearance,
  VerticalNavigationMode,
  VerticalNavigationPosition,
} from '../../../services/navigation/navigation.types';
import { SharedUtilsService } from '../../../services/utils/utils.service';
import { VerticalNavigationAsideItemComponent } from './components/aside/aside.component';
import { VerticalNavigationBasicItemComponent } from './components/basic/basic.component';
import { VerticalNavigationCollapsableItemComponent } from './components/collapsable/collapsable.component';
import { VerticalNavigationDividerItemComponent } from './components/divider/divider.component';
import { VerticalNavigationGroupItemComponent } from './components/group/group.component';
import { VerticalNavigationSpacerItemComponent } from './components/spacer/spacer.component';

/**
 * Modern vertical navigation component using Angular 20 best practices
 */
@Component({
  selector: 'app-vertical-navigation',
  templateUrl: './vertical.html',
  styleUrls: ['./vertical.sass'],
  animations: sharedAnimations,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'VerticalNavigation',
  imports: [
    ScrollbarDirective,
    VerticalNavigationAsideItemComponent,
    VerticalNavigationBasicItemComponent,
    VerticalNavigationCollapsableItemComponent,
    VerticalNavigationDividerItemComponent,
    VerticalNavigationGroupItemComponent,
    VerticalNavigationSpacerItemComponent,
  ],
})
export class VerticalNavigationComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  static ngAcceptInputType_inner: BooleanInput;
  static ngAcceptInputType_opened: BooleanInput;
  static ngAcceptInputType_transparentOverlay: BooleanInput;

  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _document = inject(DOCUMENT);
  private _elementRef = inject(ElementRef);
  private _renderer2 = inject(Renderer2);
  private _router = inject(Router);
  private _scrollStrategyOptions = inject(ScrollStrategyOptions);
  private _navigationService = inject(SharedNavigationService);
  private _utilsService = inject(SharedUtilsService);
  private _destroyRef = inject(DestroyRef);

  // Modern input signals
  appearance = input<VerticalNavigationAppearance>('default');
  autoCollapse = input<boolean>(true);
  inner = input<boolean>(false);
  mode = input<VerticalNavigationMode>('side');
  name = input<string>(this._utilsService.randomId());
  navigation = input<NavigationItem[]>([]);
  opened = input<boolean>(true);
  position = input<VerticalNavigationPosition>('left');
  transparentOverlay = input<boolean>(false);

  // Internal writable signals for state management
  private _inner = signal<boolean>(false);
  private _opened = signal<boolean>(true);
  private _transparentOverlay = signal<boolean>(false);
  private _name = signal<string>(this._utilsService.randomId());

  // Modern output signals
  appearanceChanged = output<VerticalNavigationAppearance>();
  modeChanged = output<VerticalNavigationMode>();
  openedChanged = output<boolean>();
  positionChanged = output<VerticalNavigationPosition>();

  @ViewChild('navigationContent') private _navigationContentEl: ElementRef | undefined;

  // Internal signals
  private _activeAsideItemId = signal<string | null>(null);
  private _animationsEnabled = signal<boolean>(false);
  private _hovered = signal<boolean>(false);

  // Computed values
  activeAsideItemId = computed(() => this._activeAsideItemId());
  animationsEnabled = computed(() => this._animationsEnabled());
  hovered = computed(() => this._hovered());

  // Public properties for backward compatibility
  onCollapsableItemCollapsed: ReplaySubject<NavigationItem> = new ReplaySubject<NavigationItem>(1);
  onCollapsableItemExpanded: ReplaySubject<NavigationItem> = new ReplaySubject<NavigationItem>(1);
  onRefreshed: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);

  // Private properties
  private _asideOverlay: HTMLElement | undefined;
  private readonly _handleAsideOverlayClick: () => void;
  private readonly _handleOverlayClick: () => void;
  private _mutationObserver: MutationObserver | undefined;
  private _overlay: HTMLElement | undefined;
  private _scrollStrategy: ScrollStrategy = this._scrollStrategyOptions.block();
  private _ScrollbarDirectives!: QueryList<ScrollbarDirective>;
  private _ScrollbarDirectivesSubscription: Subscription | undefined;

  /**
   * Constructor
   */
  constructor() {
    this._handleAsideOverlayClick = (): void => {
      this.closeAside();
    };
    this._handleOverlayClick = (): void => {
      this.close();
    };
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Host binding for component classes
   */
  @HostBinding('class') get classList(): Record<string, boolean> {
    return {
      'vertical-navigation-animations-enabled': this.animationsEnabled(),
      [`vertical-navigation-appearance-${this.appearance()}`]: true,
      'vertical-navigation-hover': this.hovered(),
      'vertical-navigation-inner': this.inner(),
      'vertical-navigation-mode-over': this.mode() === 'over',
      'vertical-navigation-mode-side': this.mode() === 'side',
      'vertical-navigation-opened': this.opened(),
      'vertical-navigation-position-left': this.position() === 'left',
      'vertical-navigation-position-right': this.position() === 'right',
    };
  }

  /**
   * Host binding for component inline styles
   */
  @HostBinding('style') get styleList(): Record<string, string> {
    return {
      visibility: this.opened() ? 'visible' : 'hidden',
    };
  }

  /**
   * Setter for ScrollbarDirectives
   */
  @ViewChildren(ScrollbarDirective)
  set ScrollbarDirectives(ScrollbarDirectives: QueryList<ScrollbarDirective>) {
    // Store the directives
    this._ScrollbarDirectives = ScrollbarDirectives;

    // Return if there are no directives
    if (ScrollbarDirectives.length === 0) {
      return;
    }

    // Unsubscribe the previous subscriptions
    if (this._ScrollbarDirectivesSubscription) {
      this._ScrollbarDirectivesSubscription.unsubscribe();
    }

    // Update the scrollbars on collapsable items' collapse/expand
    this._ScrollbarDirectivesSubscription = merge(
      this.onCollapsableItemCollapsed,
      this.onCollapsableItemExpanded,
    )
      .pipe(takeUntilDestroyed(this._destroyRef), delay(250))
      .subscribe(() => {
        // Loop through the scrollbars and update them
        ScrollbarDirectives.forEach((ScrollbarDirective) => {
          ScrollbarDirective.update();
        });
      });
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Decorated methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * On mouseenter
   */
  @HostListener('mouseenter')
  onMouseenter(): void {
    // Enable the animations
    this._enableAnimations();

    // Set the hovered
    this._hovered.set(true);
  }

  /**
   * On mouseleave
   */
  @HostListener('mouseleave')
  onMouseleave(): void {
    // Enable the animations
    this._enableAnimations();

    // Set the hovered
    this._hovered.set(false);
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Appearance
    if ('appearance' in changes) {
      this.appearanceChanged.emit(changes['appearance'].currentValue);
    }

    // Inner
    if ('inner' in changes) {
      this._inner.set(coerceBooleanProperty(changes['inner'].currentValue));
    }

    // Mode
    if ('mode' in changes) {
      const currentMode = changes['mode'].currentValue;
      const previousMode = changes['mode'].previousValue;

      // Disable the animations
      this._disableAnimations();

      // Handle mode changes
      if (previousMode === 'over' && currentMode === 'side') {
        this._hideOverlay();
      }

      if (previousMode === 'side' && currentMode === 'over') {
        this.closeAside();
        if (this.opened()) {
          this._showOverlay();
        }
      }

      this.modeChanged.emit(currentMode);

      // Enable animations after delay
      setTimeout(() => {
        this._enableAnimations();
      }, 500);
    }

    // Navigation
    if ('navigation' in changes) {
      this._changeDetectorRef.markForCheck();
    }

    // Opened
    if ('opened' in changes) {
      const opened = coerceBooleanProperty(changes['opened'].currentValue);
      this._toggleOpened(opened);
    }

    // Position
    if ('position' in changes) {
      this.positionChanged.emit(changes['position'].currentValue);
    }

    // Transparent overlay
    if ('transparentOverlay' in changes) {
      this._transparentOverlay.set(
        coerceBooleanProperty(changes['transparentOverlay'].currentValue),
      );
    }
  }

  /**
   * On init
   */
  ngOnInit(): void {
    // Make sure the name input is not an empty string
    if (this.name() === '') {
      this._name.set(this._utilsService.randomId());
    }

    // Register the navigation component
    this._navigationService.registerComponent(this.name(), this);

    // Subscribe to the 'NavigationEnd' event
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(() => {
        // If the mode is 'over' and the navigation is opened...
        if (this.mode() === 'over' && this.opened()) {
          this.close();
        }

        // If the mode is 'side' and the aside is active...
        if (this.mode() === 'side' && this.activeAsideItemId()) {
          this.closeAside();
        }
      });
  }

  /**
   * After view init
   */
  ngAfterViewInit(): void {
    this._setupMutationObserver();
    this._scrollToActiveItem();
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Disconnect the mutation observer
    this._mutationObserver?.disconnect();

    // Forcefully close the navigation and aside in case they are opened
    this.close();
    this.closeAside();

    // Deregister the navigation component from the registry
    this._navigationService.deregisterComponent(this.name());

    // Cleanup is handled automatically by takeUntilDestroyed
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Refresh the component to apply the changes
   */
  refresh(): void {
    this._changeDetectorRef.markForCheck();
    this.onRefreshed.next(true);
  }

  /**
   * Open the navigation
   */
  open(): void {
    if (this.opened()) {
      return;
    }
    this._toggleOpened(true);
  }

  /**
   * Close the navigation
   */
  close(): void {
    if (!this.opened()) {
      return;
    }
    this.closeAside();
    this._toggleOpened(false);
  }

  /**
   * Toggle the navigation
   */
  toggle(): void {
    if (this.opened()) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open the aside
   */
  openAside(item: NavigationItem): void {
    if (item.disabled || !item.id) {
      return;
    }

    this._activeAsideItemId.set(item.id);
    this._showAsideOverlay();
    this._changeDetectorRef.markForCheck();
  }

  /**
   * Close the aside
   */
  closeAside(): void {
    this._activeAsideItemId.set(null);
    this._hideAsideOverlay();
    this._changeDetectorRef.markForCheck();
  }

  /**
   * Toggle the aside
   */
  toggleAside(item: NavigationItem): void {
    if (this.activeAsideItemId() === item.id) {
      this.closeAside();
    } else {
      this.openAside(item);
    }
  }

  /**
   * Track by function for ngFor loops
   */
  trackByFn(index: number, item: NavigationItem): number | string {
    return item.id || index;
  }

  /**
   * Get current navigation state
   */
  getNavigationState() {
    return {
      appearance: this.appearance(),
      autoCollapse: this.autoCollapse(),
      inner: this.inner(),
      mode: this.mode(),
      name: this.name(),
      navigation: this.navigation(),
      opened: this.opened(),
      position: this.position(),
      transparentOverlay: this.transparentOverlay(),
      activeAsideItemId: this.activeAsideItemId(),
      animationsEnabled: this.animationsEnabled(),
      hovered: this.hovered(),
    };
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Enable the animations
   */
  private _enableAnimations(): void {
    if (this._animationsEnabled()) {
      return;
    }
    this._animationsEnabled.set(true);
  }

  /**
   * Disable the animations
   */
  private _disableAnimations(): void {
    if (!this._animationsEnabled()) {
      return;
    }
    this._animationsEnabled.set(false);
  }

  /**
   * Setup mutation observer
   */
  private _setupMutationObserver(): void {
    this._mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const mutationTarget = mutation.target as HTMLElement;
        if (mutation.attributeName === 'class') {
          if (mutationTarget.classList.contains('cdk-global-scrollblock')) {
            const top = parseInt(mutationTarget.style.top, 10);
            this._renderer2.setStyle(
              this._elementRef.nativeElement,
              'margin-top',
              `${Math.abs(top)}px`,
            );
          } else {
            this._renderer2.setStyle(this._elementRef.nativeElement, 'margin-top', null);
          }
        }
      });
    });
    this._mutationObserver.observe(this._document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  /**
   * Scroll to active item
   */
  private _scrollToActiveItem(): void {
    setTimeout(() => {
      if (!this._navigationContentEl) {
        return;
      }

      if (!this._navigationContentEl.nativeElement.classList.contains('ps')) {
        const activeItem = this._navigationContentEl.nativeElement.querySelector(
          '.vertical-navigation-item-active',
        );

        if (activeItem) {
          activeItem.scrollIntoView();
        }
      } else {
        this._ScrollbarDirectives.forEach((ScrollbarDirective) => {
          if (!ScrollbarDirective.isInitialized()) {
            return;
          }

          const activeElement = this._navigationContentEl?.nativeElement.querySelector(
            '.vertical-navigation-item-active',
          );
          if (activeElement) {
            ScrollbarDirective.scrollToElement(activeElement as HTMLElement, -120);
          }
        });
      }
    });
  }

  /**
   * Show the overlay
   */
  private _showOverlay(): void {
    if (this._asideOverlay) {
      return;
    }

    this._overlay = this._renderer2.createElement('div');
    this._overlay?.classList.add('vertical-navigation-overlay');

    if (this.transparentOverlay()) {
      this._overlay?.classList.add('vertical-navigation-overlay-transparent');
    }

    this._renderer2.appendChild(this._elementRef.nativeElement.parentElement, this._overlay);
    this._scrollStrategy.enable();

    // Use CSS animation instead of AnimationBuilder
    this._overlay?.addEventListener('click', this._handleOverlayClick);
  }

  /**
   * Hide the overlay
   */
  private _hideOverlay(): void {
    if (!this._overlay) {
      return;
    }

    // Use CSS animation instead of AnimationBuilder
    if (this._overlay) {
      this._overlay.removeEventListener('click', this._handleOverlayClick);
      this._overlay?.parentNode?.removeChild(this._overlay);
      this._overlay = undefined;
    }
    this._scrollStrategy.disable();
  }

  /**
   * Show the aside overlay
   */
  private _showAsideOverlay(): void {
    if (this._asideOverlay) {
      return;
    }

    this._asideOverlay = this._renderer2.createElement('div');
    this._asideOverlay?.classList.add('vertical-navigation-aside-overlay');
    this._renderer2.appendChild(this._elementRef.nativeElement.parentElement, this._asideOverlay);

    // Use CSS animation instead of AnimationBuilder
    this._asideOverlay?.addEventListener('click', this._handleAsideOverlayClick);
  }

  /**
   * Hide the aside overlay
   */
  private _hideAsideOverlay(): void {
    if (!this._asideOverlay) {
      return;
    }

    // Use CSS animation instead of AnimationBuilder
    if (this._asideOverlay) {
      this._asideOverlay?.removeEventListener('click', this._handleAsideOverlayClick);
      this._asideOverlay?.parentNode?.removeChild(this._asideOverlay);
      this._asideOverlay = undefined;
    }
  }

  /**
   * Open/close the navigation
   */
  private _toggleOpened(open: boolean): void {
    this._opened.set(open);
    this._enableAnimations();

    if (this.mode() === 'over') {
      if (this.opened()) {
        this._showOverlay();
      } else {
        this._hideOverlay();
      }
    }

    this.openedChanged.emit(open);
  }
}
