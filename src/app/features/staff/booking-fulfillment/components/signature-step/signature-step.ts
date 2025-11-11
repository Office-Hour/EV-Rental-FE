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
import { SignaturePayload } from '../../../../../core-logic/rental-fulfillment';
import { SignatureType as SignatureTypeEnum, type SignatureType } from '../../../../../../contract';

interface SignatureFormControls {
  readonly signedAt: FormControl<string | null>;
  readonly signatureType: FormControl<SignatureType | null>;
  readonly documentUrl: FormControl<string | null>;
  readonly documentHash: FormControl<string | null>;
}

const SIGNATURE_TYPE_OPTIONS: readonly { readonly value: SignatureType; readonly label: string }[] =
  [
    { value: SignatureTypeEnum.Drawn, label: 'Ký bằng tay' },
    { value: SignatureTypeEnum.Typed, label: 'Gõ chữ ký' },
    { value: SignatureTypeEnum.DigitalCert, label: 'Chữ ký số' },
    { value: SignatureTypeEnum.OnPaper, label: 'Tải bản giấy' },
  ];

@Component({
  selector: 'app-signature-step',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signature-step.html',
  styleUrl: './signature-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'signature-step block',
  },
})
export class SignatureStepComponent {
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _submitted = signal(false);

  readonly role = input.required<'renter' | 'staff'>();
  readonly disabled = input<boolean>(false);
  readonly initialValue = input<SignaturePayload | null>(null);

  readonly submitted = output<SignaturePayload>();
  readonly signatureTypes = SIGNATURE_TYPE_OPTIONS;

  private readonly _form: FormGroup<SignatureFormControls> = this._formBuilder.group({
    signedAt: this._formBuilder.control<string | null>(null, {
      validators: [Validators.required],
    }),
    signatureType: this._formBuilder.control<SignatureType | null>(SignatureTypeEnum.Typed, {
      validators: [Validators.required],
    }),
    documentUrl: this._formBuilder.control<string | null>(null, {
      validators: [Validators.maxLength(2048)],
    }),
    documentHash: this._formBuilder.control<string | null>(null, {
      validators: [Validators.maxLength(512)],
    }),
  });

  readonly form = this._form;

  constructor() {
    const defaultSignedAt = this._toLocalDateTime(new Date().toISOString());
    this._form.patchValue({ signedAt: defaultSignedAt });

    effect(() => {
      const nextValue = this.initialValue();
      if (!nextValue) {
        return;
      }

      this._form.reset({
        signedAt: this._toLocalDateTime(nextValue.signedAt),
        signatureType: nextValue.signatureType ?? SignatureTypeEnum.Typed,
        documentUrl: nextValue.documentUrl ?? null,
        documentHash: nextValue.documentHash ?? null,
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

    const signedAtRaw = this._form.controls.signedAt.value;
    const signatureType = this._form.controls.signatureType.value ?? undefined;
    const documentUrl = this._normalizeString(this._form.controls.documentUrl.value);
    const documentHash = this._normalizeString(this._form.controls.documentHash.value);
    const signedAtIso = this._toIsoString(signedAtRaw);

    if (!signedAtIso) {
      this._form.controls.signedAt.setErrors({ required: true });
      return;
    }

    this.submitted.emit({
      role: this.role(),
      signedAt: signedAtIso,
      signatureType,
      documentUrl,
      documentHash,
    });
  }

  showError(control: keyof SignatureFormControls, error: string): boolean {
    const field = this._form.controls[control];
    if (!field) {
      return false;
    }

    return field.hasError(error) && (field.touched || field.dirty || this._submitted());
  }

  private _toIsoString(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return null;
    }

    return new Date(timestamp).toISOString();
  }

  private _toLocalDateTime(value: string): string {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return value;
    }

    const date = new Date(timestamp);
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
