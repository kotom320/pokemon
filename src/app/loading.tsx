// staleTimes 만료 후 재fetch 시 표시되는 스켈레톤
export default function Loading() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="w-20 h-4 bg-gray-200 rounded animate-pulse mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-2">
            <div className="w-10 h-4 bg-gray-200 rounded-full self-start animate-pulse" />
            <div className="w-24 h-24 bg-gray-200 rounded-xl animate-pulse" />
            <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-12 h-4 bg-gray-200 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}
