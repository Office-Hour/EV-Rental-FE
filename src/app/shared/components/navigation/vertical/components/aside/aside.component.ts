import { BooleanInput } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SharedNavigationService } from '../../../../../services/navigation/navigation.service';
import { NavigationItem } from '../../../../../services/navigation/navigation.types';
import { VerticalNavigationComponent } from '../../vertical';
import { VerticalNavigationBasicItemComponent } from '../basic/basic.component';
import { VerticalNavigationCollapsableItemComponent } from '../collapsable/collapsable.component';
import { VerticalNavigationDividerItemComponent } from '../divider/divider.component';
import { VerticalNavigationGroupItemComponent } from '../group/group.component';
import { VerticalNavigationSpacerItemComponent } from '../spacer/spacer.component';

/**
 * Modern vertical navigation aside item component using Angular 20 best practices
 */
@Component({
  selector: 'vertical-navigation-aside-item',
  templateUrl: './aside.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatTooltipModule,
    MatIconModule,
    VerticalNavigationBasicItemComponent,
    VerticalNavigationCollapsableItemComponent,
    VerticalNavigationDividerItemComponent,
    VerticalNavigationGroupItemComponent,
    VerticalNavigationSpacerItemComponent,
  ],
})
export class VerticalNavigationAsideItemComponent implements OnChanges, OnInit {
  /* eslint-disable @typescript-eslint/naming-convention */
  static ngAcceptInputType_autoCollapse: BooleanInput;
  static ngAcceptInputType_skipChildren: BooleanInput;
  /* eslint-enable @typescript-eslint/naming-convention */

  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _router = inject(Router);
  private _sharedNavigationService = inject(SharedNavigationService);
  private _destroyRef = inject(DestroyRef);

  // Modern input signals
  item = input<NavigationItem>({} as NavigationItem);
  name = input<string>('');
  activeItemId = input<string | null>(null);
  autoCollapse = input<boolean>(true);
  skipChildren = input<boolean>(false);

  // Computed values
  children = computed(() => this.item().children || []);
  isActive = computed(() => this.activeItemId() === this.item().id);

  // Internal state
  private _verticalNavigationComponent: VerticalNavigationComponent =
    {} as VerticalNavigationComponent;

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Active item ID
    if ('activeItemId' in changes) {
      this._changeDetectorRef.markForCheck();
    }
  }

  /**
   * On init
   */
  ngOnInit(): void {
    // Get the parent navigation component
    this._verticalNavigationComponent = this._sharedNavigationService.getComponent(this.name());

    // Subscribe to NavigationEnd event
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(() => {
        this._changeDetectorRef.markForCheck();
      });

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
   * Track by function for ngFor loops
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  /**
   * Get current aside state
   */
  getAsideState() {
    return {
      item: this.item(),
      name: this.name(),
      activeItemId: this.activeItemId(),
      autoCollapse: this.autoCollapse(),
      skipChildren: this.skipChildren(),
      children: this.children(),
      isActive: this.isActive(),
    };
  }
}
