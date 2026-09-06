export default function Loading() {
  return (
    <div className="min-h-screen bg-brand-seafoam dark:bg-brand-ink pb-12">
      <div className="border-b border-brand-seafoam/40 bg-white/80 dark:bg-brand-ink/80">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-64 rounded bg-brand-ink/10 dark:bg-brand-seafoam/20 animate-pulse" />
          <div className="mt-3 h-4 w-80 rounded bg-brand-ink/10 dark:bg-brand-seafoam/15 animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-brand-cream/80 dark:bg-brand-ink/60 border border-brand-seafoam/30 animate-pulse"
            />
          ))}
        </div>
        <div className="h-10 w-48 rounded bg-brand-ink/10 dark:bg-brand-seafoam/20 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-xl bg-brand-cream/80 dark:bg-brand-ink/60 border border-brand-seafoam/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
