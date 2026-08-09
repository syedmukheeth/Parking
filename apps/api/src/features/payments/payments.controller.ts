import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { type PaymentWebhook, paymentWebhookSchema, type SessionPayload } from '@parkap/shared';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { SessionGuard } from '../../common/auth/session.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BookingsService } from '../bookings/bookings.service';

/**
 * Registered under BookingsModule, not PaymentsModule - confirming a payment
 * also transitions a booking, and BookingsService is the one place that
 * orchestrates both. This keeps the module dependency graph one-way
 * (bookings -> payments), with no forwardRef cycle.
 */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /** Development shortcut to simulate a successful payment. The service
   * itself refuses this when PAYMENT_PROVIDER is not `mock`. */
  @UseGuards(SessionGuard)
  @Post(':id/confirm')
  confirmMock(@CurrentUser() user: SessionPayload, @Param('id') paymentId: string) {
    return this.bookingsService.confirmMockPayment(user.sub, paymentId);
  }

  /** Public, signature-verified in front of the real provider; the mock
   * provider has nothing to verify against since it never runs in production. */
  @Post('webhook')
  webhook(@Body(new ZodValidationPipe(paymentWebhookSchema)) body: PaymentWebhook) {
    return this.bookingsService.handlePaymentWebhook(body);
  }
}
