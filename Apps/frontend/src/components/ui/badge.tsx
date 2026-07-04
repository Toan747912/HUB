import * as React from "react";
import { cn } from "@/shared/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80":
            variant === "default",
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80":
            variant === "secondary",
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80":
            variant === "destructive",
          "text-zinc-300 border-zinc-700 hover:bg-zinc-800": variant === "outline",
          "border-transparent bg-emerald-500/10 text-emerald-400 border border-emerald-500/20":
            variant === "success",
          "border-transparent bg-amber-500/10 text-amber-400 border border-amber-500/20":
            variant === "warning",
          "border-transparent bg-blue-500/10 text-blue-400 border border-blue-500/20":
            variant === "info",
        },
        className,
      )}
      {...props}
    />
  );
}
