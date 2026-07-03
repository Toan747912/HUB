"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Map,
  Layers,
  CheckCircle,
  HelpCircle,
  Clock,
  Shuffle,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { useAuthStore } from "@/shared/stores/auth.store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/shared/stores/toast.store";
import { api } from "@/shared/services/api";
import { getFriendlyErrorMessage } from "@/shared/utils/error-message";

export default function RoadmapsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Queries
  const { data: roadmaps, isLoading } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () =>
      api.roadmap
        .roadmapControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });

  const { data: goals } = useQuery({
    queryKey: ["goals"],
    queryFn: () =>
      api.goal.goalControllerFindAll().then((res) => (res.data as any)?.items || []),
  });

  const { data: assessments } = useQuery({
    queryKey: ["assessments"],
    queryFn: () =>
      api.assessment
        .assessmentControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });

  const activeRoadmap = roadmaps?.[0];
  const activeGoal = goals?.find((g: any) => g.goalId === activeRoadmap?.goalId);
  // Recommendation generation needs a scored competency profile — use the
  // most recent completed assessment for this roadmap's goal.
  const latestAssessment = assessments?.find(
    (a: any) => a.goalId === activeRoadmap?.goalId && a.result,
  );

  // Re-estimate mutation
  const recalculateMutation = useMutation({
    mutationFn: () => {
      if (!activeRoadmap || !activeGoal || !latestAssessment?.result) {
        return Promise.reject(
          new Error("Need an active roadmap, goal, and a scored assessment to recalculate."),
        );
      }
      const allTasks = (activeRoadmap.phases ?? []).flatMap((phase: any) =>
        phase.milestones.flatMap((milestone: any) => milestone.tasks),
      );
      const result = latestAssessment.result;

      return api.recommendation.recommendationControllerGenerate({
        recommendationId: crypto.randomUUID(),
        goalId: activeGoal.goalId,
        roadmapId: activeRoadmap.roadmapId,
        assessmentId: latestAssessment.assessmentId,
        learnerId: user?.id ?? "",
        goalPriority: activeGoal.priority,
        goalDifficulty: activeGoal.difficulty,
        targetDate: activeGoal.targetDate,
        referenceDate: new Date().toISOString(),
        roadmapCompletionRatio: (activeRoadmap.progress?.completionRatio ?? 0) * 100,
        revisionCount: 0,
        tasks: allTasks.map((t: any) => ({
          id: t.id,
          skillId: t.skillId,
          completed: t.completed,
          order: t.order,
          dependsOn: t.dependsOn,
          estimatedDurationDays: t.estimatedDurationDays,
        })),
        competencies: result.competencies,
        // Recommendation's gap DTO is whitelisted and doesn't accept the
        // "id" field the assessment response includes.
        knowledgeGaps: result.knowledgeGaps.map((g: any) => ({
          skillId: g.skillId,
          weight: g.weight,
          reason: g.reason,
        })),
        confidenceScore: result.confidenceScore,
        readiness: result.readiness,
      } as any);
    },
    onSuccess: () => {
      toast({
        title: "Recalculation requested",
        description: "Adaptive intelligence model triggered successfully.",
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
    },
    onError: (err: any) => {
      toast({
        title: "Request failed",
        description: getFriendlyErrorMessage(
          err,
          "We couldn't generate a new pathway. Please try again.",
        ),
        type: "error",
      });
    },
  });

  const canRecalculate = Boolean(activeRoadmap && activeGoal && latestAssessment?.result);

  const handleRecalculate = () => {
    if (!canRecalculate) {
      toast({
        title: "Can't recalculate yet",
        description: "This goal needs a completed assessment before the pathway can be re-scored.",
        type: "warning",
      });
      return;
    }
    recalculateMutation.mutate();
  };

  const mockPhases = React.useMemo(() => {
    if (activeRoadmap?.phases && activeRoadmap.phases.length > 0) {
      return activeRoadmap.phases;
    }
    // Fallback Mock Phases if none generated yet
    return [
      {
        id: "ph-1",
        title: "Phase 1: Basic Core Foundations",
        order: 1,
        milestones: [
          {
            id: "m-1",
            title: "Syntax and Semantics Baseline",
            reached: true,
            tasks: [
              {
                id: "t-1",
                title: "Read core vocabulary catalog",
                complexity: "EASY",
                completed: true,
              },
              {
                id: "t-2",
                title: "Run verification script test cases",
                complexity: "MEDIUM",
                completed: true,
              },
            ],
          },
          {
            id: "m-2",
            title: "Sandbox Data Boundaries Validation",
            reached: false,
            tasks: [
              {
                id: "t-3",
                title: "Complete local schema validation exercise",
                complexity: "MEDIUM",
                completed: false,
                dependsOn: ["t-2"],
              },
              {
                id: "t-4",
                title: "Execute domain-boundary verification tests",
                complexity: "HARD",
                completed: false,
                dependsOn: ["t-3"],
              },
            ],
          },
        ],
      },
      {
        id: "ph-2",
        title: "Phase 2: Complex Integrations & Systems",
        order: 2,
        milestones: [
          {
            id: "m-3",
            title: "Distributed Coordination Hardening",
            reached: false,
            tasks: [
              {
                id: "t-5",
                title: "Setup outbox message publisher loops",
                complexity: "HARD",
                completed: false,
                dependsOn: ["t-4"],
              },
              {
                id: "t-6",
                title: "Conduct high-concurrency race condition test",
                complexity: "HARD",
                completed: false,
                dependsOn: ["t-5"],
              },
            ],
          },
        ],
      },
    ];
  }, [activeRoadmap]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-zinc-800 animate-pulse" />
        <div className="h-96 rounded bg-zinc-900 animate-pulse border border-zinc-800" />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Roadmaps Explorer <Map className="h-6 w-6 text-indigo-500" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Browse structured learning paths, task dependencies, and milestone checkpoints
          </p>
        </div>
        {activeRoadmap && (
          <Button
            onClick={handleRecalculate}
            disabled={recalculateMutation.isPending}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 border-zinc-800 hover:bg-zinc-900"
          >
            <Shuffle className="h-4 w-4 text-zinc-400" /> Recalculate Pathway
          </Button>
        )}
      </div>

      {activeRoadmap ? (
        <div className="space-y-8">
          {/* Overview details banner */}
          <Card className="glass-indigo">
            <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <Badge variant="success" className="mb-2">
                  Active Roadmap
                </Badge>
                <h2 className="text-xl font-bold text-white leading-tight">
                  {activeRoadmap.title || "Goal Study Pathway"}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Estimated duration:{" "}
                  <span className="text-zinc-200 font-semibold">
                    {activeRoadmap.estimatedDurationDays || 14} days
                  </span>{" "}
                  &bull; Complexity:{" "}
                  <span className="text-zinc-200 font-semibold">
                    {activeRoadmap.complexity || "MEDIUM"}
                  </span>
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">
                    Version
                  </span>
                  <span className="text-lg font-bold text-white">
                    {activeRoadmap.aggregateVersion || 1}
                  </span>
                </div>
                <div className="text-center border-l border-zinc-800 pl-4">
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">
                    Milestones
                  </span>
                  <span className="text-lg font-bold text-white">
                    {mockPhases.reduce((acc: number, p: any) => acc + p.milestones.length, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Render Phases Grid */}
          <div className="space-y-6">
            {mockPhases.map((phase: any) => (
              <div key={phase.id} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4.5 w-4.5 text-indigo-400" />
                  <h3 className="text-md font-bold text-white">{phase.title}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {phase.milestones.map((milestone: any) => (
                    <Card key={milestone.id} className="border-zinc-800 bg-zinc-900/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold text-white">
                            {milestone.title}
                          </CardTitle>
                          <Badge
                            variant={milestone.reached ? "success" : "outline"}
                            className="text-[9px]"
                          >
                            {milestone.reached ? "Reached" : "Pending"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="space-y-3">
                          {milestone.tasks.map((task: any) => (
                            <div
                              key={task.id}
                              className="p-3 rounded border border-zinc-800 bg-zinc-950/40 space-y-2"
                            >
                              <div className="flex items-start justify-between">
                                <span
                                  className={
                                    task.completed
                                      ? "text-xs text-zinc-500 line-through font-medium"
                                      : "text-xs text-zinc-200 font-medium"
                                  }
                                >
                                  {task.title}
                                </span>
                                <Badge
                                  variant={task.completed ? "success" : "outline"}
                                  className="text-[9px] py-0 px-1"
                                >
                                  {task.complexity}
                                </Badge>
                              </div>

                              {task.dependsOn && task.dependsOn.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-2">
                                  <AlertCircle className="h-3 w-3 text-amber-500" />
                                  <span className="text-[10px] text-zinc-500">
                                    Depends on:{" "}
                                    {task.dependsOn.map((dep: string) => (
                                      <Badge
                                        key={dep}
                                        variant="secondary"
                                        className="text-[9px] py-0 px-1 font-mono"
                                      >
                                        {dep}
                                      </Badge>
                                    ))}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-zinc-800 bg-zinc-950/20">
          <Map className="h-10 w-10 text-zinc-600 mb-2" />
          <h3 className="font-semibold text-zinc-400">No active Roadmap available</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Set an active goal objective first. The orchestration service will compile your
            milestones.
          </p>
        </Card>
      )}
    </div>
  );
}
