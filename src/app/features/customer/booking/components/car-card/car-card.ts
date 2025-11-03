import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type CarCardBadgeTone = 'accent' | 'success' | 'danger' | 'neutral';

export interface CarCardBadge {
  readonly label: string;
  readonly tone: CarCardBadgeTone;
  readonly position: 'leading' | 'trailing';
}

export type CarCardSpecIcon = 'segment' | 'range' | 'seats' | 'cargo';

export interface CarCardSpec {
  readonly icon: CarCardSpecIcon;
  readonly label: string;
  readonly value: string;
}

export interface CarCardData {
  readonly id: string;
  readonly name: string;
  readonly imageUrl: string;
  readonly pricePerDay: number;
  readonly currency: string;
  readonly rateUnit: string;
  readonly pricePrefix?: string;
  readonly heroBackground?: string;
  readonly badges: readonly CarCardBadge[];
  readonly specs: readonly CarCardSpec[];
}

@Component({
  selector: 'app-car-card',
  imports: [NgOptimizedImage, MatIconModule],
  templateUrl: './car-card.html',
  styleUrl: './car-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class CarCard {
  public readonly car = input.required<CarCardData>();

  public readonly formattedPrice = computed(() =>
    new Intl.NumberFormat('vi-VN').format(this.car().pricePerDay),
  );

  public readonly leadingBadges = computed(() =>
    this.car().badges.filter((badge) => badge.position === 'leading'),
  );

  public readonly trailingBadges = computed(() =>
    this.car().badges.filter((badge) => badge.position === 'trailing'),
  );

  public badgeToneClass(tone: CarCardBadgeTone): string {
    return `car-card__badge--${tone}`;
  }

  public getSpecIcon(specIcon: CarCardSpecIcon): string {
    const iconMap: Record<CarCardSpecIcon, string> = {
      segment: 'category',
      range: 'electric_bolt',
      seats: 'airline_seat_recline_normal',
      cargo: 'work',
    };
    return iconMap[specIcon] || 'info';
  }
}
