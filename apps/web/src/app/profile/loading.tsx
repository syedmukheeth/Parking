import { LoadingSkeleton } from '@/components/state/loading-skeleton';

export default function Loading() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="h-9 w-32 animate-pulse rounded-sm bg-secondary motion-reduce:animate-none" />
      <LoadingSkeleton rows={3} />
    </main>
  );
}
