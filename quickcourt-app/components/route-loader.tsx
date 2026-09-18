export function RouteLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-8 w-56 rounded-md bg-gray-200 animate-pulse" />
        <div className="grid md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white border shadow-sm p-5">
              <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="mt-4 h-7 w-16 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-72 rounded-xl bg-white border shadow-sm p-5">
              <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
              <div className="mt-6 h-48 rounded-lg bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          {label}
        </div>
      </div>
    </div>
  )
}
