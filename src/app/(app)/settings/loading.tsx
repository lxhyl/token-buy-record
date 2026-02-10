export default function SettingsLoading() {
  return (
    <div className="space-y-6 md:space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-64 rounded-lg bg-gray-100 dark:bg-gray-800 mt-2" />
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="border-b bg-muted/30 p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div>
              <div className="h-5 w-36 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-72 rounded bg-gray-100 dark:bg-gray-800 mt-2" />
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-gray-50 dark:bg-gray-800/50" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
