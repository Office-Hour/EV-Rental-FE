import { inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { ApiResponse, BookingService, UploadKycRequest } from '../../../contract';

@Injectable({ providedIn: 'root' })
export class KycService {
  private readonly bookingService = inject(BookingService);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  uploadKyc(request: UploadKycRequest): Observable<ApiResponse> {
    this._error.set(null);
    if (this._loading()) {
      return throwError(() => new Error('Yêu cầu đang được xử lý. Vui lòng đợi.'));
    }

    this._loading.set(true);

    return this.bookingService.apiBookingUploadKycPost(request).pipe(
      catchError((error: unknown) => {
        this._error.set(this._resolveErrorMessage(error));
        return throwError(() => error);
      }),
      finalize(() => {
        this._loading.set(false);
      }),
    );
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  private _resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string' && error.length > 0) {
      return error;
    }

    return 'Không thể tải lên KYC. Vui lòng thử lại.';
  }
}
