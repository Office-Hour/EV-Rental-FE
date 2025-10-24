import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  HostListener,
  inject,
  input,
  Renderer2,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { combineLatest, map, tap } from 'rxjs';
import { NavigationService } from '../core/navigation/navigation.service';
import { LoadingBar } from '../shared/components/loading-bar/loading-bar';
import { HorizontalNavigationComponent } from '../shared/components/navigation/horizontal/horizontal';
import { VerticalNavigationComponent } from '../shared/components/navigation/vertical/vertical';
import { SharedConfigService } from '../shared/services/config/config.service';
import { Config, Scheme, Theme } from '../shared/services/config/config.types';
import { MediaWatcherService } from '../shared/services/media-watcher/media-watcher.service';
import { SharedNavigationService } from '../shared/services/navigation/navigation.service';
import { NavigationComponent } from '../shared/services/navigation/navigation.types';
import { SharedPlatformService } from '../shared/services/platform/platform.service';
import { EV_VERSION } from '../shared/services/version/ev-version';

/**
 * Modern layout component using Angular 20 best practices
 */
@Component({
  selector: 'app-layout',
  imports: [
    LoadingBar,
    VerticalNavigationComponent,
    HorizontalNavigationComponent,
    MatIcon,
    RouterOutlet,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.sass',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Layout {
  private _configService = inject(SharedConfigService);
  private _mediaWatcherService = inject(MediaWatcherService);
  private _renderer2 = inject(Renderer2);
  private _document = inject(DOCUMENT);
  private _platformService = inject(SharedPlatformService);
  private _sharedNavigationService = inject(SharedNavigationService);
  private _navigationService = inject(NavigationService);
  private _destroyRef = inject(DestroyRef);

  // Modern input signals
  scrollThreshold = input<number>(100);

  // Internal signals
  private _config = signal<Config>(this._configService.config);
  private _scheme = signal<Scheme>('light');
  private _theme = signal<Theme>('theme-default');
  private _navigation = signal<NavigationComponent | null>(null);
  private _isScreenSmall = signal<boolean>(false);
  private _isScrolled = signal<boolean>(false);

  // Public properties (for backward compatibility)
  navigation: NavigationComponent | null = null;
  isScreenSmall = false;
  isScrolled = false;

  // Computed values
  config = computed(() => this._config());
  scheme = computed(() => this._scheme());
  theme = computed(() => this._theme());
  currentYear = computed(() => new Date().getFullYear());

  constructor() {
    this._initializeApp();
    this._setupMediaQueryWatcher();
    this._setupNavigationWatcher();
    this._setupMediaWatcher();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Toggle navigation
   */
  toggleNavigation(name: string): void {
    const navigation = this._sharedNavigationService.getComponent(name);
    if (navigation && navigation.toggle) {
      navigation.toggle();
    }
  }

  /**
   * Handle window scroll events
   */
  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const isScrolled = scrollTop > this.scrollThreshold();
    this._isScrolled.set(isScrolled);
    this.isScrolled = isScrolled; // Update public property for backward compatibility
  }

  /**
   * Get current layout state
   */
  getLayoutState() {
    return {
      config: this.config(),
      scheme: this.scheme(),
      theme: this.theme(),
      navigation: this.navigation,
      isScreenSmall: this.isScreenSmall,
      isScrolled: this.isScrolled,
      currentYear: this.currentYear(),
    };
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Initialize app settings
   */
  private _initializeApp(): void {
    try {
      // Set the app version
      const ngVersionElement = this._document.querySelector('[ng-version]');
      if (ngVersionElement) {
        this._renderer2.setAttribute(ngVersionElement, 'ev-version', EV_VERSION);
      }

      // Set the OS name
      this._renderer2.addClass(this._document.body, this._platformService.osName);
    } catch (error) {
      console.error('Failed to initialize app settings:', error);
    }
  }

  /**
   * Setup media query watcher for theme/scheme changes
   */
  private _setupMediaQueryWatcher(): void {
    combineLatest([
      this._configService.config$,
      this._mediaWatcherService.onMediaQueryChange$([
        '(prefers-color-scheme: dark)',
        '(prefers-color-scheme: light)',
      ]),
    ])
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        map(([config, mql]) => {
          const options = {
            scheme: config.scheme,
            theme: config.theme,
          };

          // Auto scheme detection
          if (config.scheme === 'auto') {
            options.scheme = mql.breakpoints['(prefers-color-scheme: dark)'] ? 'dark' : 'light';
          }

          return options;
        }),
        tap((options) => {
          this._scheme.set(options.scheme);
          this._theme.set(options.theme);
          this._updateScheme();
          this._updateTheme();
        }),
      )
      .subscribe();
  }

  /**
   * Setup navigation watcher
   */
  private _setupNavigationWatcher(): void {
    this._navigationService.navigation$
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((navigation) => {
        this._navigation.set(navigation);
        this.navigation = navigation; // Update public property for backward compatibility
      });
  }

  /**
   * Setup media watcher for screen size changes
   */
  private _setupMediaWatcher(): void {
    this._mediaWatcherService.onMediaChange$
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(({ matchingAliases }) => {
        const isSmall = !matchingAliases.includes('md');
        this._isScreenSmall.set(isSmall);
        this.isScreenSmall = isSmall; // Update public property for backward compatibility
      });
  }

  /**
   * Update scheme classes
   */
  private _updateScheme(): void {
    try {
      this._document.body.classList.remove('light', 'dark');
      this._document.body.classList.add(this.scheme());
    } catch (error) {
      console.error('Error updating scheme:', error);
    }
  }

  /**
   * Update theme classes
   */
  private _updateTheme(): void {
    try {
      // Remove existing theme classes
      const themeClasses = Array.from(this._document.body.classList).filter((className) =>
        className.startsWith('theme-'),
      );

      themeClasses.forEach((className) => {
        this._document.body.classList.remove(className);
      });

      // Add new theme class
      this._document.body.classList.add(this.theme());
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  }
}
