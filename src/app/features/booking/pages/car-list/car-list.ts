import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CarCard, CarCardData } from '../../components/car-card/car-card';

interface CarMetadata {
  readonly sale: boolean;
  readonly bodyType: 'Bán tải' | 'Hatchback' | 'MPV 7 chỗ' | 'Sedan 5 chỗ' | 'SUV';
  readonly brand: string;
  readonly model: string;
  readonly transmission: 'Số sàn' | 'Số tự động';
  readonly fuel: 'Điện' | 'Xăng' | 'Hybrid';
  readonly location: string;
  readonly premium: boolean;
  readonly distanceKm: number;
  readonly listedAt: string;
}

type SortOption = 'distance' | 'price-desc' | 'price-asc';

type CarListItem = CarCardData & CarMetadata;

@Component({
  selector: 'app-car-list',
  imports: [CarCard, MatButtonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './car-list.html',
  styleUrl: './car-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block bg-slate-100',
  },
})
export class CarList {
  private readonly carsSource: readonly CarListItem[] = [
    {
      id: 'vinfast-vf9-plus',
      name: 'VinFast VF 9 Plus',
      imageUrl: '/vinfast9.png',
      pricePerDay: 2_450_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 20% 20%, #134e4a 0%, #020617 65%)',
      badges: [{ label: 'Miễn phí sạc', tone: 'accent', position: 'leading' }],
      specs: [
        { icon: 'segment', label: 'Phân khúc', value: 'E-SUV 7 chỗ' },
        { icon: 'range', label: 'Phạm vi', value: '594km (NEDC)' },
        { icon: 'seats', label: 'Số chỗ', value: '6 hoặc 7 chỗ' },
        { icon: 'cargo', label: 'Dung tích cốp', value: '567L' },
      ],
      sale: true,
      bodyType: 'SUV',
      brand: 'VinFast',
      model: 'VF 9 Plus',
      transmission: 'Số tự động',
      fuel: 'Điện',
      location: 'Hà Nội',
      premium: true,
      distanceKm: 4.2,
      listedAt: '2024-08-15',
    },
    {
      id: 'kia-ev6-gt-line',
      name: 'Kia EV6 GT-Line',
      imageUrl: '/kiaev6.png',
      pricePerDay: 1_950_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'linear-gradient(180deg, #111827 0%, #0b1120 45%, #020617 100%)',
      badges: [
        { label: 'Giảm 10%', tone: 'accent', position: 'leading' },
        { label: 'Còn xe', tone: 'success', position: 'trailing' },
      ],
      sale: true,
      bodyType: 'SUV',
      brand: 'Kia',
      model: 'EV6 GT-Line',
      transmission: 'Số tự động',
      fuel: 'Điện',
      location: 'Hồ Chí Minh',
      premium: false,
      distanceKm: 7.8,
      listedAt: '2024-07-20',
      specs: [
        { icon: 'segment', label: 'Phân khúc', value: 'Crossover' },
        { icon: 'range', label: 'Phạm vi', value: '506km (WLTP)' },
        { icon: 'seats', label: 'Số chỗ', value: '5 chỗ' },
        { icon: 'cargo', label: 'Dung tích cốp', value: '520L' },
      ],
    },
    {
      id: 'tesla-model3',
      name: 'Tesla Model 3 RWD',
      imageUrl: '/teslamodel3.png',
      pricePerDay: 2_350_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 80% 10%, #c026d3 0%, #1e1b4b 55%, #020617 100%)',
      badges: [{ label: 'Đặt trước', tone: 'accent', position: 'leading' }],
      sale: false,
      bodyType: 'Sedan 5 chỗ',
      brand: 'Tesla',
      model: 'Model 3 RWD',
      transmission: 'Số tự động',
      fuel: 'Điện',
      location: 'Đà Nẵng',
      premium: true,
      distanceKm: 12.4,
      listedAt: '2024-06-28',
      specs: [
        { icon: 'segment', label: 'Phân khúc', value: 'Sedan' },
        { icon: 'range', label: 'Phạm vi', value: '491km (WLTP)' },
        { icon: 'seats', label: 'Số chỗ', value: '5 chỗ' },
        { icon: 'cargo', label: 'Dung tích cốp', value: '649L' },
      ],
    },
    {
      id: 'vinfast-vf8-plus',
      name: 'VinFast VF 8 Plus',
      imageUrl: '/vinfast8.png',
      pricePerDay: 1_650_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 15% 15%, #2563eb 0%, #0f172a 70%)',
      badges: [
        { label: 'Giao xe tận nơi', tone: 'neutral', position: 'leading' },
        { label: 'Còn xe', tone: 'success', position: 'trailing' },
      ],
      sale: true,
      bodyType: 'SUV',
      brand: 'VinFast',
      model: 'VF 8 Plus',
      transmission: 'Số tự động',
      fuel: 'Điện',
      location: 'Hồ Chí Minh',
      premium: false,
      distanceKm: 5.9,
      listedAt: '2024-08-05',
      specs: [
        { icon: 'segment', label: 'Phân khúc', value: 'SUV hạng D' },
        { icon: 'range', label: 'Phạm vi', value: '471km (NEDC)' },
        { icon: 'seats', label: 'Số chỗ', value: '5 chỗ' },
        { icon: 'cargo', label: 'Dung tích cốp', value: '420L' },
      ],
    },
    {
      id: 'hyundai-ioniq5',
      name: 'Hyundai Ioniq 5 Signature',
      imageUrl: '/hyundaiioniq5signature.png',
      pricePerDay: 1_890_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 70% 20%, #0ea5e9 0%, #0f172a 60%)',
      badges: [{ label: 'Miễn phí hủy', tone: 'neutral', position: 'leading' }],
      sale: false,
      bodyType: 'SUV',
      brand: 'Hyundai',
      model: 'Ioniq 5',
      transmission: 'Số tự động',
      fuel: 'Điện',
      location: 'Hà Nội',
      premium: false,
      distanceKm: 9.6,
      listedAt: '2024-05-18',
      specs: [
        { icon: 'segment', label: 'Phân khúc', value: 'Crossover' },
        { icon: 'range', label: 'Phạm vi', value: '488km (WLTP)' },
        { icon: 'seats', label: 'Số chỗ', value: '5 chỗ' },
        { icon: 'cargo', label: 'Dung tích cốp', value: '527L' },
      ],
    },
    {
      id: 'byd-atto3',
      name: 'BYD Atto 3 Premium',
      imageUrl: '/bydatto3.png',
      pricePerDay: 1_250_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 30% 20%, #14b8a6 0%, #0f172a 65%)',
      badges: [{ label: 'Miễn phí giao nhận', tone: 'accent', position: 'leading' }],
      sale: true,
      bodyType: 'Hatchback',
      brand: 'BYD',
      model: 'Atto 3',
      transmission: 'Số tự động',
      fuel: 'Điện',
      location: 'Hồ Chí Minh',
      premium: false,
      distanceKm: 3.8,
      listedAt: '2024-04-09',
      specs: [
        { icon: 'segment', label: 'Phân khúc', value: 'Compact SUV' },
        { icon: 'range', label: 'Phạm vi', value: '420km (WLTP)' },
        { icon: 'seats', label: 'Số chỗ', value: '5 chỗ' },
        { icon: 'cargo', label: 'Dung tích cốp', value: '440L' },
      ],
    },
    {
      id: 'mercedes-eqb',
      name: 'Mercedes-Benz EQB 300 4Matic',
      imageUrl: '/mercedesbenzeqb.png',
      pricePerDay: 2_750_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 60% 30%, #f97316 0%, #0f172a 70%)',
      badges: [{ label: 'Có tài xế', tone: 'accent', position: 'trailing' }],
      sale: false,
      bodyType: 'MPV 7 chỗ',
      brand: 'Mercedes-Benz',
      model: 'EQB 300 4Matic',
      transmission: 'Số tự động',
      fuel: 'Điện',
      location: 'Hà Nội',
      premium: true,
      distanceKm: 6.1,
      listedAt: '2024-07-02',
      specs: [
        { icon: 'segment', label: 'Phân khúc', value: 'SUV hạng sang' },
        { icon: 'range', label: 'Phạm vi', value: '419km (WLTP)' },
        { icon: 'seats', label: 'Số chỗ', value: '7 chỗ' },
        { icon: 'cargo', label: 'Dung tích cốp', value: '465L' },
      ],
    },
    {
      id: 'mg4-electric',
      name: 'MG4 Electric Trophy',
      imageUrl: '/mg4electrictrophy.png',
      pricePerDay: 1_180_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 40% 20%, #8b5cf6 0%, #1e1b4b 65%)',
      badges: [{ label: 'Còn xe', tone: 'success', position: 'leading' }],
      sale: true,
      bodyType: 'Hatchback',
      brand: 'MG',
      model: 'MG4 Trophy',
      transmission: 'Số tự động',
      fuel: 'Điện',
      location: 'Hồ Chí Minh',
      premium: false,
      distanceKm: 8.4,
      listedAt: '2024-03-30',
      specs: [
        { icon: 'segment', label: 'Phân khúc', value: 'Hatchback' },
        { icon: 'range', label: 'Phạm vi', value: '450km (WLTP)' },
        { icon: 'seats', label: 'Số chỗ', value: '5 chỗ' },
        { icon: 'cargo', label: 'Dung tích cốp', value: '363L' },
      ],
    },
    {
      id: 'audi-q4-e-tron',
      name: 'Audi Q4 e-tron Sportback',
      imageUrl: '/audiq4etron.png',
      pricePerDay: 2_150_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 75% 20%, #facc15 0%, #0f172a 70%)',
      badges: [{ label: 'Miễn phí nâng cấp', tone: 'accent', position: 'leading' }],
      sale: false,
      bodyType: 'SUV',
      brand: 'Audi',
      model: 'Q4 e-tron',
      transmission: 'Số tự động',
      fuel: 'Điện',
      location: 'Đà Nẵng',
      premium: true,
      distanceKm: 11.2,
      listedAt: '2024-02-22',
      specs: [
        { icon: 'segment', label: 'Phân khúc', value: 'SUV coupe' },
        { icon: 'range', label: 'Phạm vi hoạt động', value: '520km (WLTP)' },
        { icon: 'seats', label: 'Số chỗ', value: '5 chỗ' },
        { icon: 'cargo', label: 'Dung tích cốp', value: '535L' },
      ],
    },
    {
      id: 'porsche-taycan',
      name: 'Porsche Taycan 4S',
      imageUrl: '/porschetaycan4s.png',
      pricePerDay: 3_850_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 25% 20%, #ef4444 0%, #0f172a 70%)',
      badges: [{ label: 'Hiệu suất cao', tone: 'danger', position: 'leading' }],
      sale: false,
      bodyType: 'Sedan 5 chỗ',
      brand: 'Porsche',
      model: 'Taycan 4S',
      transmission: 'Số tự động',
      fuel: 'Điện',
      location: 'Hà Nội',
      premium: true,
      distanceKm: 9.1,
      listedAt: '2024-01-15',
      specs: [
        { icon: 'segment', label: 'Phân khúc', value: 'Sport sedan' },
        { icon: 'range', label: 'Phạm vi', value: '463km (WLTP)' },
        { icon: 'seats', label: 'Số chỗ', value: '4+1 chỗ' },
        { icon: 'cargo', label: 'Dung tích cốp', value: '447L' },
      ],
    },
  ];

  private readonly seatLabelMap: Record<string, string> = {
    '4-5': '4-5 chỗ',
    '6-7': '6-7 chỗ',
  };

  private readonly seatCategoryCache = new Map<string, string>(
    this.carsSource.map((car) => [car.id, this.resolveSeatCategory(car)]),
  );

  protected readonly seatOptions: readonly string[] = Array.from(
    new Set(Array.from(this.seatCategoryCache.values()).filter((category) => category !== 'other')),
  ).sort((a, b) => a.localeCompare(b, 'vi')) as readonly string[];

  protected readonly brandOptions: readonly string[] = Array.from(
    new Set(this.carsSource.map((car) => car.brand)),
  ).sort((a, b) => a.localeCompare(b, 'vi')) as readonly string[];

  protected readonly locationOptions: readonly string[] = Array.from(
    new Set(this.carsSource.map((car) => car.location)),
  ).sort((a, b) => a.localeCompare(b, 'vi')) as readonly string[];

  private readonly modelsByBrand = (() => {
    const lookup = new Map<string, Set<string>>();
    for (const car of this.carsSource) {
      if (!lookup.has(car.brand)) {
        lookup.set(car.brand, new Set<string>());
      }
      lookup.get(car.brand)!.add(car.model);
    }
    return new Map<string, readonly string[]>(
      Array.from(lookup.entries()).map(([brand, models]) => [
        brand,
        Array.from(models).sort((a, b) => a.localeCompare(b, 'vi')),
      ]),
    );
  })();

  protected readonly selectedSeats = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedBrand = signal<string | null>(null);
  protected readonly selectedModels = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedLocation = signal<string | null>(null);

  protected readonly availableModels = computed(() => {
    const brand = this.selectedBrand();
    if (!brand) {
      return [];
    }
    return this.modelsByBrand.get(brand) ?? [];
  });

  protected readonly filteredCars = computed(() => {
    const seats = this.selectedSeats();
    const brand = this.selectedBrand();
    const models = this.selectedModels();
    const location = this.selectedLocation();
    const sort = this.selectedSort();

    const filtered = this.carsSource.filter((car) => {
      const seatCategory = this.seatCategoryCache.get(car.id) ?? 'other';
      if (seats.size > 0 && !seats.has(seatCategory)) {
        return false;
      }
      if (brand && car.brand !== brand) {
        return false;
      }
      if (models.size > 0 && !models.has(car.model)) {
        return false;
      }
      if (location && car.location !== location) {
        return false;
      }
      return true;
    });

    const ordered = [...filtered];

    switch (sort) {
      case 'price-desc':
        ordered.sort((a, b) => b.pricePerDay - a.pricePerDay);
        break;
      case 'price-asc':
        ordered.sort((a, b) => a.pricePerDay - b.pricePerDay);
        break;
      default:
        ordered.sort((a, b) => a.distanceKm - b.distanceKm);
        break;
    }

    return ordered;
  });

  protected readonly totalAvailableCars = this.carsSource.length;
  protected readonly resultCount = computed(() => this.filteredCars().length);

  protected readonly hasActiveFilters = computed(
    () =>
      this.selectedSeats().size > 0 ||
      !!this.selectedBrand() ||
      this.selectedModels().size > 0 ||
      !!this.selectedLocation() ||
      this.selectedSort() !== 'distance',
  );

  protected readonly sortOptions = [
    { value: 'distance', label: 'Khoảng cách xe gần nhất' },
    { value: 'price-desc', label: 'Giá cao tới thấp' },
    { value: 'price-asc', label: 'Giá thấp tới cao' },
  ] as const;

  protected readonly selectedSort = signal<SortOption>('distance');

  protected seatLabel(value: string): string {
    return this.seatLabelMap[value] ?? value;
  }

  protected selectedSeatValues(): readonly string[] {
    return Array.from(this.selectedSeats());
  }

  protected onSeatChanged(values: readonly string[] | null): void {
    this.selectedSeats.set(new Set(values ?? []));
  }

  protected onBrandChanged(value: string | null): void {
    this.selectedBrand.set(value);
    this.selectedModels.set(new Set());
  }

  protected onModelsChanged(values: readonly string[] | null): void {
    this.selectedModels.set(new Set(values ?? []));
  }

  protected selectedModelValues(): readonly string[] {
    return Array.from(this.selectedModels());
  }

  protected onLocationChanged(value: string | null): void {
    this.selectedLocation.set(value);
  }

  protected onSortChanged(value: string | null): void {
    const nextSort = (value as SortOption | null) ?? 'distance';
    this.selectedSort.set(nextSort);
  }

  protected resetFilters(): void {
    this.selectedSeats.set(new Set());
    this.selectedBrand.set(null);
    this.selectedModels.set(new Set());
    this.selectedLocation.set(null);
    this.selectedSort.set('distance');
  }

  private resolveSeatCategory(car: CarListItem): string {
    const seatSpec = car.specs.find((spec) => spec.icon === 'seats');
    if (!seatSpec) {
      return 'other';
    }

    const normalized = seatSpec.value.toLowerCase();
    const matches = normalized.match(/\d+/g)?.map((value) => Number.parseInt(value, 10)) ?? [];
    if (matches.length) {
      const max = Math.max(...matches);
      if (max >= 6) {
        return '6-7';
      }
      if (max >= 4) {
        return '4-5';
      }
    }

    if (normalized.includes('6') || normalized.includes('7')) {
      return '6-7';
    }

    return 'other';
  }
}
