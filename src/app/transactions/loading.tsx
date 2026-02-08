export default function TransactionsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-48 rounded-lg bg-gray-200" />
        <div className="h-4 w-72 rounded-lg bg-gray-100 mt-2" />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 w-40 rounded bg-gray-200" />
          <div className="h-9 w-32 rounded-lg bg-gray-200" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-gray-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
