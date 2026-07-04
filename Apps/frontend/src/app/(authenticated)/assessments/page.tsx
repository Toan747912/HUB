"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Radar as RadarIcon,
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Play,
  CheckCircle,
  Loader2,
  Bookmark,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { useAuthStore } from "@/shared/stores/auth.store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/shared/stores/toast.store";
import { api } from "@/shared/services/api";
import { getFriendlyErrorMessage } from "@/shared/utils/error-message";

const SKILL_RADAR_DATA = [
  { subject: "Outbox Pattern", A: 85, fullMark: 100 },
  { subject: "Schema Validation", A: 90, fullMark: 100 },
  { subject: "Domain Boundaries", A: 75, fullMark: 100 },
  { subject: "Locks & Mutexes", A: 55, fullMark: 100 },
  { subject: "Event Orchestration", A: 60, fullMark: 100 },
];

export default function AssessmentsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [openQuiz, setOpenQuiz] = React.useState(false);
  const [selectedGap, setSelectedGap] = React.useState<any>(null);
  const [quizAnswer, setQuizAnswer] = React.useState<string | null>(null);

  // Queries
  const { data: assessments, isLoading } = useQuery({
    queryKey: ["assessments"],
    queryFn: () =>
      api.assessment
        .assessmentControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });

  const latestAssessment = assessments?.[0];

  // Assessment run mutation
  const runAssessmentMutation = useMutation({
    mutationFn: () => {
      const assessmentId = crypto.randomUUID();
      return api.assessment.assessmentControllerRun({
        assessmentId,
        learnerId: user?.id ?? "",
        goalId: crypto.randomUUID(), // linked dummy goal
        evidenceIds: [],
      });
    },
    onSuccess: () => {
      toast({
        title: "Assessment complete!",
        description: "Your mastery indicators have been recalculated.",
        type: "success",
      });
      setOpenQuiz(false);
      setQuizAnswer(null);
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
    onError: (err: any) => {
      toast({
        title: "Evaluation failed",
        description: getFriendlyErrorMessage(
          err,
          "We couldn't record your results. Please try again.",
        ),
        type: "error",
      });
    },
  });

  const handleLaunchAssessment = (gap: any) => {
    setSelectedGap(gap);
    setOpenQuiz(true);
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizAnswer) return;
    runAssessmentMutation.mutate();
  };

  const knowledgeGaps = React.useMemo(() => {
    // Return gaps below 70 score threshold
    return [
      {
        id: "gap-1",
        skill: "Locks & Mutexes",
        currentScore: 55,
        recommendation: "Read up on distributed Redis locks & mutex patterns.",
      },
      {
        id: "gap-2",
        skill: "Event Orchestration",
        currentScore: 60,
        recommendation: "Review Outbox publisher event handlers and schedules.",
      },
    ];
  }, []);

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
            Assessment Center <Award className="h-6 w-6 text-indigo-500" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Measure skill readiness, view mastery charts, and resolve knowledge gaps
          </p>
        </div>
        <Button
          onClick={() => handleLaunchAssessment(null)}
          variant="gradient"
          size="sm"
          className="flex items-center gap-1.5"
        >
          <Play className="h-4 w-4" /> Run Global Assessment
        </Button>
      </div>

      {/* Main grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Radar Chart Card */}
        <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <RadarIcon className="h-4 w-4 text-indigo-400" /> Mastery Profile Radar
            </CardTitle>
            <CardDescription className="text-xs">
              Visual mapping of confidence indices across core competencies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={SKILL_RADAR_DATA}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="subject" stroke="#a1a1aa" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#52525b" fontSize={10} />
                  <Radar
                    name="Learner Mastery"
                    dataKey="A"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Confidence score card */}
        <Card className="glass-indigo">
          <CardHeader>
            <CardTitle className="text-base font-bold">Profile Confidence</CardTitle>
            <CardDescription className="text-xs">
              Aggregate score of verified knowledge vectors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 text-center">
            <div className="relative inline-flex items-center justify-center">
              {/* Radial gradient tracker border */}
              <div className="h-32 w-32 rounded-full border-4 border-zinc-800 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-white">
                  {latestAssessment ? Math.round(latestAssessment.confidenceScore || 72) : 72}
                </span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">
                  Score
                </span>
              </div>
            </div>
            <div>
              <span className="text-xs text-zinc-400">Current Status Indicator:</span>
              <div className="mt-2">
                <Badge
                  variant={latestAssessment?.readiness === "READY" ? "success" : "warning"}
                  className="px-3 py-1 text-xs"
                >
                  {latestAssessment?.readiness ?? "NEEDS_EVALUATION"}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed italic">
              &ldquo;Your locks & concurrency scores are currently reducing the readiness vector.
              Complete a focused concurrency workspace to upgrade.&rdquo;
            </p>
          </CardContent>
        </Card>

        {/* Knowledge Gaps list */}
        <Card className="lg:col-span-3 border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500" /> Active Knowledge Gaps
            </CardTitle>
            <CardDescription className="text-xs">
              Identified competencies that score below target thresholds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill Subject</TableHead>
                  <TableHead>Verified Mastery</TableHead>
                  <TableHead>Remediation Path</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {knowledgeGaps.map((gap) => (
                  <TableRow key={gap.id}>
                    <TableCell className="font-semibold text-white">{gap.skill}</TableCell>
                    <TableCell>
                      <Badge variant="warning">{gap.currentScore}%</Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs">{gap.recommendation}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => handleLaunchAssessment(gap)}
                        size="sm"
                        variant="outline"
                        className="border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
                      >
                        Test Skill
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Modal */}
      <Dialog open={openQuiz} onOpenChange={setOpenQuiz}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedGap ? `Test Mastery: ${selectedGap.skill}` : "Global Readiness Evaluation"}
            </DialogTitle>
            <DialogDescription>
              Verify your comprehension to update your learning confidence matrix.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuizSubmit} className="space-y-6 mt-4">
            <div className="p-4 rounded border border-zinc-800 bg-zinc-950/60 text-sm">
              <span className="text-xs font-bold text-indigo-400 block mb-2">QUESTION</span>
              <p className="text-white font-medium">
                Which tool guarantees transaction message delivery in distributed microservices
                without direct database write-locks?
              </p>

              <div className="mt-4 space-y-2">
                {[
                  { key: "A", text: "Transactional Outbox Pattern with Relay scheduler" },
                  { key: "B", text: "Two-Phase Commit distributed table lock" },
                  { key: "C", text: "Redis memory locks without persistence sync" },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex items-start space-x-3 p-3 rounded border cursor-pointer transition-all ${
                      quizAnswer === opt.key
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                        : "border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 text-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="quiz"
                      value={opt.key}
                      checked={quizAnswer === opt.key}
                      onChange={() => setQuizAnswer(opt.key)}
                      className="mt-0.5"
                    />
                    <span>
                      <strong className="mr-1">{opt.key}.</strong> {opt.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpenQuiz(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gradient"
                disabled={!quizAnswer || runAssessmentMutation.isPending}
              >
                {runAssessmentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Submit Evaluation"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
