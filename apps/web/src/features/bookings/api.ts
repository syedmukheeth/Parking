import 'server-only';
import type { Booking, BookingDetail, ListMyBookingsQuery, Paginated } from '@parkap/shared';
import { apiFetch } from '@/lib/api';

export function getBookingDetail(id: string): Promise<BookingDetail> {
  return apiFetch<BookingDetail>(`/bookings/${id}`);
}

export function listMyBookings(query: Partial<ListMyBookingsQuery>): Promise<Paginated<Booking>> {
  return apiFetch<Paginated<Booking>>('/bookings/me', {
    query: { status: query.status, upcoming: query.upcoming, page: query.page, limit: query.limit },
  });
}
