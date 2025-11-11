import { AsyncPipe } from '@angular/common';
import { Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../core-logic/auth/auth.service';
import { UserService } from '../core-logic/user/user.service';
import { cx } from '../lib/ngm-dev-blocks/utils/functions/cx';
import { DeviceService } from '../lib/ngm-dev-blocks/utils/services/device.service';

const AUTH_ROUTE_PATHS = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/confirmation-required',
  '/error-page',
  '/sign-out',
];

const FULL_WIDTH_ROUTE_PATHS = ['/', '/landing', ...AUTH_ROUTE_PATHS];

interface UserNavigationItem {
  name: string;
  href: string;
  icon?: string;
  action?: () => void;
}

interface GuestNavigationItem {
  name: string;
  href: string;
  icon?: string;
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatMenuModule,
    MatSidenavModule,
    AsyncPipe,
    MatListModule,
    RouterLink,
    RouterOutlet,
  ],
})
export class LayoutComponent {
  readonly drawer = viewChild.required<MatDrawer>('drawer');
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private deviceService = inject(DeviceService);
  isHandset$ = this.deviceService.isHandset$;
  private readonly authRoutes = AUTH_ROUTE_PATHS;
  private readonly fullWidthRoutes = FULL_WIDTH_ROUTE_PATHS;

  // Reactive current URL signal - ensure we always have a value
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => (event as NavigationEnd).url),
      startWith(this.router.url || '/'),
    ),
    { initialValue: this.router.url || '/' },
  );

  // Navigation data cho từng role
  private navigationData = {
    renter: [
      { name: 'Thuê xe', href: '/booking', current: false, icon: 'directions_car' },
      { name: 'Đơn thuê của tôi', href: '/orders', current: false, icon: 'list_alt' },
      { name: 'Báo cáo', href: '/reports', current: false, icon: 'analytics' },
    ],
    staff: [
      { name: 'Booking Management', href: '/staff/bookings', current: false, icon: 'event_note' },
      { name: 'Quản lý xe', href: '/staff/vehicles', current: false, icon: 'car_rental' },
      { name: 'Quản lý người thuê', href: '/staff/renters', current: false, icon: 'group' },
      { name: 'Rental Management', href: '/staff/rentals', current: false, icon: 'assignment' },
      { name: 'Báo cáo', href: '/staff/reports', current: false, icon: 'analytics' },
    ],
    admin: [
      { name: 'Quản lý người dùng', href: '/admin/users', current: false, icon: 'group' },
      { name: 'Quản lý xe', href: '/admin/vehicles', current: false, icon: 'car_rental' },
      { name: 'Quản lý đơn thuê', href: '/admin/orders', current: false, icon: 'assignment' },
      { name: 'Báo cáo', href: '/admin/reports', current: false, icon: 'analytics' },
      { name: 'Cài đặt hệ thống', href: '/admin/settings', current: false, icon: 'settings' },
    ],
  };

  // User navigation data
  private readonly userNavigationData: UserNavigationItem[] = [
    { name: 'Thông tin cá nhân', href: '/profile', icon: 'person' },
    { name: 'Cài đặt', href: '/settings', icon: 'settings' },
    { name: 'Đăng xuất', href: '/sign-out', icon: 'logout', action: () => this.signOut() },
  ];

  // Guest navigation data
  private readonly guestNavigationData: GuestNavigationItem[] = [
    { name: 'Đăng nhập', href: '/sign-in', icon: 'login' },
  ];

  // Computed signals
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated);
  readonly currentUser = computed(() => this.userService.user);
  readonly userRole = computed(() => this.userService.userRole);
  private readonly currentPath = computed(() => this.currentUrl().split('?')[0]);

  // Navigation computed signal - ensures data is ready before UI loads
  readonly navigation = computed(() => {
    const currentUrl = this.currentUrl();
    const isAuth = this.isAuthenticated();
    const role = this.userRole();

    const navigationItems = isAuth
      ? role
        ? this.navigationData[role as keyof typeof this.navigationData] ||
          this.navigationData.renter
        : this.navigationData.renter
      : [];

    return this.updateCurrentRoute(navigationItems, currentUrl);
  });

  private updateCurrentRoute(items: typeof this.navigationData.renter, currentUrl: string) {
    return items.map((item) => ({
      ...item,
      current: currentUrl.startsWith(item.href),
    }));
  }

  readonly userNavigation = computed(() => this.userNavigationData);
  readonly guestNavigation = computed(() => this.guestNavigationData);
  readonly isFullWidthPage = computed(() =>
    this.fullWidthRoutes.some((route) => this.currentPath().startsWith(route)),
  );
  readonly isAuthFlowPage = computed(() =>
    this.authRoutes.some((route) => this.currentPath().startsWith(route)),
  );
  readonly toolbarContainerClasses = computed(() =>
    this.cx(
      'flex-1 w-full flex items-center px-4 sm:px-6 lg:px-8',
      this.isFullWidthPage() ? '' : 'max-w-7xl mx-auto',
    ),
  );
  readonly contentContainerClasses = computed(() =>
    this.cx(
      'bg-surface-variant flex-1 w-full',
      this.isFullWidthPage() ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
      this.isAuthFlowPage() ? 'px-4 sm:px-6 lg:px-8' : '',
    ),
  );
  readonly footerContainerClasses = computed(() =>
    this.cx(
      'w-full px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between',
      this.isFullWidthPage() ? '' : 'max-w-7xl mx-auto',
    ),
  );

  protected readonly cx = cx;

  toggleMenu(): void {
    if (this.isAuthFlowPage()) {
      return;
    }

    this.drawer().toggle();
  }

  private signOut(): void {
    this.router.navigate(['/sign-out']);
  }
}
