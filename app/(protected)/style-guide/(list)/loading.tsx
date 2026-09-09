export default function Loading() {
  return (
    <div className="ui-style-shell min-h-screen relative overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center gap-4">
          <div>
            <div className="h-8 w-48 rounded bg-white/20 animate-pulse" />
            <div className="mt-3 h-4 w-72 rounded bg-white/15 animate-pulse" />
          </div>
          <div className="h-10 w-40 rounded bg-white/20 animate-pulse" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl border border-white/20 bg-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
