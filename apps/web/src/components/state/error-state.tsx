'use client';

/**
 * Every error offers a way forward — a retry, or a link somewhere useful.
 * An error message with no next action just tells the citizen they are stuck.
 */
export function ErrorState({
  title,
  message,
  retryHref,
  onRetry,
  retryLabel = 'Try again',
}: {
  title: string;
  message?: string;
  retryHref?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-destructive bg-destructive-subtle px-6 py-8 text-center"
    >
      <p className="text-h3 text-destructive-subtle-foreground">{title}</p>
      {message ? <p className="text-small text-muted-foreground">{message}</p> : null}

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-sm bg-primary px-4 py-2 text-small font-medium text-primary-foreground"
        >
          {retryLabel}
        </button>
      ) : retryHref ? (
        <a href={retryHref} className="mt-2 text-small font-medium underline underline-offset-2">
          {retryLabel}
        </a>
      ) : null}
    </div>
  );
}
