import Link from 'next/link';

/**
 * Empty is normal in a parking app: "no lots nearby" is Tuesday morning, not
 * an edge case (parkap-frontend skill). Every data view uses this rather than
 * silently rendering nothing.
 *
 * The action is the point: an empty state that only apologises leaves the
 * citizen with nowhere to go. Pass one wherever a next step exists.
 */
export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center"
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <div className="flex flex-col gap-1">
        <p className="text-h3">{title}</p>
        {description ? <p className="text-small text-muted-foreground">{description}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-1 rounded-sm bg-primary px-4 py-2 text-small font-medium text-primary-foreground"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
