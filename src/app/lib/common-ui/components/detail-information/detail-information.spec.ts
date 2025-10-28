import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailInformation } from './detail-information';

describe('DetailInformation', () => {
  let component: DetailInformation;
  let fixture: ComponentFixture<DetailInformation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailInformation],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailInformation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
