export default function Loading() {
  return (
    <div className="ui-style-shell min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="h-8 w-56 rounded bg-white/20 animate-pulse" />
            <div className="mt-3 h-4 w-32 rounded bg-white/15 animate-pulse" />
          </div>
          <div className="h-10 w-36 rounded bg-white/20 animate-pulse" />
        </div>
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 space-y-2 md:col-span-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-white/10 animate-pulse" />
            ))}
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className="h-80 rounded-xl border border-white/20 bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
