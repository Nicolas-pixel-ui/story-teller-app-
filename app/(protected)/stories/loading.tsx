export default function Loading() {
  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-ink">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between gap-4">
          <div>
            <div className="h-8 w-40 rounded bg-brand-ink/10 dark:bg-brand-seafoam/20 animate-pulse" />
            <div className="mt-3 h-4 w-56 rounded bg-brand-ink/10 dark:bg-brand-seafoam/15 animate-pulse" />
          </div>
          <div className="h-10 w-32 rounded bg-brand-ink/10 dark:bg-brand-seafoam/20 animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-40 rounded-lg border border-brand-seafoam/30 bg-white/70 dark:bg-brand-ink/60 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
