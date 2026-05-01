import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6 py-2" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}
