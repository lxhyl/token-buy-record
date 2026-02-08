export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="h-8 w-40 rounded-lg bg-gray-200" />
          <div className="h-4 w-64 rounded-lg bg-gray-100 mt-2" />
        </div>
        <div className="h-9 w-20 rounded-lg bg-gray-200" />
      </div>

      {/* Stats Cards skeleton */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white p-4 md:p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-20 rounded bg-gray-100" />
              <div className="h-10 w-10 rounded-xl bg-gray-100" />
            </div>
            <div className="h-7 w-28 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Charts Row skeleton */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="h-5 w-32 rounded bg-gray-200 mb-6" />
          <div className="h-48 rounded-xl bg-gray-50" />
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="h-5 w-32 rounded bg-gray-200 mb-6" />
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-50" />
            ))}
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="h-5 w-40 rounded bg-gray-200 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
