export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-lg bg-[var(--color-surface)] motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
