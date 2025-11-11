import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';
import { RentersService, StaffRenterRecord } from '../../../core-logic/renters/renters.service';

interface RiskFilterDescriptor {
  readonly key: RiskFilterKey;
  readonly label: string;
  readonly description: string;
}

type RiskFilterKey = 'all' | 'low' | 'medium' | 'high';

type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

type StatusTone = 'pending' | 'success' | 'danger' | 'info';

interface StatusBadge {
  readonly text: string;
  readonly tone: StatusTone;
}

interface RenterCardViewModel {
  readonly record: StaffRenterRecord;
  readonly name: string;
  readonly identifier: string;
  readonly licenseDisplay: string;
  readonly locationDisplay: string;
  readonly dateOfBirthDisplay: string;
  readonly riskScoreDisplay: string;
  readonly riskBadge?: StatusBadge;
}

interface SelectedRenterViewModel {
  readonly record: StaffRenterRecord;
  readonly name: string;
  readonly renterId: string;
  readonly driverLicense?: string;
  readonly address?: string;
  readonly dateOfBirth?: string;
  readonly riskScore?: number;
  readonly riskBadge?: StatusBadge;
  readonly riskDescription: string;
}

const RISK_FILTERS: readonly RiskFilterDescriptor[] = [
  { key: 'all', label: 'All renters', description: 'Include every risk level' },
  { key: 'low', label: 'Low risk', description: 'Score 0 – 40' },
  { key: 'medium', label: 'Medium risk', description: 'Score 41 – 70' },
  { key: 'high', label: 'High risk', description: 'Score 71 – 100' },
] as const;

const RISK_BADGES: Record<RiskLevel, StatusBadge | undefined> = {
  low: { text: 'Low risk', tone: 'success' },
  medium: { text: 'Medium risk', tone: 'info' },
  high: { text: 'High risk', tone: 'danger' },
  unknown: undefined,
};

@Component({
  selector: 'app-renter-management',
  imports: [MatIconModule],
  templateUrl: './renter-management.html',
  styleUrl: './renter-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenterManagement {
  private readonly rentersService = inject(RentersService);
  @ViewChild('detailPanel') private detailPanel?: ElementRef<HTMLDivElement>;
  private activeDetailTrigger: HTMLElement | null = null;

  readonly filters = RISK_FILTERS;
  readonly searchTerm = signal('');
  readonly riskFilter = signal<RiskFilterKey>('all');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly selectedRenter = signal<StaffRenterRecord | null>(null);

  readonly loading = computed(() => this.rentersService.staffRentersLoading());
  readonly error = computed(() => this.rentersService.staffRentersError());
  private readonly allRenters = computed(() => this.rentersService.staffRenters());
  private readonly normalizedSearch = computed(() => this.searchTerm().trim().toLowerCase());
  readonly riskCounts = computed<Record<RiskFilterKey, number>>(() => {
    const renters = this.allRenters();
    let low = 0;
    let medium = 0;
    let high = 0;

    for (const record of renters) {
      switch (this._determineRiskLevel(record.riskScore)) {
        case 'low':
          low += 1;
          break;
        case 'medium':
          medium += 1;
          break;
        case 'high':
          high += 1;
          break;
        default:
          break;
      }
    }

    return {
      all: renters.length,
      low,
      medium,
      high,
    } satisfies Record<RiskFilterKey, number>;
  });

  private readonly filteredRenters = computed(() => {
    const query = this.normalizedSearch();
    const filter = this.riskFilter();

    return this.allRenters().filter(
      (record) => this._matchesSearch(record, query) && this._matchesRisk(record, filter),
    );
  });

  readonly filteredCount = computed(() => this.filteredRenters().length);

  readonly cardViewModels = computed<RenterCardViewModel[]>(() =>
    this.filteredRenters().map((record) => {
      const riskLevel = this._determineRiskLevel(record.riskScore);
      const badge = RISK_BADGES[riskLevel];
      return {
        record,
        name: record.name,
        identifier: record.renterId,
        licenseDisplay: record.driverLicense ?? 'No license on file',
        locationDisplay: record.address ?? 'Address not provided',
        dateOfBirthDisplay: this._formatDate(record.dateOfBirth) ?? 'Date of birth unavailable',
        riskScoreDisplay:
          typeof record.riskScore === 'number' ? `${Math.round(record.riskScore)} pts` : 'Unknown',
        riskBadge: badge,
      } satisfies RenterCardViewModel;
    }),
  );

  readonly selectedRenterView = computed<SelectedRenterViewModel | null>(() => {
    const record = this.selectedRenter();
    if (!record) {
      return null;
    }

    const riskLevel = this._determineRiskLevel(record.riskScore);
    return {
      record,
      name: record.name,
      renterId: record.renterId,
      driverLicense: record.driverLicense,
      address: record.address,
      dateOfBirth: this._formatDate(record.dateOfBirth) ?? undefined,
      riskScore: record.riskScore,
      riskBadge: RISK_BADGES[riskLevel],
      riskDescription: this._describeRisk(riskLevel),
    } satisfies SelectedRenterViewModel;
  });

  private readonly dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.rentersService.loadStaffRenters().pipe(take(1)).subscribe();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchTerm.set(target?.value ?? '');
  }

  clearSearch(): void {
    if (this.searchTerm().length === 0) {
      return;
    }

    this.searchTerm.set('');
  }

  setRiskFilter(filter: RiskFilterKey): void {
    if (this.riskFilter() === filter) {
      return;
    }

    this.riskFilter.set(filter);
  }

  setViewMode(mode: 'grid' | 'list'): void {
    if (this.viewMode() === mode) {
      return;
    }

    this.viewMode.set(mode);
  }

  openDetails(record: StaffRenterRecord, triggerEvent?: Event): void {
    this.activeDetailTrigger =
      triggerEvent?.currentTarget instanceof HTMLElement ? triggerEvent.currentTarget : null;
    this.selectedRenter.set(record);
    afterNextRender(() => {
      this.detailPanel?.nativeElement.focus();
    });
  }

  closeDetails(): void {
    this.selectedRenter.set(null);
    const target = this.activeDetailTrigger;
    this.activeDetailTrigger = null;
    if (target) {
      queueMicrotask(() => {
        target.focus();
      });
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDetails();
    }
  }

  private _matchesSearch(record: StaffRenterRecord, query: string): boolean {
    if (!query) {
      return true;
    }

    const haystacks = [record.name, record.renterId, record.driverLicense, record.address]
      .map((value) => value?.toLowerCase() ?? '')
      .filter((value) => value.length > 0);

    return haystacks.some((value) => value.includes(query));
  }

  private _matchesRisk(record: StaffRenterRecord, filter: RiskFilterKey): boolean {
    if (filter === 'all') {
      return true;
    }

    const level = this._determineRiskLevel(record.riskScore);
    return level === filter;
  }

  private _determineRiskLevel(score: number | undefined): RiskLevel {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      return 'unknown';
    }

    if (score <= 40) {
      return 'low';
    }

    if (score <= 70) {
      return 'medium';
    }

    return 'high';
  }

  private _describeRisk(level: RiskLevel): string {
    switch (level) {
      case 'low':
        return 'The renter has a low risk score, indicating consistent compliance with rental policies.';
      case 'medium':
        return 'The renter has a moderate risk score. Consider reviewing recent rental history before approval.';
      case 'high':
        return 'The renter has a high risk score and may require additional verification before proceeding.';
      default:
        return 'Risk information is not available for this renter.';
    }
  }

  private _formatDate(isoString: string | undefined): string | null {
    if (!isoString) {
      return null;
    }

    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return this.dateFormatter.format(date);
  }
}
