import { BooleanInput } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { sharedAnimations } from '../../../../../animations/public-api';
import { SharedNavigationService } from '../../../../../services/navigation/navigation.service';
import { NavigationItem } from '../../../../../services/navigation/navigation.types';
import { VerticalNavigationComponent } from '../../vertical';
import { VerticalNavigationBasicItemComponent } from '../basic/basic.component';
import { VerticalNavigationDividerItemComponent } from '../divider/divider.component';
import { VerticalNavigationGroupItemComponent } from '../group/group.component';
import { VerticalNavigationSpacerItemComponent } from '../spacer/spacer.component';

/**
 * Modern vertical navigation collapsable item component using Angular 20 best practices
 */
@Component({
  selector: 'vertical-navigation-collapsable-item',
  templateUrl: './collapsable.component.html',
  animations: sharedAnimations,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    MatIconModule,
    VerticalNavigationBasicItemComponent,
    VerticalNavigationDividerItemComponent,
    VerticalNavigationGroupItemComponent,
    VerticalNavigationSpacerItemComponent,
  ],
})
export class VerticalNavigationCollapsableItemComponent implements OnInit {
  /* eslint-disable @typescript-eslint/naming-convention */
  static ngAcceptInputType_autoCollapse: BooleanInput;
  /* eslint-enable @typescript-eslint/naming-convention */

  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _router = inject(Router);
  private _sharedNavigationService = inject(SharedNavigationService);
  private _destroyRef = inject(DestroyRef);

  // Modern input signals
  item = input<NavigationItem>({} as NavigationItem);
  name = input<string>('');
  autoCollapse = input<boolean>(true);

  // Internal signals
  private _collapsed = signal<boolean>(false);
  private _collapsable = signal<boolean>(true);
  private _children = signal<NavigationItem[]>([]);

  // Computed values
  collapsed = computed(() => this._collapsed());
  collapsable = computed(() => this._collapsable());
  children = computed(() => this._children());

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

    // Set the collapsable - only true if type is 'collapsable' and has children
    this._collapsable.set(
      this.item().type === 'collapsable' && (this.item().children?.length ?? 0) > 0,
    );

    // Set the children
    this._children.set(this.item().children || []);

    // Set the collapsed - start with false, will be managed internally
    this._collapsed.set(false);

    // Subscribe to NavigationEnd event
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(() => {
        // Check if there is a match
        this._checkIfActive();
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
   * Toggle the collapsed status
   */
  toggleCollapsable(): void {
    // Return if the collapsable is false
    if (!this.collapsable()) {
      return;
    }

    // Toggle the collapsed
    this._collapsed.set(!this._collapsed());

    // Execute the observable
    if (this._collapsed()) {
      this._verticalNavigationComponent.onCollapsableItemCollapsed.next(this.item());
    } else {
      this._verticalNavigationComponent.onCollapsableItemExpanded.next(this.item());
    }
  }

  /**
   * Track by function for ngFor loops
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  /**
   * Get current collapsable state
   */
  getCollapsableState() {
    return {
      item: this.item(),
      name: this.name(),
      autoCollapse: this.autoCollapse(),
      collapsed: this.collapsed(),
      collapsable: this.collapsable(),
      children: this.children(),
    };
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Check if the item is active
   */
  private _checkIfActive(): void {
    // Get the current route
    let active = this._router.isActive(this.item().link || '', {
      paths: 'subset',
      queryParams: 'subset',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });

    // If the collapsable is collapsed...
    if (this.collapsable() && this.collapsed()) {
      // If the auto collapse is on...
      if (this.autoCollapse()) {
        // Expand it
        this._collapsed.set(false);

        // Execute the observable
        this._verticalNavigationComponent.onCollapsableItemExpanded.next(this.item());
      }
    }

    // If the collapsable is expanded...
    if (this.collapsable() && !this.collapsed()) {
      // If the auto collapse is on...
      if (this.autoCollapse()) {
        // Collapse it
        this._collapsed.set(true);

        // Execute the observable
        this._verticalNavigationComponent.onCollapsableItemCollapsed.next(this.item());
      }
    }
  }
}
