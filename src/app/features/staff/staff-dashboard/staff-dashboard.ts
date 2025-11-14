import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EnvironmentInjector,
  ViewChild,
  afterNextRender,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';
import { BookingsService, StaffBookingRecord } from '../../../core-logic/bookings/bookings.service';
import {
  BOOKING_TABS,
  BookingCardViewModel,
  BookingStatusCounters,
  BookingTabKey,
  SelectedBookingViewModel,
} from './staff-dashboard.models';
import { StaffDashboardPresenter } from './staff-dashboard.presenter';

@Component({
  selector: 'app-staff-dashboard',
  imports: [MatIconModule],
  templateUrl: './staff-dashboard.html',
  styleUrl: './staff-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffDashboard {
  private readonly bookingsService = inject(BookingsService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly presenter = new StaffDashboardPresenter();
  @ViewChild('detailPanel') private detailPanel?: ElementRef<HTMLDivElement>;
  private activeDetailTrigger: HTMLElement | null = null;

  readonly tabs = BOOKING_TABS;
  readonly searchTerm = signal('');
  readonly activeTab = signal<BookingTabKey>('all');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly selectedBooking = signal<StaffBookingRecord | null>(null);

  readonly loading = computed(() => this.bookingsService.staffBookingsLoading());
  readonly error = computed(() => this.bookingsService.staffBookingsError());
  private readonly allRecords = computed(() => this.bookingsService.staffBookings());

  readonly statusCounters = computed<BookingStatusCounters>(() =>
    this.presenter.calculateStatusCounters(this.allRecords()),
  );

  private readonly filteredRecords = computed(() =>
    this.presenter.filterRecords({
      records: this.allRecords(),
      tab: this.activeTab(),
      query: this.searchTerm(),
    }),
  );

  readonly filteredCount = computed(() => this.filteredRecords().length);

  readonly cardViewModels = computed<BookingCardViewModel[]>(() =>
    this.presenter.buildCardViewModels(this.filteredRecords()),
  );

  readonly selectedBookingView = computed<SelectedBookingViewModel | null>(() =>
    this.presenter.buildSelectedBookingView(this.selectedBooking()),
  );

  private readonly focusDetailPanelEffect = effect(() => {
    if (!this.selectedBooking()) {
      return;
    }

    runInInjectionContext(this.environmentInjector, () => {
      afterNextRender(() => {
        this.detailPanel?.nativeElement.focus();
      });
    });
  });

  constructor() {
    effect(() => {
      this.bookingsService.staffBookings();
      this.bookingsService.staffBookingsLoading();
      this.bookingsService.staffBookingsError();
      queueMicrotask(() => this.cdr.detectChanges());
    });

    this.refresh();
  }

  refresh(): void {
    this.bookingsService.loadStaffBookings().pipe(take(1)).subscribe();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.onSearchChange(target?.value ?? '');
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  clearSearch(): void {
    if (this.searchTerm().length === 0) {
      return;
    }
    this.searchTerm.set('');
  }

  onTabSelect(tab: BookingTabKey): void {
    if (this.activeTab() === tab) {
      return;
    }
    this.activeTab.set(tab);
  }

  setViewMode(mode: 'grid' | 'list'): void {
    if (this.viewMode() === mode) {
      return;
    }
    this.viewMode.set(mode);
  }

  openDetails(record: StaffBookingRecord, triggerEvent?: Event): void {
    this.activeDetailTrigger =
      triggerEvent?.currentTarget instanceof HTMLElement ? triggerEvent.currentTarget : null;
    this.selectedBooking.set(record);
  }

  closeDetails(): void {
    this.selectedBooking.set(null);
    const target = this.activeDetailTrigger;
    this.activeDetailTrigger = null;
    if (target) {
      queueMicrotask(() => {
        target.focus();
      });
    }
  }

  openFulfillment(record: StaffBookingRecord): void {
    if (!record.bookingId) {
      return;
    }

    this.closeDetails();
    // void this.router.navigate(['/staff/fulfillment', record.bookingId]);
    window.location.href = `/staff/fulfillment/${record.bookingId}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canOpenFulfillment(_record: StaffBookingRecord): boolean {
    return true;
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDetails();
    }
  }

  formatCurrency(value?: number | null): string {
    return this.presenter.formatCurrency(value);
  }

  formatDate(value?: string): string {
    return this.presenter.formatDate(value);
  }

  formatDateTime(value?: string): string {
    return this.presenter.formatDateTime(value);
  }

  rentalStatusLabel(status?: string | null): string {
    return this.presenter.rentalStatusLabel(status);
  }
}
