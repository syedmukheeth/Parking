'use client';

import { useRef, useState, useTransition } from 'react';
import { VEHICLE_TYPE } from '@parkap/shared';
import { t } from '@/i18n/messages';
import { createVehicleAction } from '../actions';

/** Add-a-vehicle form. Submits through the Server Action in ../actions.ts:
 * never a bare fetch to the api (parkap-frontend skill). */
export function VehicleForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData): void {
    setError(null);
    startTransition(async () => {
      const result = await createVehicleAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <label htmlFor="vehicleNumber" className="block text-small font-medium">
          {t('booking.vehicleNumber')}
        </label>
        <input
          id="vehicleNumber"
          name="vehicleNumber"
          required
          placeholder={t('booking.vehicleNumberPlaceholder')}
          className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 uppercase"
        />
      </div>

      <div>
        <label htmlFor="vehicleType" className="block text-small font-medium">
          {t('vehicles.type')}
        </label>
        <select
          id="vehicleType"
          name="vehicleType"
          defaultValue="CAR"
          className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2"
        >
          {VEHICLE_TYPE.map((type) => (
            <option key={type} value={type}>
              {type.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="label" className="block text-small font-medium">
          {t('vehicles.label')}
        </label>
        <input
          id="label"
          name="label"
          placeholder={t('vehicles.labelPlaceholder')}
          className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2"
        />
      </div>

      <label className="flex items-center gap-2 text-small">
        <input type="checkbox" name="isDefault" className="size-4" />
        {t('vehicles.makeDefault')}
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-sm bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? t('vehicles.adding') : t('vehicles.add')}
      </button>
    </form>
  );
}
