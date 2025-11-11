import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';
import { RentersService, StaffRenterRecord } from '../../../core-logic/renters/renters.service';

interface RiskBadge {
  readonly text: string;
  readonly tone: 'success' | 'info' | 'danger' | 'pending';
}

type RiskCategory = 'low' | 'medium' | 'high' | 'unknown';

type RiskFilterKey = 'all' | RiskCategory;

interface RiskFilterDescriptor {
  readonly key: RiskFilterKey;
  readonly label: string;
}

interface RenterListItem {
  readonly record: StaffRenterRecord;
  readonly nameDisplay: string;
  readonly identifierDisplay: string;
  readonly licenseDisplay: string;
  readonly dateOfBirthDisplay: string;
  readonly ageDisplay: string;
  readonly addressDisplay: string;
  readonly riskScoreDisplay: string;
  readonly riskBadge?: RiskBadge;
  readonly initials: string;
}

const RISK_FILTERS: readonly RiskFilterDescriptor[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'high', label: 'Nguy cơ cao' },
  { key: 'medium', label: 'Nguy cơ trung bình' },
  { key: 'low', label: 'Nguy cơ thấp' },
  { key: 'unknown', label: 'Chưa đánh giá' },
] as const;

const RISK_BADGES: Record<RiskCategory, RiskBadge> = {
  low: { text: 'Nguy cơ thấp', tone: 'success' },
  medium: { text: 'Nguy cơ trung bình', tone: 'info' },
  high: { text: 'Nguy cơ cao', tone: 'danger' },
  unknown: { text: 'Chưa đánh giá', tone: 'pending' },
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

  readonly searchTerm = signal('');
  readonly riskFilter = signal<RiskFilterKey>('all');

  readonly loading = computed(() => this.rentersService.staffRentersLoading());
  readonly error = computed(() => this.rentersService.staffRentersError());
  private readonly allRecords = computed(() => this.rentersService.staffRenters());
  private readonly normalizedSearch = computed(() => this.searchTerm().trim().toLowerCase());

  readonly riskFilters = RISK_FILTERS;

  readonly riskCounters = computed<Record<RiskFilterKey, number>>(() => {
    const counters: Record<RiskFilterKey, number> = {
      all: 0,
      low: 0,
      medium: 0,
      high: 0,
      unknown: 0,
    };

    for (const record of this.allRecords()) {
      const category = this._categorizeRisk(record.riskScore);
      counters[category] += 1;
      counters.all += 1;
    }

    return counters;
  });

  private readonly filteredRecords = computed(() => {
    const filter = this.riskFilter();
    const query = this.normalizedSearch();

    return this.allRecords().filter((record) => {
      if (!this._matchesSearch(record, query)) {
        return false;
      }

      if (filter === 'all') {
        return true;
      }

      return this._categorizeRisk(record.riskScore) === filter;
    });
  });

  readonly listViewModels = computed<RenterListItem[]>(() =>
    this.filteredRecords()
      .map((record) => {
        const category = this._categorizeRisk(record.riskScore);
        const badge = RISK_BADGES[category];

        return {
          record,
          nameDisplay: this._resolveName(record),
          identifierDisplay: record.renterId,
          licenseDisplay: record.driverLicenseNo ?? 'Không có thông tin bằng lái',
          dateOfBirthDisplay: this._formatDate(record.dateOfBirth),
          ageDisplay: this._formatAge(record.dateOfBirth),
          addressDisplay: record.address ?? 'Không có địa chỉ',
          riskScoreDisplay: this._formatRiskScore(record.riskScore),
          riskBadge: badge,
          initials: this._buildInitials(record),
        } satisfies RenterListItem;
      })
      .sort((first, second) => this._sortByRiskThenName(first.record, second.record)),
  );

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
    const value = target?.value ?? '';
    if (value === this.searchTerm()) {
      return;
    }
    this.searchTerm.set(value);
  }

  clearSearch(): void {
    if (this.searchTerm().length === 0) {
      return;
    }
    this.searchTerm.set('');
  }

  onRiskFilterChange(filter: RiskFilterKey): void {
    if (this.riskFilter() === filter) {
      return;
    }
    this.riskFilter.set(filter);
  }

  private _matchesSearch(record: StaffRenterRecord, query: string): boolean {
    if (query.length === 0) {
      return true;
    }

    const haystacks: readonly string[] = [
      record.userName ?? '',
      record.driverLicenseNo ?? '',
      record.address ?? '',
      record.renterId,
    ];

    for (const value of haystacks) {
      if (value.toLowerCase().includes(query)) {
        return true;
      }
    }

    return false;
  }

  private _categorizeRisk(score: number | undefined): RiskCategory {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      return 'unknown';
    }

    if (score >= 70) {
      return 'high';
    }

    if (score >= 40) {
      return 'medium';
    }

    return 'low';
  }

  private _resolveName(record: StaffRenterRecord): string {
    if (record.userName && record.userName.length > 0) {
      return record.userName;
    }

    return `Khách thuê ${record.renterId.slice(-4)}`;
  }

  private _formatDate(value: string | undefined): string {
    if (!value) {
      return '--';
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return '--';
    }

    return this.dateFormatter.format(timestamp);
  }

  private _formatAge(value: string | undefined): string {
    if (!value) {
      return '--';
    }

    const birthTime = Date.parse(value);
    if (Number.isNaN(birthTime)) {
      return '--';
    }

    const now = Date.now();
    if (Number.isNaN(now)) {
      return '--';
    }

    const diff = now - birthTime;
    const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 0 || age > 120) {
      return '--';
    }

    return `${age} tuổi`;
  }

  private _formatRiskScore(score: number | undefined): string {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      return '--';
    }

    return `${Math.round(score)} / 100`;
  }

  private _buildInitials(record: StaffRenterRecord): string {
    if (record.userName && record.userName.trim().length > 0) {
      const parts = record.userName
        .trim()
        .split(' ')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const initials = parts
        .map((part) => part.charAt(0))
        .filter((char) => char.length > 0)
        .slice(0, 2)
        .join('');
      if (initials.length > 0) {
        return initials.toUpperCase();
      }
    }

    if (record.driverLicenseNo && record.driverLicenseNo.length > 0) {
      return record.driverLicenseNo.slice(-2).toUpperCase();
    }

    return record.renterId.slice(-2).toUpperCase();
  }

  private _sortByRiskThenName(first: StaffRenterRecord, second: StaffRenterRecord): number {
    const firstCategory = this._categorizeRisk(first.riskScore);
    const secondCategory = this._categorizeRisk(second.riskScore);

    const rank: Record<RiskCategory, number> = {
      high: 3,
      medium: 2,
      low: 1,
      unknown: 0,
    };

    const rankDiff = rank[secondCategory] - rank[firstCategory];
    if (rankDiff !== 0) {
      return rankDiff;
    }

    const firstName = this._resolveName(first);
    const secondName = this._resolveName(second);
    return firstName.localeCompare(secondName);
  }
}
