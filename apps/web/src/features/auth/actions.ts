'use server';

import { redirect } from 'next/navigation';
import { requestOtpRequestSchema, verifyOtpRequestSchema, type User } from '@parkap/shared';
import { apiFetch, ApiError } from '@/lib/api';
import { clearSessionCookie, setSessionCookie, signSessionToken } from '@/lib/session';

export interface RequestOtpState {
  status: 'idle' | 'sent' | 'error';
  requestId?: string;
  error?: string;
}

export async function requestOtpAction(
  _prev: RequestOtpState,
  formData: FormData,
): Promise<RequestOtpState> {
  const parsed = requestOtpRequestSchema.safeParse({ phone: formData.get('phone') });
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Invalid phone number' };
  }

  try {
    const result = await apiFetch<{ requestId: string; expiresInSeconds: number }>(
      '/auth/otp/request',
      { method: 'POST', body: parsed.data, auth: false },
    );
    return { status: 'sent', requestId: result.requestId };
  } catch (error) {
    return { status: 'error', error: error instanceof ApiError ? error.message : 'Something went wrong' };
  }
}

export interface VerifyOtpState {
  status: 'idle' | 'error';
  error?: string;
}

export async function verifyOtpAction(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const parsed = verifyOtpRequestSchema.safeParse({
    requestId: formData.get('requestId'),
    code: formData.get('code'),
  });
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Enter the 6-digit code' };
  }

  let user: User;
  try {
    user = await apiFetch<User>('/auth/otp/verify', { method: 'POST', body: parsed.data, auth: false });
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof ApiError ? error.message : 'Invalid or expired code',
    };
  }

  const token = signSessionToken({ sub: user.id, phone: user.phone, role: user.role });
  await setSessionCookie(token);
  redirect('/');
}

export async function signOutAction(): Promise<void> {
  'use server';
  await clearSessionCookie();
  redirect('/sign-in');
}
