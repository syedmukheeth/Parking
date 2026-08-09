import 'server-only';
import type { Vehicle } from '@parkap/shared';
import { apiFetch } from '@/lib/api';

export function listVehicles(): Promise<Vehicle[]> {
  return apiFetch<Vehicle[]>('/vehicles');
}
