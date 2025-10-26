import { Component, inject, viewChild } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';
import { DeviceService } from '../../lib/ngm-dev-blocks/utils/services/device.service';
import { cx } from '../../lib/ngm-dev-blocks/utils/functions/cx';
interface NavigationItem {
  name: string;
  href: string;
  current: boolean;
}

interface UserNavigationItem {
  name: string;
  href: string;
}

interface User {
  name: string;
  email: string;
  imageUrl: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
  host: {
    class: 'app-header',
  },
})
export class AppHeaderComponent {
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
    { name: 'Dashboard', href: '#', current: true },
    { name: 'Team', href: '#', current: false },
    { name: 'Projects', href: '#', current: false },
    { name: 'Calendar', href: '#', current: false },
    { name: 'Reports', href: '#', current: false },
  ];

  userNavigation: UserNavigationItem[] = [
    { name: 'Your Profile', href: '#' },
    { name: 'Settings', href: '#' },
    { name: 'Sign out', href: '#' },
  ];

  protected readonly cx = cx;

  toggleMenu(): void {
    this.drawer().toggle();
  }
}
