import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  DateRange,
  MatCalendarCellClassFunction,
  MatDatepickerModule,
  MatDateRangeInput,
  MatDateRangePicker,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ChangeDetectorRef, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

const HOUR_OPTIONS = Array.from(
  { length: 24 },
  (_, hour) => `${hour.toString().padStart(2, '0')}:00`,
);

@Component({
  selector: 'app-car-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRadioModule,
    ReactiveFormsModule,
  ],
  templateUrl: './car-detail.html',
  styleUrl: './car-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarDetail {
  // Hour options and selected times
  private readonly cdr = inject(ChangeDetectorRef);
  readonly hourOptions = HOUR_OPTIONS;
  startTime = '';
  endTime = '';
  rangeError = '';
  selectedRange: DateRange<Date> | null = null;

  form = new FormGroup({
    range: new FormGroup({
      start: new FormControl<Date | null>(null, Validators.required),
      end: new FormControl<Date | null>(null, Validators.required),
    }),
  });

  constructor() {
    const range = this.form.controls.range;
    const startCtrl = range.controls.start;
    const endCtrl = range.controls.end;

    range.valueChanges.subscribe((val) => {
      const start = val?.start ?? null;
      const end = val?.end ?? null;

      // Clear lỗi cũ trên control con
      startCtrl.setErrors(null);
      endCtrl.setErrors(null);
      this.rangeError = '';

      if (start && end && this.rangeContainsBooked(start, end)) {
        this.rangeError = 'Khoảng thời gian đã chọn chứa ngày bận. Vui lòng chọn lại.';

        // ⬇️ ĐẶT LỖI LÊN CONTROL CON (quan trọng)
        const errKey = 'rangeConflict';
        startCtrl.setErrors({ ...(startCtrl.errors ?? {}), [errKey]: true });
        endCtrl.setErrors({ ...(endCtrl.errors ?? {}), [errKey]: true });

        startCtrl.markAsTouched();
        startCtrl.markAsDirty();
        endCtrl.markAsTouched();
        endCtrl.markAsDirty();
      }

      this.cdr.markForCheck();
    });
  }

  // Hardcoded booked dates for demonstration
  readonly bookedDates: Date[] = [
    new Date(2025, 9, 31),
    new Date(2025, 10, 1),
    new Date(2025, 10, 5),
    new Date(2025, 10, 6),
  ];

  // Set of formatted booked date keys for quick lookup
  private readonly bookedDateKeys = new Set(
    this.bookedDates.map((date) => this.formatDateKey(date)),
  );

  // Function to add CSS class to booked dates in the datepicker
  readonly dateClass: MatCalendarCellClassFunction<Date> = (cellDate) =>
    this.bookedDateKeys.has(this.formatDateKey(cellDate)) ? 'busy-date' : '';

  // Disable selecting dates that are already booked
  readonly isDateAvailable = (date: Date | null): boolean => {
    if (!date) {
      return true;
    }
    return !this.bookedDateKeys.has(this.formatDateKey(date));
  };

  onRangeChange(
    range: DateRange<Date> | null,
    picker: MatDateRangePicker<Date>,
    input: MatDateRangeInput<Date>,
  ): void {
    const start = range?.start ?? null;
    const end = range?.end ?? null;

    if (!start) {
      this.rangeError = '';
      this.selectedRange = null;
      this.clearRangeControlState(input);
      return;
    }

    if (end) {
      if (this.rangeContainsBooked(start, end)) {
        this.rangeError =
          'Khoang thoi gian da chon chua ngay ban, vu long chon lai hoac xac nhan da biet.';
        this.markRangeControlInvalid(input);
        this.selectedRange = range;
        picker.close();
        return;
      }

      this.rangeError = '';
      this.selectedRange = range;
      this.clearRangeControlState(input);
      return;
    }

    this.rangeError = '';
    this.selectedRange = range;
    this.clearRangeControlState(input);
  }

  private rangeContainsBooked(start: Date, end: Date): boolean {
    const startDate = this.stripTime(start);
    const endDate = this.stripTime(end);
    const forward = startDate.getTime() <= endDate.getTime();
    const current = new Date(forward ? startDate : endDate);
    const stop = forward ? endDate : startDate;

    while (current.getTime() <= stop.getTime()) {
      if (this.bookedDateKeys.has(this.formatDateKey(current))) return true;
      current.setDate(current.getDate() + 1);
    }
    return false;
  }

  // Helper method to format a date as 'YYYY-MM-DD'
  private formatDateKey(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
  }

  private stripTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private markRangeControlInvalid(input: MatDateRangeInput<Date>): void {
    const control = input.ngControl?.control;
    if (!control) {
      return;
    }
    control.setErrors({ rangeConflict: true });
    control.markAsTouched();
    control.markAsDirty();
  }

  private clearRangeControlState(input: MatDateRangeInput<Date>): void {
    const control = input.ngControl?.control;
    if (!control) {
      return;
    }
    control.setErrors(null);
    control.markAsTouched();
    control.markAsDirty();
  }
}
