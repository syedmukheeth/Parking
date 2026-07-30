import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimePublisher } from './realtime-publisher.service';

@Module({
  imports: [LocationsModule],
  providers: [RealtimeGateway, RealtimePublisher],
  exports: [RealtimePublisher],
})
export class RealtimeModule {}
