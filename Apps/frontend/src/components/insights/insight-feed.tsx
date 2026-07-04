import * as React from "react";
import { InsightCard } from "./insight-card";
import type { Insight } from "@/shared/insight-engine/types";

export function InsightFeed({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <p className="text-xs text-zinc-500 italic">
        No insights yet — complete a study session to start generating them.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
