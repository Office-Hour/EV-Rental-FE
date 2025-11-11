import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [MatIcon, MatButton],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Payment {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Read raw query params once and expose via signals
  private readonly qp = toSignal(
    this.route.queryParamMap.pipe(
      map((pm) => {
        const get = (k: string) => pm.get(k) ?? '';
        return {
          amount: get('vnp_Amount'),
          bankCode: get('vnp_BankCode'),
          bankTranNo: get('vnp_BankTranNo'),
          cardType: get('vnp_CardType'),
          orderInfo: get('vnp_OrderInfo'),
          payDate: get('vnp_PayDate'),
          responseCode: get('vnp_ResponseCode'),
          tmnCode: get('vnp_TmnCode'),
          transactionNo: get('vnp_TransactionNo'),
          transactionStatus: get('vnp_TransactionStatus'),
          txnRef: get('vnp_TxnRef'), // bookingId
          secureHash: get('vnp_SecureHash'),
        };
      }),
    ),
    {
      initialValue: {
        amount: '',
        bankCode: '',
        bankTranNo: '',
        cardType: '',
        orderInfo: '',
        payDate: '',
        responseCode: '',
        tmnCode: '',
        transactionNo: '',
        transactionStatus: '',
        txnRef: '',
        secureHash: '',
      },
    },
  );

  readonly bookingId = computed(() => this.qp().txnRef?.trim() ?? '');
  readonly responseCode = computed(() => this.qp().responseCode?.trim() ?? '');
  readonly isSuccess = computed(() => this.responseCode() === '00');

  constructor() {
    // Cache the bookingId for later access
    const id = this.bookingId();
    if (id) {
      try {
        sessionStorage.setItem('lastBookingId', id);
      } catch {
        // ignore storage errors
      }
    }
  }

  goToBookingDetail(): void {
    const id = this.bookingId();
    if (!id) return;
    this.router.navigate(['/bookings', id]);
  }
}
