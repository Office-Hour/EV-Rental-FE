import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { finalize, take } from 'rxjs';
import { UserService } from '../../core-logic/user/user.service';
import { UpdateUserRequest } from '../../core-logic/user/user.types';
import { ToastService } from '../../lib/common-ui/services/toast/toast.service';
import { KycService } from '../../core-logic/kyc/kyc.service';
import { KycType, UploadKycRequest } from '../../../contract';

interface KycOption {
  readonly value: KycType;
  readonly label: string;
  readonly description: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full w-full',
  },
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatHint,
    MatError,
    MatButton,
    MatProgressSpinner,
    MatSelect,
    MatOption,
  ],
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);
  private readonly kycService = inject(KycService);

  readonly loadingProfile = signal(false);
  readonly savingProfile = signal(false);

  readonly currentUser = computed(() => this.userService.user);
  readonly kycLoading = this.kycService.loading;
  readonly kycError = this.kycService.error;

  readonly profileForm = this.fb.nonNullable.group({
    userName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(15)]],
  });

  readonly kycForm = this.fb.nonNullable.group({
    type: [KycType.NationalId, Validators.required],
    documentNumber: ['', [Validators.required, Validators.maxLength(64)]],
  });

  readonly kycOptions: readonly KycOption[] = [
    {
      value: KycType.NationalId,
      label: 'CMND/CCCD',
      description: 'Sử dụng căn cước công dân hoặc chứng minh nhân dân hợp lệ.',
    },
    {
      value: KycType.DriverLicense,
      label: 'Giấy phép lái xe',
      description: 'Giấy phép lái xe còn hạn sử dụng.',
    },
    {
      value: KycType.Passport,
      label: 'Hộ chiếu',
      description: 'Hộ chiếu quốc tế còn hạn.',
    },
    {
      value: KycType.Other,
      label: 'Giấy tờ khác',
      description: 'Các giấy tờ định danh hợp pháp khác.',
    },
  ] as const;

  constructor() {
    effect(
      () => {
        const user = this.currentUser();
        if (!user) {
          return;
        }

        if (this.profileForm.dirty && !this.savingProfile()) {
          return;
        }

        this.profileForm.reset(
          {
            userName: user.userName ?? '',
            email: user.email ?? '',
            phoneNumber: user.phoneNumber ?? '',
          },
          { emitEvent: false },
        );
      },
      { allowSignalWrites: true },
    );

    this.refreshProfile();
  }

  refreshProfile(): void {
    if (this.loadingProfile()) {
      return;
    }

    this.loadingProfile.set(true);
    this.userService
      .getUser()
      .pipe(
        take(1),
        finalize(() => this.loadingProfile.set(false)),
      )
      .subscribe({
        error: (error: unknown) => {
          this.toastService.error(this._resolveErrorMessage(error));
        },
      });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    if (this.savingProfile()) {
      return;
    }

    const value = this.profileForm.getRawValue();
    const payload: UpdateUserRequest = {
      userName: value.userName,
      email: value.email,
      phoneNumber: value.phoneNumber,
    };

    this.savingProfile.set(true);
    this.userService
      .updateUser(payload)
      .pipe(
        take(1),
        finalize(() => this.savingProfile.set(false)),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Thông tin cá nhân đã được cập nhật.');
        },
        error: (error: unknown) => {
          this.toastService.error(this._resolveErrorMessage(error));
        },
      });
  }

  submitKyc(): void {
    if (this.kycForm.invalid) {
      this.kycForm.markAllAsTouched();
      return;
    }

    if (this.kycLoading()) {
      return;
    }

    const value = this.kycForm.getRawValue();
    const request: UploadKycRequest = {
      type: value.type,
      documentNumber: value.documentNumber,
    };

    this.kycService
      .uploadKyc(request)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.toastService.success('Đã gửi yêu cầu xác minh KYC.');
          this.kycForm.reset(
            {
              type: value.type,
              documentNumber: '',
            },
            { emitEvent: false },
          );
        },
        error: (error: unknown) => {
          this.toastService.error(this._resolveErrorMessage(error));
        },
      });
  }

  private _resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string' && error.length > 0) {
      return error;
    }

    return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
  }
}
