import { Skeleton } from "@/components/ui/skeleton";

export function AlbumSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
      </div>
      <div className="bg-muted/40 sticky top-0 z-20 space-y-3 rounded-xl border p-4 backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="h-9 w-40 shrink-0" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
