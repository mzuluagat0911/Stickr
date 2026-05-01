import type { AlbumProgressStats } from "@/lib/album/progress";
import { cn } from "@/lib/utils";

type AlbumProgressBarProps = {
  stats: AlbumProgressStats;
  className?: string;
};

export function AlbumProgressBar({ stats, className }: AlbumProgressBarProps) {
  const tip = [
    `${stats.have} tengo`,
    `${stats.duplicateStickers} repetidas`,
    `${stats.missing} faltan`,
    `de ${stats.total}`,
  ].join(" · ");

  return (
    <div
      className={cn(
        "bg-muted ring-foreground/5 relative h-3 w-full overflow-hidden rounded-full ring-1",
        className,
      )}
      title={tip}
    >
      <div className="absolute inset-0 flex">
        <div
          key={`g-${stats.have}`}
          className="h-full bg-emerald-500/85 transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${stats.bar.green * 100}%` }}
        />
        <div
          key={`o-${stats.duplicateStickers}`}
          className="h-full bg-amber-400/90 transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${stats.bar.gold * 100}%` }}
        />
      </div>
    </div>
  );
}
