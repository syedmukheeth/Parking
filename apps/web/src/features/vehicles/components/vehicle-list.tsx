'use client';

import { useState, useTransition } from 'react';
import type { Vehicle } from '@parkap/shared';
import { EmptyState } from '@/components/state/empty-state';
import { t } from '@/i18n/messages';
import { deleteVehicleAction, updateVehicleAction } from '../actions';

export function VehicleList({ vehicles }: { vehicles: Vehicle[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (vehicles.length === 0) {
    return <EmptyState title={t('vehicles.empty.title')} description={t('vehicles.empty.description')} />;
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>): void {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? t('common.error'));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {vehicles.map((vehicle) => (
          <li
            key={vehicle.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
          >
            <div>
              <p className="font-medium">
                {vehicle.vehicleNumber}
                {vehicle.isDefault ? (
                  <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-caption font-normal text-muted-foreground">
                    {t('vehicles.default')}
                  </span>
                ) : null}
              </p>
              <p className="text-small text-muted-foreground">
                {vehicle.label ? `${vehicle.label} · ` : ''}
                {vehicle.vehicleType.replace(/_/g, ' ')}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {vehicle.isDefault ? null : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => updateVehicleAction(vehicle.id, { isDefault: true }))}
                  className="rounded-sm border border-border px-2 py-1 text-caption disabled:opacity-60"
                >
                  {t('vehicles.setDefault')}
                </button>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => deleteVehicleAction(vehicle.id))}
                className="rounded-sm px-2 py-1 text-caption text-destructive disabled:opacity-60"
              >
                {t('vehicles.remove')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
