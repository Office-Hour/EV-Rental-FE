import { AsyncPipe } from '@angular/common';
import { Component, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { cx } from '../lib/ngm-dev-blocks/utils/functions/cx';
import { DeviceService } from '../lib/ngm-dev-blocks/utils/services/device.service';

interface NavigationItem {
  name: string;
  href: string;
  current: boolean;
  icon?: string;
}

interface UserNavigationItem {
  name: string;
  href: string;
  icon?: string;
}

interface User {
  name: string;
  email: string;
  imageUrl: string;
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

  private deviceService = inject(DeviceService);
  isHandset$ = this.deviceService.isHandset$;

  user: User = {
    name: 'John Doe',
    email: 'john@example.com',
    imageUrl:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  };

  navigation: NavigationItem[] = [
    //Customer
    { name: 'Thuê xe', href: '#', current: true, icon: 'directions_car' },
    { name: 'Đơn thuê', href: '#', current: false, icon: 'list_alt' },
    //Staff
    // { name: 'Quản lý xe', href: '#', current: false, icon: 'car_rental' },
    // { name: 'Quản lý khách hàng', href: '#', current: false, icon: 'group' },
    // { name: 'Quản lý đơn thuê', href: '#', current: false, icon: 'group' },
    //Admin
    // { name: 'Quản lý người dùng', href: '#', current: false, icon: 'group' },
    //All
    { name: 'Báo cáo', href: '#', current: false, icon: 'analytics' },
  ];

  userNavigation: UserNavigationItem[] = [
    { name: 'Your Profile', href: '#', icon: 'person' },
    { name: 'Settings', href: '#', icon: 'settings' },
    { name: 'Sign out', href: '#', icon: 'logout' },
  ];

  protected readonly cx = cx;

  toggleMenu(): void {
    this.drawer().toggle();
  }
}
