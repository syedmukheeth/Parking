'use client';

import { useEffect, useState } from 'react';

function remaining(targetIso: string): number {
  return new Date(targetIso).getTime() - Date.now();
}

export function Countdown({ targetIso, label }: { targetIso: string; label: string }) {
  const [ms, setMs] = useState(() => remaining(targetIso));

  useEffect(() => {
    const id = setInterval(() => setMs(remaining(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (ms <= 0) {
    return <p className="text-small font-medium text-destructive">Time's up</p>;
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const display = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`;

  return (
    <p className="text-small">
      <span className="text-muted-foreground">{label}</span> <span className="font-medium">{display}</span>
    </p>
  );
}
