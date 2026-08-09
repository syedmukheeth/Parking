import { LoadingSkeleton } from '@/components/state/loading-skeleton';

export default function Loading() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-64 animate-pulse rounded-sm bg-secondary motion-reduce:animate-none" />
        <div className="h-5 w-80 animate-pulse rounded-sm bg-secondary motion-reduce:animate-none" />
      </div>
      <LoadingSkeleton rows={4} />
    </main>
  );
}
