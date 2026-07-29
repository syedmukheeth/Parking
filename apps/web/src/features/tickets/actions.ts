'use server';

import type { TicketQrResponse } from '@parkap/shared';
import { apiFetch, ApiError } from '@/lib/api';
import type { ActionResult } from '@/lib/action-result';

export async function getTicketQr(bookingId: string): Promise<ActionResult<TicketQrResponse>> {
  try {
    const data = await apiFetch<TicketQrResponse>(`/tickets/${bookingId}/qr`);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error: error.message, code: error.code };
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
