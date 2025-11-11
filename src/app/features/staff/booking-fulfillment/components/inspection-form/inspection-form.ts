import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { InspectionPayload } from '../../../../../core-logic/rental-fulfillment';

interface InspectionFormControls {
  readonly batteryCapacity: FormControl<number | null>;
  readonly inspectedAt: FormControl<string | null>;
  readonly evidenceUrl: FormControl<string | null>;
}

@Component({
  selector: 'app-inspection-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inspection-form.html',
  styleUrl: './inspection-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inspection-form block',
  },
})
export class InspectionFormComponent {
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _submitted = signal(false);

  readonly disabled = input<boolean>(false);
  readonly initialValue = input<InspectionPayload | null>(null);

  readonly submitted = output<InspectionPayload>();

  private readonly _form: FormGroup<InspectionFormControls> = this._formBuilder.group({
    batteryCapacity: this._formBuilder.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    inspectedAt: this._formBuilder.control<string | null>(null, {
      validators: [Validators.required],
    }),
    evidenceUrl: this._formBuilder.control<string | null>(null, {
      validators: [Validators.maxLength(2048)],
    }),
  });

  readonly form = this._form;

  constructor() {
    const defaultDateTime = this._toLocalDateTime(new Date().toISOString());
    this._form.patchValue({ inspectedAt: defaultDateTime });

    effect(() => {
      const nextValue = this.initialValue();
      if (!nextValue) {
        return;
      }

      this._form.reset({
        batteryCapacity: nextValue.currentBatteryCapacityKwh,
        inspectedAt: this._toLocalDateTime(nextValue.inspectedAt),
        evidenceUrl: nextValue.evidenceUrl ?? null,
      });
      this._submitted.set(false);
    });

    effect(() => {
      const isDisabled = this.disabled();
      if (isDisabled) {
        this._form.disable({ emitEvent: false });
      } else {
        this._form.enable({ emitEvent: false });
      }
    });
  }

  onSubmit(): void {
    this._submitted.set(true);

    if (this._form.invalid) {
      this._form.markAllAsTouched();
      return;
    }

    const rawCapacity = this._form.controls.batteryCapacity.value;
    const rawInspectedAt = this._form.controls.inspectedAt.value;
    const rawEvidenceUrl = this._form.controls.evidenceUrl.value;

    const capacity = rawCapacity !== null ? Number(rawCapacity) : null;
    const inspectedAtIso = rawInspectedAt ? this._toIsoString(rawInspectedAt) : null;
    const evidenceUrl = this._normalizeString(rawEvidenceUrl);

    if (capacity === null || inspectedAtIso === null || Number.isNaN(capacity)) {
      this._form.markAllAsTouched();
      return;
    }

    this.submitted.emit({
      currentBatteryCapacityKwh: capacity,
      inspectedAt: inspectedAtIso,
      evidenceUrl,
    });
  }

  showError(control: keyof InspectionFormControls, error: string): boolean {
    const field = this._form.controls[control];
    if (!field) {
      return false;
    }

    return field.hasError(error) && (field.touched || field.dirty || this._submitted());
  }

  private _toIsoString(value: string): string {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return new Date().toISOString();
    }
    return new Date(parsed).toISOString();
  }

  private _toLocalDateTime(value: string): string {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return value;
    }

    const date = new Date(parsed);
    const pad = (input: number): string => input.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private _normalizeString(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
