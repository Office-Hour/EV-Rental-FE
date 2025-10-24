import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { sharedAnimations } from '../../../animations/public-api';
import { SharedNavigationService } from '../../../services/navigation/navigation.service';
import { NavigationItem } from '../../../services/navigation/navigation.types';
import { SharedUtilsService } from '../../../services/utils/utils.service';
import { HorizontalNavigationBasicItemComponent } from './components/basic/basic.component';
import { HorizontalNavigationBranchItemComponent } from './components/branch/branch.component';
import { HorizontalNavigationSpacerItemComponent } from './components/spacer/spacer.component';

@Component({
  selector: 'horizontal-navigation',
  templateUrl: './horizontal.html',
  styleUrls: ['./horizontal.sass'],
  animations: sharedAnimations,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'HorizontalNavigation',
  imports: [
    HorizontalNavigationBasicItemComponent,
    HorizontalNavigationBranchItemComponent,
    HorizontalNavigationSpacerItemComponent,
  ],
})
export class HorizontalNavigationComponent implements OnChanges, OnInit, OnDestroy {
  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _sharedNavigationService = inject(SharedNavigationService);
  private _sharedUtilsService = inject(SharedUtilsService);

  // Inputs as signals
  name = input<string>(this._sharedUtilsService.randomId());
  navigation = input<NavigationItem[]>([]);

  onRefreshed: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);

  // Derived
  items = computed(() => this.navigation());

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On changes
   *
   * @param changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Navigation
    if ('navigation' in changes) {
      // Mark for check
      this._changeDetectorRef.markForCheck();
    }
  }

  /**
   * On init
   */
  ngOnInit(): void {
    // Make sure the name input is not an empty string
    if (this.name() === '') {
      // Note: name is an input signal; ensure it has a value before register
      (this as any).name.set(this._sharedUtilsService.randomId());
    }

    // Register the navigation component
    this._sharedNavigationService.registerComponent(this.name(), this);
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Deregister the navigation component from the registry
    this._sharedNavigationService.deregisterComponent(this.name());
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Refresh the component to apply the changes
   */
  refresh(): void {
    // Mark for check
    this._changeDetectorRef.markForCheck();

    // Execute the observable
    this.onRefreshed.next(true);
  }

  /**
   * Track by function for ngFor loops
   *
   * @param index
   * @param item
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }
}
