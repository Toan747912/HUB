"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Play, Loader2, Plus, HelpCircle } from "lucide-react";
import { useAuthStore } from "@/shared/stores/auth.store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/shared/stores/toast.store";
import { useFocusModeStore } from "@/shared/stores/focus-mode.store";
import { api } from "@/shared/services/api";
import { getFriendlyErrorMessage } from "@/shared/utils/error-message";
import { SessionTimer } from "./components/session-timer";
import { SessionChecklist } from "./components/session-checklist";
import { SessionNotesPanel } from "./components/session-notes-panel";
import { ReflectionModal } from "./components/reflection-modal";
import { EvidenceDialog, type EvidenceInput } from "./components/evidence-dialog";
import { FocusModeToggle } from "./components/focus-mode-toggle";
import { ShortcutsHelpDialog } from "./components/shortcuts-help-dialog";
import { SessionLifecycleControls } from "./components/session-lifecycle-controls";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { trackWorkspaceEvent } from "./lib/telemetry";

export default function LearningSessionsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const exitFocusMode = useFocusModeStore((state) => state.exit);

  const [openEvidence, setOpenEvidence] = React.useState(false);
  const [openReflection, setOpenReflection] = React.useState(false);
  const [openHelp, setOpenHelp] = React.useState(false);
  const [pendingTaskId, setPendingTaskId] = React.useState<string | null>(null);

  const notesRef = React.useRef<{ saveNow: () => void } | null>(null);

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["learning-sessions"],
    queryFn: () =>
      api.learningSessions
        .learningSessionControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });

  const activeSession = sessions?.find((s: any) => s.status === "ACTIVE" || s.status === "PAUSED");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["learning-sessions"] });

  const startSessionMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api.learningSessions.learningSessionControllerStart(id, { expectedVersion: version }),
    onSuccess: () => {
      trackWorkspaceEvent("session_started");
      invalidate();
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const sessionId = crypto.randomUUID();
      const created = await api.learningSessions.learningSessionControllerCreate({
        sessionId,
        learnerId: user?.id ?? "",
        goalId: crypto.randomUUID(),
        roadmapId: crypto.randomUUID(),
      } as any);
      const version = (created.data as any)?.aggregateVersion ?? 1;
      await startSessionMutation.mutateAsync({ id: sessionId, version });
    },
    onSuccess: () => {
      toast({
        title: "Session initialized",
        description: "Study session and evidence logs are now open.",
        type: "success",
      });
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: "Creation failed",
        description: getFriendlyErrorMessage(
          err,
          "We couldn't start your session. Please try again.",
        ),
        type: "error",
      });
    },
  });

  const pauseSessionMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api.learningSessions.learningSessionControllerPause(id, { expectedVersion: version }),
    onSuccess: () => {
      trackWorkspaceEvent("session_paused");
      invalidate();
    },
  });

  const resumeSessionMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api.learningSessions.learningSessionControllerResume(id, { expectedVersion: version }),
    onSuccess: () => {
      trackWorkspaceEvent("session_resumed");
      invalidate();
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api.learningSessions.learningSessionControllerComplete(id, { expectedVersion: version }),
    onSuccess: () => {
      trackWorkspaceEvent("session_completed");
      toast({
        title: "Session complete!",
        description: "Your learning progress was recorded.",
        type: "success",
      });
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: "Reflection saved, but completion failed",
        description: getFriendlyErrorMessage(
          err,
          "Your reflection was saved, but we couldn't finish the session. Please try completing it again.",
        ),
        type: "error",
      });
    },
  });

  const reflectionMutation = useMutation({
    mutationFn: ({
      id,
      content,
      rating,
      version,
    }: {
      id: string;
      content: string;
      rating: number;
      version: number;
    }) =>
      api.learningSessions.learningSessionControllerSubmitReflection(id, {
        content,
        rating,
        expectedVersion: version,
      } as any),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({
      id,
      taskId,
      completed,
      version,
    }: {
      id: string;
      taskId: string;
      completed: boolean;
      version: number;
    }) =>
      api.learningSessions.learningSessionControllerToggleTask(id, taskId, {
        completed,
        expectedVersion: version,
      } as any),
    onSettled: () => {
      setPendingTaskId(null);
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't update task",
        description: getFriendlyErrorMessage(
          err,
          "We couldn't update that task. Please try again.",
        ),
        type: "error",
      });
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.learningSessions.learningSessionControllerSaveNotes(id, { content } as any),
    onSuccess: () => invalidate(),
  });

  const recordEvidenceMutation = useMutation({
    mutationFn: (data: EvidenceInput) => {
      const lastTimer = activeSession.timers?.[activeSession.timers.length - 1];
      return api.learningSessions.learningSessionControllerRecordEvidence(activeSession.id, {
        evidenceId: crypto.randomUUID(),
        completedTasks: activeSession.progress?.completedTasksCount ?? 0,
        timeSpent: lastTimer?.elapsedSeconds ?? 0,
        interruptions: lastTimer?.interruptions ?? 0,
        revisionCount: 0,
        focusScore: data.focusScore,
        engagementScore: data.engagementScore,
        expectedVersion: activeSession.aggregateVersion,
      } as any);
    },
    onSuccess: () => {
      trackWorkspaceEvent("evidence_recorded");
      toast({
        title: "Evidence recorded",
        description: "Session telemetry updated.",
        type: "success",
      });
      setOpenEvidence(false);
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: "Failed to record",
        description: getFriendlyErrorMessage(
          err,
          "We couldn't record that evidence. Please try again.",
        ),
        type: "error",
      });
    },
  });

  const handleTogglePause = React.useCallback(() => {
    if (!activeSession) return;
    if (activeSession.status === "ACTIVE") {
      pauseSessionMutation.mutate({
        id: activeSession.id,
        version: activeSession.aggregateVersion,
      });
    } else if (activeSession.status === "PAUSED") {
      resumeSessionMutation.mutate({
        id: activeSession.id,
        version: activeSession.aggregateVersion,
      });
    }
  }, [activeSession, pauseSessionMutation, resumeSessionMutation]);

  const handleRequestComplete = React.useCallback(() => {
    if (!activeSession) return;
    if (activeSession.status !== "ACTIVE") {
      toast({
        title: "Resume the session to complete it",
        description: "Completion is only available while the session is active.",
        type: "warning",
      });
      return;
    }
    setOpenReflection(true);
  }, [activeSession]);

  const handleReflectionSubmit = React.useCallback(
    async (content: string, rating: number) => {
      if (!activeSession) return;
      try {
        const reflectionRes = await reflectionMutation.mutateAsync({
          id: activeSession.id,
          content,
          rating,
          version: activeSession.aggregateVersion,
        });
        const updatedVersion =
          (reflectionRes.data as any)?.aggregateVersion ?? activeSession.aggregateVersion + 1;
        setOpenReflection(false);
        await completeSessionMutation.mutateAsync({
          id: activeSession.id,
          version: updatedVersion,
        });
      } catch (err: any) {
        toast({
          title: "Couldn't save reflection",
          description: getFriendlyErrorMessage(
            err,
            "We couldn't save your reflection. Please try again.",
          ),
          type: "error",
        });
      }
    },
    [activeSession, reflectionMutation, completeSessionMutation],
  );

  const handleToggleTask = React.useCallback(
    (taskId: string, completed: boolean) => {
      if (!activeSession) return;
      setPendingTaskId(taskId);
      toggleTaskMutation.mutate({
        id: activeSession.id,
        taskId,
        completed,
        version: activeSession.aggregateVersion,
      });
    },
    [activeSession, toggleTaskMutation],
  );

  const handleSaveNotes = React.useCallback(
    (content: string) => {
      if (!activeSession) return Promise.resolve();
      return saveNotesMutation.mutateAsync({ id: activeSession.id, content });
    },
    [activeSession, saveNotesMutation],
  );

  useKeyboardShortcuts({
    onTogglePause: handleTogglePause,
    onSaveNotes: () => notesRef.current?.saveNow(),
    onComplete: handleRequestComplete,
    onExitFocusMode: exitFocusMode,
    onOpenHelp: () => setOpenHelp(true),
  });

  const isTerminal = activeSession
    ? ["COMPLETED", "CANCELLED", "ARCHIVED"].includes(activeSession.status)
    : false;

  return (
    <div className="space-y-8 fade-in-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Study Workspace <BookOpen className="h-6 w-6 text-indigo-500" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Execute your learning pathway, log evidence telemetry, and synchronize your progress
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpenHelp(true)}
            aria-label="Open keyboard shortcut help"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <FocusModeToggle />
        </div>
      </div>

      {sessionsLoading && (
        <div className="flex items-center justify-center p-16 text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!sessionsLoading && activeSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900/30">
            <CardHeader className="pb-4 border-b border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-white">
                    {activeSession.title || "Adaptive Study Loop"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Session ID:{" "}
                    <span className="font-mono text-zinc-500">{activeSession.id.slice(0, 8)}</span>
                  </CardDescription>
                </div>
                <Badge variant={activeSession.status === "ACTIVE" ? "success" : "warning"}>
                  {activeSession.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <SessionTimer
                timer={activeSession.timers?.[activeSession.timers.length - 1]}
                status={activeSession.status}
              />

              <SessionLifecycleControls
                status={activeSession.status}
                isPausing={pauseSessionMutation.isPending}
                isResuming={resumeSessionMutation.isPending}
                onPause={handleTogglePause}
                onResume={handleTogglePause}
                onRequestComplete={handleRequestComplete}
              />

              <SessionNotesPanel
                sessionId={activeSession.id}
                serverContent={activeSession.notes?.content ?? ""}
                serverUpdatedAt={activeSession.notes?.updatedAt ?? null}
                disabled={isTerminal}
                onSave={handleSaveNotes}
                notesRef={notesRef}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <SessionChecklist
              tasks={activeSession.tasks ?? []}
              disabled={isTerminal}
              pendingTaskId={pendingTaskId}
              onToggle={handleToggleTask}
            />

            <Card className="border-zinc-800 bg-zinc-900/30">
              <CardContent className="p-4">
                <Button
                  onClick={() => setOpenEvidence(true)}
                  variant="outline"
                  className="w-full border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
                  disabled={isTerminal}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Log Study Evidence
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        !sessionsLoading && (
          <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed border-zinc-800 bg-zinc-950/20">
            <BookOpen className="h-12 w-12 text-zinc-600 mb-2 animate-pulse" />
            <h3 className="font-semibold text-zinc-400">No session is currently active</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Launch a study workspace to track stopwatch focus hours and log verified skill
              progress.
            </p>
            <Button
              onClick={() => createSessionMutation.mutate()}
              disabled={createSessionMutation.isPending}
              variant="gradient"
              className="mt-6 flex items-center gap-1.5"
            >
              {createSessionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Launching...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Start Study Session
                </>
              )}
            </Button>
          </Card>
        )
      )}

      <EvidenceDialog
        open={openEvidence}
        onOpenChange={setOpenEvidence}
        isSubmitting={recordEvidenceMutation.isPending}
        onSubmit={(data) => recordEvidenceMutation.mutate(data)}
      />

      <ReflectionModal
        open={openReflection}
        onOpenChange={setOpenReflection}
        isSubmitting={reflectionMutation.isPending || completeSessionMutation.isPending}
        onSubmit={handleReflectionSubmit}
      />

      <ShortcutsHelpDialog open={openHelp} onOpenChange={setOpenHelp} />
    </div>
  );
}
