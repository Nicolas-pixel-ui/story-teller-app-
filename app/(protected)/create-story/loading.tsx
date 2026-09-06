export default function Loading() {
  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-ink">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 h-4 w-36 rounded bg-brand-ink/10 dark:bg-brand-seafoam/20 animate-pulse" />
        <div className="rounded-lg border border-brand-seafoam/30 bg-white dark:bg-brand-ink/80 p-8 shadow-lg space-y-6">
          <div className="h-8 w-56 rounded bg-brand-ink/10 dark:bg-brand-seafoam/20 animate-pulse" />
          <div className="h-24 w-full rounded bg-brand-ink/10 dark:bg-brand-seafoam/15 animate-pulse" />
          <div className="h-12 w-40 rounded bg-brand-ink/10 dark:bg-brand-seafoam/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
