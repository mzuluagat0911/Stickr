import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "bg-muted/30 flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-14 text-center",
      )}
    >
      <div className="bg-background text-muted-foreground flex size-12 items-center justify-center rounded-full border shadow-sm">
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
