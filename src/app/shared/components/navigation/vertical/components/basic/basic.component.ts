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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { SharedNavigationService } from '../../../../../services/navigation/navigation.service';
import { NavigationItem } from '../../../../../services/navigation/navigation.types';
import { SharedUtilsService } from '../../../../../services/utils/utils.service';
import { VerticalNavigationComponent } from '../../vertical';

/**
 * Modern vertical navigation basic item component using Angular 20 best practices
 */
@Component({
  selector: 'vertical-navigation-basic-item',
  templateUrl: './basic.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatTooltipModule, NgTemplateOutlet, MatIconModule],
})
export class VerticalNavigationBasicItemComponent implements OnInit {
  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _sharedNavigationService = inject(SharedNavigationService);
  private _sharedUtilsService = inject(SharedUtilsService);
  private _destroyRef = inject(DestroyRef);

  // Modern input signals
  item = input<NavigationItem>({} as NavigationItem);
  name = input<string>('');

  // Computed values
  isActiveMatchOptions = computed<IsActiveMatchOptions>(() => {
    const currentItem = this.item();
    return (currentItem.isActiveMatchOptions ?? currentItem.exactMatch)
      ? this._sharedUtilsService.exactMatchOptions
      : this._sharedUtilsService.subsetMatchOptions;
  });

  // Internal state
  private _verticalNavigationComponent: VerticalNavigationComponent =
    {} as VerticalNavigationComponent;

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Get the parent navigation component
    this._verticalNavigationComponent = this._sharedNavigationService.getComponent(this.name());

    // Subscribe to onRefreshed on the navigation component
    this._verticalNavigationComponent.onRefreshed
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => {
        this._changeDetectorRef.markForCheck();
      });
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get current item state
   */
  getItemState() {
    return {
      item: this.item(),
      name: this.name(),
      isActiveMatchOptions: this.isActiveMatchOptions(),
    };
  }
}
