import * as React from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { Insight, InsightPriority } from "@/shared/insight-engine/types";

const PRIORITY_BADGE_VARIANT: Record<InsightPriority, BadgeProps["variant"]> = {
  URGENT: "destructive",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "secondary",
};

const CATEGORY_LABEL: Record<Insight["category"], string> = {
  TODAYS_MISSION: "Today's Mission",
  LEARNING_PROGRESS: "Learning Progress",
  LEARNING_CONSISTENCY: "Learning Consistency",
  FOCUS_TREND: "Focus Trend",
  KNOWLEDGE_GROWTH: "Knowledge Growth",
  KNOWLEDGE_GAPS: "Knowledge Gaps",
  RECOMMENDATION_EXPLANATION: "Recommendation Explanation",
  ROADMAP_PROGRESS: "Roadmap Progress",
  WEEKLY_SUMMARY: "Weekly Summary",
  MONTHLY_SUMMARY: "Monthly Summary",
  ACHIEVEMENT_HIGHLIGHTS: "Achievement Highlights",
  RISK_DETECTION: "Risk Detection",
};

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Card
      role="article"
      aria-label={CATEGORY_LABEL[insight.category]}
      className="border-zinc-800 bg-zinc-900/30"
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> {CATEGORY_LABEL[insight.category]}
          </span>
          <Badge
            variant={PRIORITY_BADGE_VARIANT[insight.priority]}
            className="text-[9px] px-1.5 py-0"
          >
            {insight.priority}
          </Badge>
        </div>
        <p className="text-sm font-semibold text-white leading-snug">{insight.title}</p>
        {insight.reasons.length > 0 && (
          <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
            {insight.reasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
