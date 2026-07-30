import 'server-only';
import type { LocationDetail } from '@parkap/shared';
import { apiFetch } from '@/lib/api';

export function getLocationDetail(id: string): Promise<LocationDetail> {
  return apiFetch<LocationDetail>(`/locations/${id}`, { auth: false });
}
