import 'server-only';
import type { User } from '@parkap/shared';
import { apiFetch } from '@/lib/api';

export function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me');
}
