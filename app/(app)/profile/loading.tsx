export default function ProfileLoading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true">
      <div className="flex gap-6">
        <div className="bg-muted size-20 shrink-0 rounded-xl border sm:size-24" />
        <div className="space-y-3">
          <div className="bg-muted h-7 w-48 rounded-md" />
          <div className="bg-muted h-4 w-32 rounded-md" />
          <div className="flex gap-2">
            <div className="bg-muted h-6 w-24 rounded-full" />
            <div className="bg-muted h-6 w-28 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted/70 h-28 rounded-xl border p-4" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-muted/60 h-64 rounded-xl border" />
        <div className="bg-muted/60 h-48 rounded-xl border" />
      </div>
    </div>
  );
}
