export default function AnalysisLoading() {
  return (
    <div className="space-y-6 md:space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-36 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-72 rounded-lg bg-gray-100 dark:bg-gray-800 mt-2" />
      </div>

      {/* Stats Cards skeleton */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white dark:bg-gray-900 p-4 md:p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-20 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="h-7 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Charts Row skeleton */}
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-6" />
          <div className="h-48 rounded-xl bg-gray-50 dark:bg-gray-800/50" />
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-6" />
          <div className="h-48 rounded-xl bg-gray-50 dark:bg-gray-800/50" />
        </div>
      </div>

      {/* Tables skeleton */}
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700 mb-6" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-10 rounded-lg bg-gray-50 dark:bg-gray-800/50" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
