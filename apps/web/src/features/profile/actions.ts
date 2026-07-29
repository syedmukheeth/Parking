'use server';

import { revalidatePath } from 'next/cache';
import { updateMeRequestSchema, type Locale, type User } from '@parkap/shared';
import { apiFetch, ApiError } from '@/lib/api';

export interface UpdateProfileState {
  status: 'idle' | 'success' | 'error';
  error?: string;
}

export async function updateProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const raw = {
    name: formData.get('name') || undefined,
    email: formData.get('email') || undefined,
    locale: (formData.get('locale') as Locale) || undefined,
  };
  const parsed = updateMeRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    await apiFetch<User>('/auth/me', { method: 'PATCH', body: parsed.data });
    revalidatePath('/profile');
    return { status: 'success' };
  } catch (error) {
    return { status: 'error', error: error instanceof ApiError ? error.message : 'Something went wrong' };
  }
}
