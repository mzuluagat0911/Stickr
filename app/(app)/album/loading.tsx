export default function AlbumLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true">
      <div className="space-y-3">
        <div className="bg-muted h-8 w-40 rounded-lg" />
        <div className="bg-muted/80 h-4 max-w-xl rounded-md" />
      </div>
      <div className="bg-muted/60 space-y-3 rounded-xl border p-4">
        <div className="bg-muted h-4 w-52 rounded-md" />
        <div className="bg-muted h-2 rounded-full" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-muted h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="bg-muted aspect-[4/5] rounded-md" />
        ))}
      </div>
    </div>
  );
}
