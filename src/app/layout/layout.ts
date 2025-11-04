import { AsyncPipe } from '@angular/common';
import { Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
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
    customer: [
      { name: 'Thuê xe', href: '/booking', current: false, icon: 'directions_car' },
      { name: 'Đơn thuê của tôi', href: '/orders', current: false, icon: 'list_alt' },
      { name: 'Báo cáo', href: '/reports', current: false, icon: 'analytics' },
    ],
    staff: [
      { name: 'Quản lý xe', href: '/staff/vehicles', current: false, icon: 'car_rental' },
      { name: 'Quản lý khách hàng', href: '/staff/customers', current: false, icon: 'group' },
      { name: 'Quản lý đơn thuê', href: '/staff/orders', current: false, icon: 'assignment' },
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

  // Navigation computed signal - ensures data is ready before UI loads
  readonly navigation = computed(() => {
    const currentUrl = this.currentUrl();
    const isAuth = this.isAuthenticated();
    const role = this.userRole();

    const navigationItems = isAuth
      ? role
        ? this.navigationData[role as keyof typeof this.navigationData] ||
          this.navigationData.customer
        : this.navigationData.customer
      : [];

    return this.updateCurrentRoute(navigationItems, currentUrl);
  });

  private updateCurrentRoute(items: typeof this.navigationData.customer, currentUrl: string) {
    return items.map((item) => ({
      ...item,
      current: currentUrl.startsWith(item.href),
    }));
  }

  readonly userNavigation = computed(() => this.userNavigationData);
  readonly guestNavigation = computed(() => this.guestNavigationData);

  protected readonly cx = cx;

  toggleMenu(): void {
    this.drawer().toggle();
  }

  private signOut(): void {
    this.authService.signOut().subscribe(() => {
      this.router.navigate(['/sign-in']);
    });
  }
}
