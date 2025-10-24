/* eslint-disable @angular-eslint/component-selector */
import { NgClass } from '@angular/common';
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
import { SharedNavigationService } from '../../../../../services/navigation/navigation.service';
import { NavigationItem } from '../../../../../services/navigation/navigation.types';
import { HorizontalNavigationComponent } from '../../horizontal';

@Component({
  selector: 'horizontal-navigation-divider-item',
  templateUrl: './divider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorizontalNavigationDividerItemComponent implements OnInit {
  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _sharedNavigationService = inject(SharedNavigationService);
  private _destroyRef = inject(DestroyRef);

  // Inputs as signals
  item = input<NavigationItem>({} as NavigationItem);
  name = input<string>('');

  // State
  private _horizontalNavigationComponent: HorizontalNavigationComponent =
    {} as HorizontalNavigationComponent;
  dividerClass = computed(() => '');

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Get the parent navigation component
    this._horizontalNavigationComponent = this._sharedNavigationService.getComponent(this.name());

    // Subscribe to onRefreshed on the navigation component
    this._horizontalNavigationComponent.onRefreshed
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => {
        this._changeDetectorRef.markForCheck();
      });
  }
}
