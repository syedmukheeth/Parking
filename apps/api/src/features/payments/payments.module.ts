import { Module } from '@nestjs/common';
import { PAYMENT_PROVIDER } from './payment-provider.interface';
import { PaymentRepository } from './payment.repository';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';

/**
 * A clean leaf module - no knowledge of Booking. `PaymentsController` (the
 * `/payments/*` HTTP routes) is registered from BookingsModule instead, since
 * confirming a payment also transitions a booking; that keeps the module
 * dependency graph one-way (bookings -> payments) with no forwardRef cycle.
 */
@Module({
  providers: [
    PaymentsService,
    PaymentRepository,
    // Real Razorpay adapter is a new file behind this token, selected by
    // PAYMENT_PROVIDER - swap, not refactor (docs/ARCHITECTURE.md §6).
    { provide: PAYMENT_PROVIDER, useClass: MockPaymentProvider },
  ],
  exports: [PaymentsService, PaymentRepository, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
