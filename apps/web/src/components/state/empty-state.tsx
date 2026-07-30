/** Empty is normal in a parking app — "no lots nearby" is Tuesday morning,
 * not an edge case (parkap-frontend skill). Every data view uses this rather
 * than silently rendering nothing. */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
      <p className="text-base font-medium">{title}</p>
      {description ? <p className="text-sm text-[var(--color-muted)]">{description}</p> : null}
    </div>
  );
}
