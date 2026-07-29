import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TicketRepository } from './ticket.repository';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [BookingsModule, RealtimeModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
