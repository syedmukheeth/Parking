'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

/** Geolocation with a manual fallback, the form's `q` text field always
 * works without granting location access (parkap-frontend skill, docs/ROADMAP.md
 * Phase 9). */
export function GeolocateButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'locating' | 'error'>('idle');

  const handleClick = (): void => {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('lat', position.coords.latitude.toFixed(6));
        params.set('lng', position.coords.longitude.toFixed(6));
        params.set('sort', 'distance');
        setStatus('idle');
        router.push(`/search?${params.toString()}`);
      },
      () => setStatus('error'),
      { timeout: 8000 },
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'locating'}
      className="rounded-sm border border-border px-3 py-2 text-small disabled:opacity-60"
    >
      {status === 'locating' ? 'Locating…' : status === 'error' ? "Couldn't get location" : 'Use my location'}
    </button>
  );
}
