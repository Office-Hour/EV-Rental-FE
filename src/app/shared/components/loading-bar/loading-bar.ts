import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedLoadingService } from '../../services/loading/loading.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'loading-bar',
  imports: [MatProgressBarModule],
  standalone: true,
  templateUrl: './loading-bar.html',
  styleUrl: './loading-bar.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingBar {
  private _loadingService = inject(SharedLoadingService);
  private _destroyRef = inject(DestroyRef);

  // Input signals
  autoMode = input<boolean>(true);

  // Internal signals
  mode = signal<'determinate' | 'indeterminate'>('indeterminate');
  progress = signal<number>(0);
  show = signal<boolean>(false);

  // Computed values
  currentMode = computed(() => this.mode());
  currentProgress = computed(() => this.progress());
  isVisible = computed(() => this.show());

  constructor() {
    this._setupSubscriptions();
    this._setupAutoModeWatcher();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Setup service subscriptions
   */
  private _setupSubscriptions(): void {
    // Mode subscription
    this._loadingService.mode$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((value) => {
      this.mode.set(value);
    });

    // Progress subscription
    this._loadingService.progress$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((value) => {
      this.progress.set(value);
    });

    // Show subscription
    this._loadingService.show$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((value) => {
      this.show.set(value);
    });
  }

  /**
   * Setup auto mode watcher
   */
  private _setupAutoModeWatcher(): void {
    effect(() => {
      const autoMode = this.autoMode();
      this._loadingService.setAutoMode(autoMode);
    });
  }
}
