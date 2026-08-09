import { Module } from '@nestjs/common';
import { PaymentsController } from '../payments/payments.controller';
import { PaymentsModule } from '../payments/payments.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BookingHoldStore } from './booking-hold.store';
import { BookingRepository } from './booking.repository';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PaymentsModule, RealtimeModule],
  // PaymentsController lives here, not in PaymentsModule - see its file
  // comment for why (keeps the module graph one-way, no forwardRef cycle).
  controllers: [BookingsController, PaymentsController],
  providers: [BookingsService, BookingRepository, BookingHoldStore],
  exports: [BookingsService, BookingRepository],
})
export class BookingsModule {}
