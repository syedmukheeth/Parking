import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CreateOrderInput,
  CreateOrderResult,
  PaymentProvider,
  ProviderPaymentStatus,
} from '../payment-provider.interface';

/**
 * Auto-succeeds — unblocks the booking flow without a merchant account. A
 * real booking still only confirms via the webhook/confirm path, which
 * enforces idempotency by `providerPaymentId` regardless of provider — that
 * check lives in the service, not here, so swapping to Razorpay later cannot
 * silently drop it (parkap-architecture SOLID §L).
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async createOrder(_input: CreateOrderInput): Promise<CreateOrderResult> {
    await Promise.resolve();
    return { providerOrderId: `order_mock_${randomUUID()}` };
  }

  verifySignature(): boolean {
    // No real signature scheme in mock mode — there is nothing to forge
    // against, since PAYMENT_PROVIDER=mock never runs in production
    // (config/env.ts boot guard).
    return true;
  }

  async getStatus(): Promise<ProviderPaymentStatus> {
    await Promise.resolve();
    return 'SUCCESS';
  }
}
