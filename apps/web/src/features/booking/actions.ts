'use server';

import { revalidatePath } from 'next/cache';
import type {
  Booking,
  CreateBookingRequest,
  CreateBookingResponse,
  Payment,
  QuoteRequest,
  QuoteResponse,
} from '@parkap/shared';
import { apiFetch, ApiError } from '@/lib/api';
import type { ActionResult } from '@/lib/action-result';

function toError<T>(error: unknown): ActionResult<T> {
  if (error instanceof ApiError) {
    return { ok: false, error: error.message, code: error.code };
  }
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

export async function getQuote(input: QuoteRequest): Promise<ActionResult<QuoteResponse>> {
  try {
    const quote = await apiFetch<QuoteResponse>('/bookings/quote', { method: 'POST', body: input });
    return { ok: true, data: quote };
  } catch (error) {
    return toError(error);
  }
}

export async function createBooking(
  input: CreateBookingRequest,
): Promise<ActionResult<CreateBookingResponse>> {
  try {
    const data = await apiFetch<CreateBookingResponse>('/bookings', { method: 'POST', body: input });
    return { ok: true, data };
  } catch (error) {
    return toError(error);
  }
}

export async function confirmMockPayment(paymentId: string): Promise<ActionResult<{ bookingId: string }>> {
  try {
    const result = await apiFetch<{ booking: { id: string } }>(`/payments/${paymentId}/confirm`, {
      method: 'POST',
    });
    revalidatePath('/bookings');
    return { ok: true, data: { bookingId: result.booking.id } };
  } catch (error) {
    return toError(error);
  }
}

export async function cancelBooking(bookingId: string, reason?: string): Promise<ActionResult<Booking>> {
  try {
    const data = await apiFetch<Booking>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: { reason },
    });
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath('/bookings');
    return { ok: true, data };
  } catch (error) {
    return toError(error);
  }
}

export async function extendBooking(
  bookingId: string,
  newEndAt: string,
): Promise<ActionResult<{ booking: Booking; payment: Payment }>> {
  try {
    const data = await apiFetch<{ booking: Booking; payment: Payment }>(`/bookings/${bookingId}/extend`, {
      method: 'POST',
      body: { newEndAt },
    });
    revalidatePath(`/bookings/${bookingId}`);
    return { ok: true, data };
  } catch (error) {
    return toError(error);
  }
}
