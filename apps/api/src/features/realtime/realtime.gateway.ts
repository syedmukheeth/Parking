import { Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import jwt from 'jsonwebtoken';
import type { Server, Socket } from 'socket.io';
import {
  REALTIME_EVENTS,
  REALTIME_NAMESPACE,
  locationRoom,
  sessionPayloadSchema,
  subscribeLocationSchema,
  userRoom,
} from '@parkap/shared';
import { loadEnv } from '../../config/env';
import { LocationsService } from '../locations/locations.service';

/**
 * Socket.IO at `/realtime`, one room per location id (docs/API-CONTRACT.md).
 * Availability is public — anonymous sockets may subscribe. A socket that
 * presents a valid session token in the handshake also joins its own user
 * room, which is how `booking:updated` stays scoped to that citizen.
 */
@WebSocketGateway({
  namespace: REALTIME_NAMESPACE,
  cors: { origin: loadEnv().API_CORS_ORIGINS, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server?: Server;

  private readonly logger = new Logger('RealtimeGateway');

  constructor(private readonly locationsService: LocationsService) {}

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) return;

    try {
      const decoded = jwt.verify(token, loadEnv().BETTER_AUTH_SECRET);
      const parsed = sessionPayloadSchema.safeParse(decoded);
      if (parsed.success) {
        void client.join(userRoom(parsed.data.sub));
      }
    } catch {
      // Invalid/expired token — the socket stays anonymous, which is fine;
      // availability subscriptions don't require auth.
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.subscribeLocation)
  async onSubscribeLocation(client: Socket, body: unknown): Promise<void> {
    const parsed = subscribeLocationSchema.safeParse(body);
    if (!parsed.success) return;

    await client.join(locationRoom(parsed.data.locationId));

    // Snapshot on subscribe AND reconnect — a reconnect re-triggers this same
    // handler client-side, which is how cache drift self-heals
    // (docs/ARCHITECTURE.md §5).
    try {
      const snapshot = await this.locationsService.getAvailability(parsed.data.locationId);
      client.emit(REALTIME_EVENTS.availabilitySnapshot, snapshot);
    } catch (error) {
      this.logger.warn(`Failed to build snapshot for ${parsed.data.locationId}: ${String(error)}`);
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.unsubscribeLocation)
  async onUnsubscribeLocation(client: Socket, body: unknown): Promise<void> {
    const parsed = subscribeLocationSchema.safeParse(body);
    if (!parsed.success) return;
    await client.leave(locationRoom(parsed.data.locationId));
  }
}
