import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-car-detail',
  imports: [],
  templateUrl: './car-detail.html',
  styleUrl: './car-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarDetail {}
