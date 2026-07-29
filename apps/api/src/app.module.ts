import { Module } from '@nestjs/common';
import { CacheModule } from './common/cache/cache.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { QueueModule } from './common/queue/queue.module';
import { AuthModule } from './features/auth/auth.module';
import { BookingsModule } from './features/bookings/bookings.module';
import { LocationsModule } from './features/locations/locations.module';
import { PaymentsModule } from './features/payments/payments.module';
import { TicketsModule } from './features/tickets/tickets.module';
import { HealthController } from './health/health.controller';

/**
 * Module map (docs/ARCHITECTURE.md §3). Feature modules land here as their
 * roadmap phase completes: locations (2), auth (3), bookings + payments (4),
 * tickets (5), realtime (6), worker pipeline (7).
 */
@Module({
  imports: [
    PrismaModule,
    CacheModule,
    QueueModule,
    LocationsModule,
    AuthModule,
    PaymentsModule,
    BookingsModule,
    TicketsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
