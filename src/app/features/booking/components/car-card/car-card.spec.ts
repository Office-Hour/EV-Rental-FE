import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarCard } from './car-card';

describe('CarCard', () => {
  let component: CarCard;
  let fixture: ComponentFixture<CarCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarCard],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(CarCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
