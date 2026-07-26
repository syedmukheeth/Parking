import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';

/**
 * Module map (docs/ARCHITECTURE.md §3). Feature modules land here as their
 * roadmap phase completes: locations (2), auth (3), bookings (4), tickets (5),
 * realtime (6), payments (7).
 */
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
