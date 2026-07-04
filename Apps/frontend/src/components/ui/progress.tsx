import * as React from "react";
import { cn } from "@/shared/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0 to 100
  variant?: "default" | "emerald" | "indigo" | "amber";
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, variant = "default", ...props }, ref) => {
    const percentage = Math.max(0, Math.min(100, value));

    return (
      <div
        ref={ref}
        className={cn("relative h-2 w-full overflow-hidden rounded-full bg-zinc-800", className)}
        {...props}
      >
        <div
          className={cn("h-full w-full flex-1 transition-all duration-500 ease-out", {
            "bg-primary": variant === "default",
            "bg-gradient-to-r from-emerald-500 to-teal-400": variant === "emerald",
            "bg-gradient-to-r from-indigo-500 to-purple-500": variant === "indigo",
            "bg-gradient-to-r from-amber-500 to-orange-400": variant === "amber",
          })}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";
