'use client';

import { io, type Socket } from 'socket.io-client';
import {
  REALTIME_EVENTS,
  type AvailabilityDeltaEvent,
  type AvailabilitySnapshotEvent,
  type BookingUpdatedEvent,
} from '@parkap/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | undefined;

/** One shared socket for the whole client app. `token` is the session JWT —
 * pass it so the socket also joins its user room for `booking:updated`;
 * omit it for anonymous, availability-only subscriptions. */
export function getSocket(token?: string): Socket {
  if (!socket) {
    socket = io(`${SOCKET_URL}/realtime`, {
      autoConnect: false,
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
    });
  }
  if (token) {
    socket.auth = { token };
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

/** Re-asks the server for a full snapshot. The subscribe handler always
 * replies with a fresh one, so this doubles as an on-demand refresh —
 * useful when a delta only carries one slot type's count and a caller needs
 * the full, correctly-aggregated total instead. */
export function requestLocationSnapshot(locationId: string): void {
  getSocket().emit(REALTIME_EVENTS.subscribeLocation, { locationId });
}

export interface LocationAvailabilitySubscription {
  unsubscribe: () => void;
}

/**
 * Subscribes to a location's availability. `onSnapshot` REPLACES local
 * state (computed from the DB — how cache drift self-heals); `onDelta`
 * MERGES a single slot type's count. Re-subscribes automatically on
 * reconnect via the 'connect' event, which is also what re-triggers a fresh
 * snapshot server-side (parkap-frontend skill).
 */
export function subscribeToLocationAvailability(
  locationId: string,
  handlers: {
    onSnapshot: (event: AvailabilitySnapshotEvent) => void;
    onDelta: (event: AvailabilityDeltaEvent) => void;
  },
): LocationAvailabilitySubscription {
  const client = getSocket();

  const subscribe = (): void => {
    client.emit(REALTIME_EVENTS.subscribeLocation, { locationId });
  };

  const onSnapshot = (event: AvailabilitySnapshotEvent): void => {
    if (event.locationId === locationId) handlers.onSnapshot(event);
  };
  const onDelta = (event: AvailabilityDeltaEvent): void => {
    if (event.locationId === locationId) handlers.onDelta(event);
  };

  client.on('connect', subscribe);
  client.on(REALTIME_EVENTS.availabilitySnapshot, onSnapshot);
  client.on(REALTIME_EVENTS.availabilityDelta, onDelta);

  if (client.connected) subscribe();

  return {
    unsubscribe: () => {
      client.emit(REALTIME_EVENTS.unsubscribeLocation, { locationId });
      client.off('connect', subscribe);
      client.off(REALTIME_EVENTS.availabilitySnapshot, onSnapshot);
      client.off(REALTIME_EVENTS.availabilityDelta, onDelta);
    },
  };
}

export function subscribeToBookingUpdates(
  token: string,
  onUpdate: (event: BookingUpdatedEvent) => void,
): () => void {
  const client = getSocket(token);
  client.on(REALTIME_EVENTS.bookingUpdated, onUpdate);
  return () => client.off(REALTIME_EVENTS.bookingUpdated, onUpdate);
}
