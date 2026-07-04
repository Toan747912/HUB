"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Target,
  Plus,
  Loader2,
  Calendar,
  Sparkles,
  Layers,
  BarChart,
  CheckCircle,
  HelpCircle,
  Clock,
  Compass,
} from "lucide-react";
import { useAuthStore } from "@/shared/stores/auth.store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { toast } from "@/shared/stores/toast.store";
import { api } from "@/shared/services/api";
import { getFriendlyErrorMessage } from "@/shared/utils/error-message";

const goalFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  type: z.enum(["CAREER_SHIFT", "SKILL_ACQUISITION", "EXAM_PREPARATION"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  targetDate: z.string().min(1, "Target completion date is required"),
});

type GoalFormInput = z.infer<typeof goalFormSchema>;

export default function GoalsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Queries
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => api.goal.goalControllerFindAll().then((res) => (res.data as any)?.items || []),
  });

  const { data: roadmaps, isLoading: roadmapsLoading } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () =>
      api.roadmap
        .roadmapControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });

  const activeGoal =
    goals?.find((g: any) => g.status === "ACTIVE" || g.status === "IN_PROGRESS") ?? goals?.[0];
  const linkedRoadmap = roadmaps?.find((r: any) => r.goalId === activeGoal?.goalId);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormInput>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      type: "SKILL_ACQUISITION",
      difficulty: "INTERMEDIATE",
      priority: "MEDIUM",
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
  });

  // Create Goal Mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: GoalFormInput) => {
      const goalId = crypto.randomUUID();
      const roadmapId = crypto.randomUUID();

      // Post Goal
      await api.goal.goalControllerCreate({
        goalId,
        learnerId: user?.id ?? "",
        title: data.title,
        description: data.description,
        type: data.type,
        difficulty: data.difficulty,
        priority: data.priority,
        targetDate: new Date(data.targetDate).toISOString(),
      });

      // Post initial linking Roadmap
      await api.roadmap.roadmapControllerCreate({
        roadmapId,
        goalId,
        learnerId: user?.id ?? "",
        title: data.title,
        description: data.description,
        goalType: data.type,
        difficulty: data.difficulty,
        priority: data.priority,
        constraints: [],
        targetDate: new Date(data.targetDate).toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Goal & Roadmap created!",
        description: "Adaptive pathway generated successfully.",
        type: "success",
      });
      setOpenModal(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
    },
    onError: (err: any) => {
      toast({
        title: "Creation failed",
        description: getFriendlyErrorMessage(
          err,
          "We couldn't save your study plan. Please try again.",
        ),
        type: "error",
      });
    },
  });

  const onSubmit = (data: GoalFormInput) => {
    createGoalMutation.mutate(data);
  };

  // Mock milestones if database roadmap phases are empty
  const milestonesToRender = React.useMemo(() => {
    if (linkedRoadmap?.phases && linkedRoadmap.phases.length > 0) {
      return linkedRoadmap.phases.flatMap((phase: any) =>
        phase.milestones.map((m: any) => ({
          ...m,
          phaseTitle: phase.title,
        })),
      );
    }

    // fallback premium mock data for new goals
    if (activeGoal) {
      return [
        {
          id: "m1",
          title: "Introduction & Core Knowledge Verification",
          reached: true,
          phaseTitle: "Phase 1: Fundamental Concepts",
          tasks: [
            {
              id: "t1",
              title: "Review foundational terminology and structures",
              complexity: "EASY",
              completed: true,
            },
            {
              id: "t2",
              title: "Pass core concept baseline check",
              complexity: "MEDIUM",
              completed: true,
            },
          ],
        },
        {
          id: "m2",
          title: "Practice-Based Application Boundaries",
          reached: false,
          phaseTitle: "Phase 1: Fundamental Concepts",
          tasks: [
            {
              id: "t3",
              title: "Implement sandbox design scenarios",
              complexity: "MEDIUM",
              completed: false,
            },
            {
              id: "t4",
              title: "Trigger diagnostic validation assessment",
              complexity: "HARD",
              completed: false,
            },
          ],
        },
        {
          id: "m3",
          title: "Production System Integration & Security hardening",
          reached: false,
          phaseTitle: "Phase 2: Intermediate Scaling",
          tasks: [
            {
              id: "t5",
              title: "Optimize data flow locks and triggers",
              complexity: "HARD",
              completed: false,
            },
          ],
        },
      ];
    }
    return [];
  }, [linkedRoadmap, activeGoal]);

  const isLoading = goalsLoading || roadmapsLoading;

  return (
    <div className="space-y-8 fade-in-up">
      {/* Upper header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Goals & Roadmaps <Compass className="h-6 w-6 text-indigo-500" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Define objectives, view structural milestones, and track completion progress
          </p>
        </div>
        <Button
          onClick={() => setOpenModal(true)}
          variant="gradient"
          size="sm"
          className="flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Set Study Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left side: Goal summaries */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Active Study Plans <Target className="h-4.5 w-4.5 text-indigo-400" />
          </h2>

          {goals && goals.length > 0 ? (
            <div className="space-y-4">
              {goals.map((g: any) => (
                <Card
                  key={g.goalId}
                  className={g.goalId === activeGoal?.goalId ? "glass-indigo" : "glass"}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          g.status === "ACTIVE" || g.status === "IN_PROGRESS"
                            ? "success"
                            : "secondary"
                        }
                      >
                        {g.status}
                      </Badge>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{" "}
                        {new Date(g.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-white mt-2">{g.title}</CardTitle>
                    <CardDescription className="text-xs">{g.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 space-y-4">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>
                        Priority:{" "}
                        <span className="text-zinc-200 capitalize font-medium">{g.priority}</span>
                      </span>
                      <span>
                        Difficulty:{" "}
                        <span className="text-zinc-200 capitalize font-medium">{g.difficulty}</span>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-zinc-500">
                        <span>Completion Rate</span>
                        <span>{Math.round(g.progress || 0)}%</span>
                      </div>
                      <Progress value={g.progress || 0} variant="indigo" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed border-zinc-800 bg-zinc-950/20">
              <Target className="h-8 w-8 text-zinc-600 mb-2" />
              <h4 className="font-semibold text-zinc-400">No Goals configured</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Set a study target to automatically compile your adaptive pathway.
              </p>
            </Card>
          )}
        </div>

        {/* Right side: Roadmap milestones */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Roadmap Pathway Milestones <Layers className="h-4.5 w-4.5 text-indigo-400" />
          </h2>

          {activeGoal ? (
            <Card className="border-zinc-800 bg-zinc-900/30">
              <CardContent className="p-6">
                <Timeline>
                  {milestonesToRender.map((milestone: any, index: number) => (
                    <TimelineItem
                      key={milestone.id}
                      title={milestone.title}
                      description={milestone.phaseTitle}
                      active={milestone.reached}
                      icon={
                        milestone.reached ? (
                          <CheckCircle className="h-3 w-3 text-white" />
                        ) : undefined
                      }
                    >
                      <div className="mt-4 pl-4 space-y-3">
                        <h5 className="text-xs font-semibold text-zinc-400">
                          Milestone Tasks Checklist
                        </h5>
                        <div className="space-y-2">
                          {milestone.tasks.map((task: any) => (
                            <div
                              key={task.id}
                              className="flex items-start space-x-2.5 p-2.5 rounded border border-zinc-800/60 bg-zinc-950/40 text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={task.completed}
                                readOnly
                                className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-indigo-650 h-3.5 w-3.5 focus:ring-indigo-500/20"
                              />
                              <div className="flex-1">
                                <span
                                  className={
                                    task.completed ? "text-zinc-500 line-through" : "text-zinc-300"
                                  }
                                >
                                  {task.title}
                                </span>
                                <div className="mt-1 flex gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] py-0 px-1 font-medium"
                                  >
                                    {task.complexity}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TimelineItem>
                  ))}
                </Timeline>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed border-zinc-800 bg-zinc-950/20">
              <Layers className="h-8 w-8 text-zinc-600 mb-2" />
              <h4 className="font-semibold text-zinc-400">Awaiting Active Goal</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Your structured milestones and task guides will render here once a goal plan is
                activated.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Goal creation modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set New Study Goal</DialogTitle>
            <DialogDescription>
              Configure your study objective to initialize adaptive recommendation updates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 block" htmlFor="goal-title">
                Title
              </label>
              <input
                id="goal-title"
                type="text"
                placeholder="e.g. Learn Next.js & TypeScript"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-red-400 font-medium">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 block" htmlFor="goal-desc">
                Description
              </label>
              <textarea
                id="goal-desc"
                placeholder="e.g. Master React hooks, Server Components, and API routing schemas"
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-red-400 font-medium">{errors.description.message}</p>
              )}
            </div>

            {/* Selector fields grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 block" htmlFor="goal-type">
                  Goal Type
                </label>
                <select
                  id="goal-type"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  {...register("type")}
                >
                  <option value="SKILL_ACQUISITION">Skill Acquisition</option>
                  <option value="CAREER_SHIFT">Career Shift</option>
                  <option value="EXAM_PREPARATION">Exam Preparation</option>
                </select>
              </div>

              {/* Difficulty */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 block" htmlFor="goal-diff">
                  Difficulty
                </label>
                <select
                  id="goal-diff"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  {...register("difficulty")}
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>
            </div>

            {/* Target Date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 block" htmlFor="goal-target">
                Target Date
              </label>
              <input
                id="goal-target"
                type="date"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                {...register("targetDate")}
              />
              {errors.targetDate && (
                <p className="text-xs text-red-400 font-medium">{errors.targetDate.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-3 justify-end pt-3">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={createGoalMutation.isPending}>
                {createGoalMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Seeding Plan...
                  </>
                ) : (
                  "Create Pathway"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
