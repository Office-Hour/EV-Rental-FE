import { BooleanInput } from '@angular/cdk/coercion';
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
import { MatIconModule } from '@angular/material/icon';
import { SharedNavigationService } from '../../../../../services/navigation/navigation.service';
import { NavigationItem } from '../../../../../services/navigation/navigation.types';
import { VerticalNavigationComponent } from '../../vertical';
import { VerticalNavigationBasicItemComponent } from '../basic/basic.component';
import { VerticalNavigationCollapsableItemComponent } from '../collapsable/collapsable.component';
import { VerticalNavigationDividerItemComponent } from '../divider/divider.component';
import { VerticalNavigationSpacerItemComponent } from '../spacer/spacer.component';

/**
 * Modern vertical navigation group item component using Angular 20 best practices
 */
@Component({
  selector: 'vertical-navigation-group-item',
  templateUrl: './group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    VerticalNavigationBasicItemComponent,
    VerticalNavigationCollapsableItemComponent,
    VerticalNavigationSpacerItemComponent,
    VerticalNavigationDividerItemComponent,
  ],
})
export class VerticalNavigationGroupItemComponent implements OnInit, OnDestroy {
  /* eslint-disable @typescript-eslint/naming-convention */
  static ngAcceptInputType_autoCollapse: BooleanInput;
  /* eslint-enable @typescript-eslint/naming-convention */

  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _sharedNavigationService = inject(SharedNavigationService);
  private _destroyRef = inject(DestroyRef);

  // Modern input signals
  autoCollapse = input<boolean>(true);
  item = input<NavigationItem>({} as NavigationItem);
  name = input<string>('');

  // Computed values
  children = computed(() => this.item().children || []);

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
   * Track by function for ngFor loops
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  /**
   * Get current group state
   */
  getGroupState() {
    return {
      item: this.item(),
      name: this.name(),
      autoCollapse: this.autoCollapse(),
      children: this.children(),
    };
  }
}
