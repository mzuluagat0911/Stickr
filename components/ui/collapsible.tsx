"use client";

import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  className,
  children,
  asChild = false,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "group/collapsible-trigger hover:bg-muted/80 focus-visible:ring-ring flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-2",
        className,
      )}
      asChild={asChild}
      {...props}
    >
      {children}
      {!asChild ? (
        <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]/collapsible-trigger:rotate-180" />
      ) : null}
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="collapsible-content"
      className={cn("overflow-hidden", className)}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
