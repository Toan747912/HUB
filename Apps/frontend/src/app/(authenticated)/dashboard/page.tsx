"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  Flame,
  Award,
  BookOpen,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Calendar,
  Compass,
  Plus,
  BarChart3,
  Play,
} from "lucide-react";
import { useAuthStore } from "@/shared/stores/auth.store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/shared/stores/toast.store";
import { api } from "@/shared/services/api";
import { cn } from "@/shared/utils";
import { getFriendlyErrorMessage } from "@/shared/utils/error-message";
import { useInsights, computeStreakDays, totalMinutesInRange } from "@/shared/insight-engine";
import { InsightFeed } from "@/components/insights/insight-feed";

const WEEKLY_GOAL_KEY = "hub:weeklyGoalMinutes";
const DEFAULT_WEEKLY_GOAL_MINUTES = 300;

/** Turns engine evidence strings ("needScore=80") into a human phrase. */
function humanizeEvidence(entry: string): string {
  const match = entry.match(/^([a-zA-Z]+)=(.+)$/);
  if (!match) return entry;
  const [, key, value] = match;
  const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  const numeric = Number(value);
  const formatted = Number.isFinite(numeric) && /Score$/.test(key) ? `${numeric}/100` : value;
  return `${label}: ${formatted}`;
}

function computeWeeklyHeatmap(sessions: any[]): boolean[] {
  const activeDates = new Set<string>();
  for (const s of sessions ?? []) {
    for (const t of s.timers ?? []) {
      if (t.startedAt) activeDates.add(new Date(t.startedAt).toDateString());
    }
    for (const e of s.evidence ?? []) {
      if (e.recordedAt) activeDates.add(new Date(e.recordedAt).toDateString());
    }
  }
  const today = new Date();
  const monday = new Date(today);
  const dayOffset = (today.getDay() + 6) % 7; // Monday = 0
  monday.setDate(today.getDate() - dayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return activeDates.has(d.toDateString());
  });
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = React.useState(DEFAULT_WEEKLY_GOAL_MINUTES);
  const [editingGoal, setEditingGoal] = React.useState(false);

  React.useEffect(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(WEEKLY_GOAL_KEY) : null;
    if (stored) setWeeklyGoalMinutes(Number(stored) || DEFAULT_WEEKLY_GOAL_MINUTES);
  }, []);

  const saveWeeklyGoal = (minutes: number) => {
    const safe = Math.max(30, Math.round(minutes));
    setWeeklyGoalMinutes(safe);
    window.localStorage.setItem(WEEKLY_GOAL_KEY, String(safe));
  };

  // Queries
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => api.goal.goalControllerFindAll().then((res) => (res.data as any)?.items || []),
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["learning-sessions"],
    queryFn: () =>
      api.learningSessions
        .learningSessionControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });

  const { data: recommendationAggregates, isLoading: recsLoading } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () =>
      api.recommendation
        .recommendationControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });

  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ["assessments"],
    queryFn: () =>
      api.assessment
        .assessmentControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });

  // Recommendation approvals mutation — acts on the recommendation aggregate (not individual items)
  const approveMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api.recommendation.recommendationControllerApprove(id, { expectedVersion: version }),
    onSuccess: () => {
      toast({
        title: "Recommendation approved",
        description: "Roadmap is being updated.",
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
    },
    onError: (err: any) => {
      toast({
        title: "Action failed",
        description: getFriendlyErrorMessage(
          err,
          "We couldn't approve that recommendation. Please try again.",
        ),
        type: "error",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api.recommendation.recommendationControllerReject(id, { expectedVersion: version }),
    onSuccess: () => {
      toast({
        title: "Recommendation rejected",
        type: "info",
      });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });

  const activeGoal =
    goals?.find((g: any) => g.status === "ACTIVE" || g.status === "IN_PROGRESS") ?? goals?.[0];
  const activeSession = sessions?.find((s: any) => s.status === "ACTIVE" || s.status === "PAUSED");
  const latestAssessment = assessments?.[0];

  // Goal progress isn't tracked on the goal itself — derive it from sessions linked to this goal.
  const goalSessions = sessions?.filter((s: any) => s.goalId === activeGoal?.goalId) ?? [];
  const goalProgress = goalSessions.length
    ? Math.round(
        (goalSessions.reduce((sum: number, s: any) => sum + (s.progress?.completionRate ?? 0), 0) /
          goalSessions.length) *
          100,
      )
    : 0;

  // Only actionable (GENERATED) recommendation plans, each with its items flattened for display.
  const actionablePlans = (recommendationAggregates ?? []).filter(
    (r: any) => r.status === "GENERATED",
  );

  const now = React.useMemo(() => new Date(), []);
  const streakDays = computeStreakDays(sessions ?? [], now);
  const weekAgo = React.useMemo(() => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), [now]);
  const weeklyMinutes = totalMinutesInRange(sessions ?? [], weekAgo, now);
  const weeklyProgressPct = Math.min(100, Math.round((weeklyMinutes / weeklyGoalMinutes) * 100));
  const heatmap = computeWeeklyHeatmap(sessions ?? []);

  const insights = useInsights({
    goals: goals ?? [],
    assessments: assessments ?? [],
    recommendationPlans: recommendationAggregates ?? [],
    sessions: sessions ?? [],
  });
  const missionInsight = insights.find((i) => i.category === "TODAYS_MISSION");
  const otherInsights = insights.filter((i) => i.category !== "TODAYS_MISSION");

  const isLoading = goalsLoading || sessionsLoading || recsLoading || assessmentsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-zinc-800 animate-pulse" />
        <div className="h-28 rounded bg-zinc-900 animate-pulse border border-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 rounded bg-zinc-900 animate-pulse border border-zinc-800" />
          <div className="h-40 rounded bg-zinc-900 animate-pulse border border-zinc-800" />
          <div className="h-40 rounded bg-zinc-900 animate-pulse border border-zinc-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Workspace Dashboard <Sparkles className="h-5 w-5 text-indigo-500 fill-indigo-500/25" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Review recommendations, track study goals, and manage your learning trajectory
          </p>
        </div>
      </div>

      {/* Today's Mission — the single most important thing to do right now */}
      <Card className="glass-indigo border-indigo-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 shrink-0 rounded-full bg-indigo-500/15 flex items-center justify-center border border-indigo-500/30">
              <Compass className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                Today&rsquo;s Mission
              </p>
              {missionInsight ? (
                <>
                  <h2 className="text-lg font-bold text-white mt-1">{missionInsight.title}</h2>
                  {missionInsight.reasons.length > 0 && (
                    <p className="text-xs text-zinc-400 mt-1.5">
                      Recommended because {missionInsight.reasons.join(" · ")}
                    </p>
                  )}
                </>
              ) : activeSession ? (
                <h2 className="text-lg font-bold text-white mt-1">
                  Continue your active study session — pick up right where you left off.
                </h2>
              ) : (
                <h2 className="text-lg font-bold text-white mt-1">
                  No mission queued yet. Start a session or refresh your recommendations to get one.
                </h2>
              )}
            </div>
            <Link href="/learning-sessions" className="shrink-0">
              <Button size="sm" variant="gradient">
                {activeSession ? "Continue Learning" : "Start Learning"}{" "}
                <Play className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Goals, Session, Readiness Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Goal Card */}
        <Card className="glass-indigo">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-400" /> Current Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeGoal ? (
              <>
                <div className="min-h-[48px]">
                  <h3 className="font-bold text-white text-base leading-tight">
                    {activeGoal.title}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate mt-1">{activeGoal.description}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Progress (from sessions)</span>
                    <span className="text-indigo-400 font-semibold">{goalProgress}%</span>
                  </div>
                  <Progress value={goalProgress} variant="indigo" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-xs text-zinc-500">No active goals found.</p>
                <Link href="/goals" className="mt-4">
                  <Button size="sm" variant="outline">
                    Set a Goal
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Study Session Card */}
        <Card className={activeSession?.status === "ACTIVE" ? "glass-emerald" : "glass"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-400" /> Study Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSession ? (
              <>
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">
                    Active Study Session
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                    Status:{" "}
                    <Badge
                      variant={activeSession.status === "ACTIVE" ? "success" : "warning"}
                      className="py-0 px-1.5 text-[9px]"
                    >
                      {activeSession.status}
                    </Badge>
                  </p>
                </div>
                <Link href="/learning-sessions">
                  <Button size="sm" variant="gradient" className="w-full">
                    Resume Workspace <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-xs text-zinc-500">No session running today.</p>
                <Link href="/learning-sessions" className="mt-4 w-full">
                  <Button size="sm" variant="secondary" className="w-full">
                    Launch Session
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assessment & Readiness Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-400" /> Core Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestAssessment ? (
              <>
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">
                    Assessment Profile
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Readiness:</span>
                    <Badge
                      variant={
                        latestAssessment.readiness === "READY"
                          ? "success"
                          : latestAssessment.readiness === "AT_RISK"
                            ? "warning"
                            : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {latestAssessment.readiness}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Confidence Score</span>
                  <span className="text-white font-bold">
                    {Math.round(latestAssessment.confidenceScore || 0)}/100
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-xs text-zinc-500">No profile assessment run.</p>
                <Link href="/assessments" className="mt-4">
                  <Button size="sm" variant="outline">
                    Verify Competency
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/learning-sessions">
          <Button size="sm" variant="outline" className="flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" /> {activeSession ? "Continue Session" : "Start Session"}
          </Button>
        </Link>
        <Link href="/goals">
          <Button size="sm" variant="outline" className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Goal
          </Button>
        </Link>
        <Link href="/analytics">
          <Button size="sm" variant="outline" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> View Progress
          </Button>
        </Link>
        <Link href="/assessments">
          <Button size="sm" variant="outline" className="flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" /> Run Assessment
          </Button>
        </Link>
      </div>

      {/* Main Body: Recommendations & Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recommendations Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Adaptive Recommendations{" "}
            <Sparkles className="h-4 w-4 text-indigo-400 fill-indigo-400/25" />
          </h2>

          {actionablePlans.length > 0 ? (
            <div className="space-y-6">
              {actionablePlans.map((plan: any) => (
                <Card key={plan.recommendationId} className="border-zinc-800 bg-zinc-900/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-white">Adaptive Plan</CardTitle>
                    <CardDescription className="text-xs">
                      {plan.items?.length ?? 0} recommended action(s), engine v{plan.engineVersion}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(plan.items ?? []).map((item: any) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-white leading-snug">
                            {item.reason?.summary}
                          </p>
                          <Badge
                            variant={
                              item.priority === "HIGH"
                                ? "destructive"
                                : item.priority === "MEDIUM"
                                  ? "warning"
                                  : "secondary"
                            }
                            className="shrink-0"
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        {item.reason?.evidence?.length > 0 && (
                          <p className="text-xs text-zinc-400">
                            Because {item.reason.evidence.map(humanizeEvidence).join(" · ")}
                          </p>
                        )}
                      </div>
                    ))}

                    <div className="flex space-x-3 justify-end pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          rejectMutation.mutate({
                            id: plan.recommendationId,
                            version: plan.version,
                          })
                        }
                        disabled={rejectMutation.isPending || approveMutation.isPending}
                        className="text-zinc-400 hover:text-red-400"
                      >
                        <ThumbsDown className="mr-1.5 h-3.5 w-3.5" /> Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          approveMutation.mutate({
                            id: plan.recommendationId,
                            version: plan.version,
                          })
                        }
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300"
                      >
                        <ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Accept & Map
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed border-zinc-800 bg-zinc-950/20">
              <Sparkles className="h-8 w-8 text-zinc-600 mb-2" />
              <h4 className="font-semibold text-zinc-400">Pathways Synced</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                No active recommendations. Complete study activities or trigger a new assessment to
                refresh your study plan.
              </p>
            </Card>
          )}
        </div>

        {/* Learning Streak & Calendar sidebar */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Streak & Activity <Flame className="h-4 w-4 text-amber-500" />
          </h2>

          <Card className="bg-gradient-to-br from-amber-500/5 to-transparent border-zinc-800">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Flame
                  className={cn("h-10 w-10 text-amber-500", streakDays > 0 && "fill-amber-500/20")}
                />
              </div>
              <div>
                <h3 className="font-bold text-2xl text-white">
                  {streakDays} {streakDays === 1 ? "Day" : "Days"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Continuous learning streak</p>
              </div>
              <p className="text-xs text-zinc-500 italic">
                {streakDays > 0
                  ? "Consistency beats intensity. Keep pushing your skills!"
                  : "Start a session today to kick off your streak."}
              </p>
            </CardContent>
          </Card>

          {/* Weekly Goal widget */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-zinc-400" /> Weekly Goal
              </CardTitle>
              <button
                type="button"
                onClick={() => setEditingGoal((v) => !v)}
                aria-pressed={editingGoal}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1"
              >
                {editingGoal ? "Done" : "Edit"}
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-white">{weeklyMinutes} min</span>
                {editingGoal ? (
                  <>
                    <label htmlFor="weekly-goal-minutes" className="sr-only">
                      Weekly goal in minutes
                    </label>
                    <input
                      id="weekly-goal-minutes"
                      type="number"
                      min={30}
                      step={30}
                      defaultValue={weeklyGoalMinutes}
                      onBlur={(e) =>
                        saveWeeklyGoal(Number(e.target.value) || DEFAULT_WEEKLY_GOAL_MINUTES)
                      }
                      className="w-20 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-right text-white focus:outline-none focus:border-indigo-500"
                    />
                  </>
                ) : (
                  <span className="text-xs text-zinc-500">of {weeklyGoalMinutes} min goal</span>
                )}
              </div>
              <Progress value={weeklyProgressPct} variant="emerald" />
              <p className="text-[10px] text-zinc-500">
                {weeklyProgressPct}% of this week&rsquo;s goal
              </p>
            </CardContent>
          </Card>

          {/* Activity Heatmap widget */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" /> Weekly Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="text-center">
                    <span className="text-[10px] text-zinc-600 block mb-1">{d}</span>
                    <div
                      className={cn(
                        "h-6 w-full rounded transition-all",
                        heatmap[i]
                          ? "bg-indigo-500/60 shadow-[0_0_4px_rgba(99,102,241,0.2)]"
                          : "bg-zinc-800",
                      )}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between items-center text-[10px] text-zinc-500">
                <span>{weeklyMinutes}m spent</span>
                <span>Active study days</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Narrative Insights feed — deterministic, rule-based, no LLM */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          Insights <Sparkles className="h-4 w-4 text-indigo-400 fill-indigo-400/25" />
        </h2>
        <InsightFeed insights={otherInsights} />
      </div>
    </div>
  );
}
