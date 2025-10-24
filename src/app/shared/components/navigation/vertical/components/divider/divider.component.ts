import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedNavigationService } from '../../../../../services/navigation/navigation.service';
import { NavigationItem } from '../../../../../services/navigation/navigation.types';
import { VerticalNavigationComponent } from '../../vertical';

/**
 * Modern vertical navigation divider item component using Angular 20 best practices
 */
@Component({
  selector: 'vertical-navigation-divider-item',
  templateUrl: './divider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerticalNavigationDividerItemComponent implements OnInit, OnDestroy {
  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _sharedNavigationService = inject(SharedNavigationService);
  private _destroyRef = inject(DestroyRef);

  // Modern input signals
  item = input<NavigationItem>({} as NavigationItem);
  name = input<string>('');

  // Computed values - divider items don't have special classes in the interface
  dividerClass = computed(() => '');

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

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Cleanup is handled automatically by takeUntilDestroyed
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get current divider state
   */
  getDividerState() {
    return {
      item: this.item(),
      name: this.name(),
      dividerClass: this.dividerClass(),
    };
  }
}
