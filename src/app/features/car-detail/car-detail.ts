import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCalendarCellClassFunction, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

const HOUR_OPTIONS = Array.from(
  { length: 24 },
  (_, hour) => `${hour.toString().padStart(2, '0')}:00`,
);

interface BookingDialogData {
  startDate: string | null;
  endDate: string | null;
  startTime: string;
  endTime: string;
}

interface BookingSelection {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-car-booking-time-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
  ],
  template: `
    <h2 mat-dialog-title>Lich xe</h2>
    <mat-dialog-content class="space-y-4 booking-dialog">
      <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span class="flex items-center gap-1 text-amber-500">
          <span class="material-symbols-outlined text-base leading-none">circle</span>
          Trong mot phan
        </span>
        <span class="flex items-center gap-1 text-red-500">
          <span class="material-symbols-outlined text-base leading-none">close</span>
          Khong trong
        </span>
        <span class="flex items-center gap-1 text-emerald-600">
          <span class="material-symbols-outlined text-base leading-none">event_available</span>
          Ngay le
        </span>
      </div>

      <mat-divider></mat-divider>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 booking-calendar">
        <mat-calendar
          [selected]="startDate"
          [startAt]="primaryMonth"
          (selectedChange)="onDateSelected($event)"
          [dateClass]="calendarDateClass"
        ></mat-calendar>
        <mat-calendar
          [selected]="startDate"
          [startAt]="secondaryMonth"
          (selectedChange)="onDateSelected($event)"
          [dateClass]="calendarDateClass"
        ></mat-calendar>
      </div>

      <div
        *ngIf="hasConflict()"
        class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
      >
        Xe dang ban trong khoang thoi gian nay. Vui long chon thoi gian khac.
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Gio nhan</mat-label>
          <mat-select [(ngModel)]="startTime">
            <mat-option value="">Chon gio</mat-option>
            <mat-option *ngFor="let hour of hourOptions" [value]="hour">{{ hour }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Gio tra</mat-label>
          <mat-select [(ngModel)]="endTime">
            <mat-option value="">Chon gio</mat-option>
            <mat-option *ngFor="let hour of hourOptions" [value]="hour">{{ hour }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div
        class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 space-y-1"
      >
        <div>Nhan xe: {{ formatDateTime(startDate, startTime) || 'Chua chon' }}</div>
        <div>Tra xe: {{ formatDateTime(endDate, endTime) || 'Chua chon' }}</div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Huy</button>
      <button mat-flat-button color="primary" (click)="onSave()" [disabled]="!canSave()">
        Xac nhan
      </button>
    </mat-dialog-actions>
  `,
})
export class CarBookingTimeDialog {
  private readonly dialogRef = inject(MatDialogRef<CarBookingTimeDialog, BookingSelection>);
  private readonly data = inject<BookingDialogData>(MAT_DIALOG_DATA);

  readonly hourOptions = HOUR_OPTIONS;
  private readonly dateFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' });
  startDate: Date | null = this.data.startDate ? new Date(this.data.startDate) : null;
  endDate: Date | null = this.data.endDate ? new Date(this.data.endDate) : null;
  startTime = this.data.startTime || '';
  endTime = this.data.endTime || '';
  /** Track busy days for instant lookup; acts as a light availability cache. */
  readonly busyDates = new Set(['2025-10-12', '2025-10-13', '2025-10-18']);
  readonly holidayDates = new Set(['2025-11-02']);
  private readonly initialViewDate = this.startDate ?? new Date();
  readonly primaryMonth = new Date(
    this.initialViewDate.getFullYear(),
    this.initialViewDate.getMonth(),
    1,
  );
  readonly secondaryMonth = new Date(
    this.initialViewDate.getFullYear(),
    this.initialViewDate.getMonth() + 1,
    1,
  );
  readonly calendarDateClass: MatCalendarCellClassFunction<Date> = (cellDate, view) =>
    this.resolveDateClass(cellDate, view);

  canSave(): boolean {
    return (
      Boolean(this.startDate && this.endDate && this.startTime && this.endTime) &&
      !this.hasConflict()
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.canSave() || !this.startDate || !this.endDate) {
      return;
    }

    this.dialogRef.close({
      startDate: this.startDate,
      endDate: this.endDate,
      startTime: this.startTime,
      endTime: this.endTime,
    });
  }

  onDateSelected(date: Date | null): void {
    if (!date || this.isBusy(date)) {
      return;
    }

    if (!this.startDate || this.endDate) {
      this.startDate = date;
      this.endDate = null;
    } else if (date < this.startDate) {
      this.endDate = this.startDate;
      this.startDate = date;
    } else {
      this.endDate = date;
    }
  }

  hasConflict(): boolean {
    if (!this.startDate || !this.endDate) {
      return false;
    }

    const current = new Date(this.startDate);
    while (current <= this.endDate) {
      if (this.isBusy(current)) {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    return false;
  }

  formatDateTime(date: Date | null, time: string): string {
    if (!date || !time) {
      return '';
    }
    return `${this.dateFormatter.format(date)} ${time}`;
  }

  private resolveDateClass(date: Date, view: string): string {
    if (view !== 'month') {
      return '';
    }

    const classes: string[] = [];
    if (this.isBusy(date)) {
      classes.push('busy-date');
    }
    if (this.isHoliday(date)) {
      classes.push('holiday-date');
    }
    if (this.isSelected(date)) {
      classes.push('range-edge');
    } else if (this.isInRange(date)) {
      classes.push('range-middle');
    }
    return classes.join(' ');
  }

  private isSelected(date: Date): boolean {
    const matchStart = this.startDate !== null && this.isSameDate(this.startDate, date);
    const matchEnd = this.endDate !== null && this.isSameDate(this.endDate, date);
    return matchStart || matchEnd;
  }

  private isInRange(date: Date): boolean {
    if (!this.startDate || !this.endDate) {
      return false;
    }
    return this.startDate < date && date < this.endDate;
  }

  private isBusy(date: Date): boolean {
    return this.busyDates.has(this.toKey(date));
  }

  private isHoliday(date: Date): boolean {
    return this.holidayDates.has(this.toKey(date));
  }

  private isSameDate(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private toKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

@Component({
  selector: 'app-car-detail',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRadioModule,
    MatDialogModule,
    CarBookingTimeDialog,
  ],
  templateUrl: './car-detail.html',
  styleUrl: './car-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarDetail {
  private readonly dialog = inject(MatDialog);
  pickupOption = 'lot';
  bookingSummary = '';
  readonly hourOptions = HOUR_OPTIONS;
  private startDate: Date | null = null;
  private endDate: Date | null = null;
  startTime = '';
  endTime = '';
  private readonly dateFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' });

  openBookingDialog(): void {
    const dialogRef = this.dialog.open<CarBookingTimeDialog, BookingDialogData, BookingSelection>(
      CarBookingTimeDialog,
      {
        width: '520px',
        data: {
          startDate: this.startDate ? this.startDate.toISOString() : null,
          endDate: this.endDate ? this.endDate.toISOString() : null,
          startTime: this.startTime,
          endTime: this.endTime,
        },
      },
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      this.startDate = result.startDate;
      this.endDate = result.endDate;
      this.startTime = result.startTime;
      this.endTime = result.endTime;
      this.bookingSummary = this.buildBookingSummary();
    });
  }

  private buildBookingSummary(): string {
    if (!this.startDate || !this.endDate || !this.startTime || !this.endTime) {
      return '';
    }

    return `${this.dateFormatter.format(this.startDate)} ${this.startTime} - ${this.dateFormatter.format(this.endDate)} ${this.endTime}`;
  }
}
