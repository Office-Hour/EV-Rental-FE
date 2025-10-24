/* eslint-disable @angular-eslint/component-selector */
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedNavigationService } from '../../../../../services/navigation/navigation.service';
import { SharedUtilsService } from '../../../../../services/utils/utils.service';
import { NavigationItem } from '../../../../../services/navigation/navigation.types';
import { HorizontalNavigationComponent } from '../../horizontal';

@Component({
  selector: 'horizontal-navigation-basic-item',
  templateUrl: './basic.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatTooltipModule,
    NgTemplateOutlet,
    MatMenuModule,
    MatIconModule,
  ],
})
export class HorizontalNavigationBasicItemComponent implements OnInit {
  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _sharedNavigationService = inject(SharedNavigationService);
  private _sharedUtilsService = inject(SharedUtilsService);
  private _destroyRef = inject(DestroyRef);

  // Inputs as signals
  item = input<NavigationItem>({} as NavigationItem);
  name = input<string>('');

  // Derived
  isActiveMatchOptions = computed<IsActiveMatchOptions>(() =>
    (this.item().isActiveMatchOptions ?? this.item().exactMatch)
      ? this._sharedUtilsService.exactMatchOptions
      : this._sharedUtilsService.subsetMatchOptions,
  );

  private _horizontalNavigationComponent: HorizontalNavigationComponent =
    {} as HorizontalNavigationComponent;

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Get the parent navigation component
    this._horizontalNavigationComponent = this._sharedNavigationService.getComponent(this.name());

    // Mark for check
    this._changeDetectorRef.markForCheck();

    // Subscribe to onRefreshed on the navigation component
    this._horizontalNavigationComponent.onRefreshed
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => {
        // Mark for check
        this._changeDetectorRef.markForCheck();
      });
  }
}
