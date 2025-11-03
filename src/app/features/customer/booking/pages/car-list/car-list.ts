import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
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

type CarListItem = CarCardData & CarMetadata;

@Component({
  selector: 'app-car-list',
  imports: [CarCard],
  templateUrl: './car-list.html',
  styleUrl: './car-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarList {
  private readonly _cars = signal<readonly CarListItem[]>([
    {
      id: 'vinfast-vf3',
      name: 'VinFast VF 3',
      imageUrl: '/images/cars/vf3',
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
      model: 'VF 3',
      transmission: 'Số tự động',
      fuel: 'Điện',
      location: 'Hà Nội',
      premium: true,
      distanceKm: 4.2,
      listedAt: '2024-08-15',
    },
    {
      id: 'vinfast-vf5',
      name: 'VinFast VF 5',
      imageUrl: '/images/cars/vf5',
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
      brand: 'VinFast',
      model: 'VF 5',
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
      id: 'vinfast-vf6',
      name: 'VinFast VF 6',
      imageUrl: '/images/cars/vf6',
      pricePerDay: 2_350_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 80% 10%, #c026d3 0%, #1e1b4b 55%, #020617 100%)',
      badges: [{ label: 'Đặt trước', tone: 'accent', position: 'leading' }],
      sale: false,
      bodyType: 'Sedan 5 chỗ',
      brand: 'VinFast',
      model: 'VF 6',
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
      id: 'vinfast-vf7',
      name: 'VinFast VF 7',
      imageUrl: '/images/cars/vf7',
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
      model: 'VF 7',
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
      id: 'vinfast-vf8',
      name: 'VinFast VF 8',
      imageUrl: '/images/cars/vf8',
      pricePerDay: 1_890_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 70% 20%, #0ea5e9 0%, #0f172a 60%)',
      badges: [{ label: 'Miễn phí hủy', tone: 'neutral', position: 'leading' }],
      sale: false,
      bodyType: 'SUV',
      brand: 'VinFast',
      model: 'VF 8',
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
      id: 'vinfast-vf9',
      name: 'VinFast VF 9',
      imageUrl: '/images/cars/vf9',
      pricePerDay: 1_250_000,
      currency: 'VND',
      rateUnit: 'Ngày',
      pricePrefix: 'Chỉ từ',
      heroBackground: 'radial-gradient(circle at 30% 20%, #14b8a6 0%, #0f172a 65%)',
      badges: [{ label: 'Miễn phí giao nhận', tone: 'accent', position: 'leading' }],
      sale: true,
      bodyType: 'Hatchback',
      brand: 'VinFast',
      model: 'VF 9',
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
  ]);

  /**
   * Getter for the cars signal
   */
  get cars(): CarListItem[] {
    return this._cars().slice();
  }
  set cars(cars: CarListItem[]) {
    this._cars.set(cars);
  }
}
