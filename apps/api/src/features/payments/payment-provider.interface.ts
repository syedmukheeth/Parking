/**
 * Shaped by what the domain needs — createOrder / verifySignature / getStatus
 * — not by Razorpay's SDK surface, so the mock webhook payload can already be
 * Razorpay-shaped and the real adapter is a new file, not a refactor of
 * callers (docs/ARCHITECTURE.md §6).
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CreateOrderInput {
  bookingId: string;
  /** Paise. */
  amount: number;
}

export interface CreateOrderResult {
  providerOrderId: string;
}

export type ProviderPaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

export interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  verifySignature(payload: unknown, signature: string | undefined): boolean;
  getStatus(providerPaymentId: string): Promise<ProviderPaymentStatus>;
}
