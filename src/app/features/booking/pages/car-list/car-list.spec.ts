import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarList } from './car-list';

describe('CarList', () => {
  let component: CarList;
  let fixture: ComponentFixture<CarList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarList],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(CarList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
