import * as React from "react";
import { cn } from "@/shared/utils";

export interface TimelineItemProps {
  title: string;
  description?: string;
  time?: string;
  icon?: React.ReactNode;
  active?: boolean;
  children?: React.ReactNode;
}

export function Timeline({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative border-l border-zinc-800 ml-3 pl-6 space-y-6 py-2", className)}>
      {children}
    </div>
  );
}

export function TimelineItem({
  title,
  description,
  time,
  icon,
  active = false,
  children,
}: TimelineItemProps) {
  return (
    <div className="relative group">
      {/* Node Dot */}
      <span
        className={cn(
          "absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border transition-all",
          active
            ? "bg-indigo-500 border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
            : "bg-zinc-950 border-zinc-800 group-hover:border-zinc-500",
        )}
      >
        {icon ? (
          <span className="text-[10px]">{icon}</span>
        ) : (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              active ? "bg-white" : "bg-zinc-800 group-hover:bg-zinc-500",
            )}
          />
        )}
      </span>

      {/* Content */}
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
          <h4
            className={cn(
              "text-sm font-semibold leading-none",
              active ? "text-white" : "text-zinc-300 group-hover:text-white",
            )}
          >
            {title}
          </h4>
          {time && <span className="text-[10px] text-zinc-500">{time}</span>}
        </div>
        {description && <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>}
        {children}
      </div>
    </div>
  );
}
