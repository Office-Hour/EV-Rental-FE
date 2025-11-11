import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PaymentService,
  VnPayPaymentRequestDto,
  VnPayPaymentResponseDtoApiResponse,
  VnPayReturnDtoApiResponse,
} from '../../../contract';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly _paymentService = inject(PaymentService);

  /**
   * Create a payment for a booking
   * @param bookingId The booking ID
   * @param amount The payment amount
   * @param vehicleName The vehicle name for order description
   * @returns Observable of payment response with payment URL
   */
  createPayment(
    bookingId: string,
    amount: number,
    vehicleName: string,
  ): Observable<VnPayPaymentResponseDtoApiResponse> {
    const paymentRequest: VnPayPaymentRequestDto = {
      orderId: bookingId,
      amount: amount,
      orderDescription: `Thanh toán đặt xe ${vehicleName}`,
      locale: 'vn',
      orderType: 'other',
    };

    return this._paymentService.apiPaymentCreatePost(paymentRequest);
  }

  /**
   * Get payment return result from VnPay
   * @returns Observable of payment return response
   */
  getPaymentReturn(): Observable<VnPayReturnDtoApiResponse> {
    return this._paymentService.apiPaymentReturnGet();
  }
}
