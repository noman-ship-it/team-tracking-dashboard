export default function TeamLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-full bg-muted" />
        <div className="h-9 w-64 rounded-xl bg-muted" />
      </div>

      {/* KPI tiles skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
            <div className="h-3 w-20 rounded-full bg-muted" />
            <div className="h-10 w-16 rounded-lg bg-muted" />
            <div className="h-3 w-24 rounded-full bg-muted" />
          </div>
        ))}
      </div>

      {/* team grid skeleton */}
      <div className="space-y-4">
        <div className="h-7 w-32 rounded-lg bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 space-y-3">
              <div className="flex justify-between">
                <div className="space-y-1.5">
                  <div className="h-4 w-28 rounded-full bg-muted" />
                  <div className="h-3 w-20 rounded-full bg-muted" />
                </div>
                <div className="h-6 w-20 rounded-full bg-muted" />
              </div>
              <div className="h-8 w-16 rounded-lg bg-muted" />
              <div className="flex justify-between items-center">
                <div className="h-3 w-24 rounded-full bg-muted" />
                <div className="h-8 w-20 rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
