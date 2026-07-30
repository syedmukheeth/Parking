export function ErrorState({
  title,
  message,
  retryHref,
}: {
  title: string;
  message?: string;
  retryHref?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-6 py-8 text-center"
    >
      <p className="text-base font-medium text-[var(--color-danger)]">{title}</p>
      {message ? <p className="text-sm text-[var(--color-muted)]">{message}</p> : null}
      {retryHref ? (
        <a href={retryHref} className="mt-2 text-sm font-medium underline underline-offset-2">
          Try again
        </a>
      ) : null}
    </div>
  );
}
