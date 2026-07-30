import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { TxClient } from '../../common/prisma/tx-client';
import { loadEnv } from '../../config/env';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.interface';
import { PaymentRepository } from './payment.repository';

/**
 * Row-level payment operations only — no knowledge of Booking at all, so this
 * stays a clean leaf module. The cross-cutting "payment success confirms a
 * booking" orchestration lives in BookingsService, which owns the Booking
 * transaction and imports these primitives (one-way dependency, no cycle).
 */
@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly repo: PaymentRepository,
  ) {}

  async openOrder(bookingId: string, amount: number, tx: TxClient) {
    const { providerOrderId } = await this.provider.createOrder({ bookingId, amount });
    return this.repo.create(
      { bookingId, provider: loadEnv().PAYMENT_PROVIDER, providerOrderId, amount },
      tx,
    );
  }

  markSuccess(paymentId: string, providerPaymentId: string, rawPayload: Prisma.InputJsonValue, tx?: TxClient) {
    return this.repo.markSuccess(paymentId, providerPaymentId, rawPayload, tx);
  }

  markFailed(paymentId: string, rawPayload: Prisma.InputJsonValue, tx?: TxClient) {
    return this.repo.markFailed(paymentId, rawPayload, tx);
  }

  verifyWebhookSignature(payload: unknown, signature: string | undefined): boolean {
    return this.provider.verifySignature(payload, signature);
  }
}
