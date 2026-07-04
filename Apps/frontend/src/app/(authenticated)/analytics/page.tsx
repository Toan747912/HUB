"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Brain,
  Activity,
  CheckCircle2,
  Clock,
  Calendar,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InsightFeed } from "@/components/insights/insight-feed";
import { useAuthStore } from "@/shared/stores/auth.store";
import { api } from "@/shared/services/api";
import { useInsights } from "@/shared/insight-engine";

const STUDY_TREND_DATA = [
  { date: "Mon", focusIndex: 68, engagement: 62, completionRate: 40, minutes: 45 },
  { date: "Tue", focusIndex: 75, engagement: 70, completionRate: 55, minutes: 60 },
  { date: "Wed", focusIndex: 82, engagement: 85, completionRate: 65, minutes: 90 },
  { date: "Thu", focusIndex: 78, engagement: 80, completionRate: 70, minutes: 75 },
  { date: "Fri", focusIndex: 85, engagement: 90, completionRate: 85, minutes: 120 },
  { date: "Sat", focusIndex: 92, engagement: 95, completionRate: 90, minutes: 150 },
  { date: "Sun", focusIndex: 88, engagement: 88, completionRate: 95, minutes: 90 },
];

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = React.useState("Last 7 Days");
  const user = useAuthStore((state) => state.user);

  const { data: goals } = useQuery({
    queryKey: ["goals"],
    queryFn: () => api.goal.goalControllerFindAll().then((res) => (res.data as any)?.items || []),
  });
  const { data: roadmaps } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () =>
      api.roadmap
        .roadmapControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });
  const { data: sessions } = useQuery({
    queryKey: ["learning-sessions"],
    queryFn: () =>
      api.learningSessions
        .learningSessionControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });
  const { data: assessments } = useQuery({
    queryKey: ["assessments"],
    queryFn: () =>
      api.assessment
        .assessmentControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });
  const { data: recommendationAggregates } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () =>
      api.recommendation
        .recommendationControllerFindAll({ learnerId: user?.id ?? "" })
        .then((res) => (res.data as any)?.items || []),
  });

  const insights = useInsights({
    goals: goals ?? [],
    roadmaps: roadmaps ?? [],
    assessments: assessments ?? [],
    recommendationPlans: recommendationAggregates ?? [],
    sessions: sessions ?? [],
  });
  const focusTrendInsight = insights.find((i) => i.category === "FOCUS_TREND");
  const knowledgeGrowthInsight = insights.find((i) => i.category === "KNOWLEDGE_GROWTH");
  const roadmapInsight = insights.find((i) => i.category === "ROADMAP_PROGRESS");

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Performance Analytics <TrendingUp className="h-6 w-6 text-indigo-500" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Review detailed metrics on focus levels, engagement, and study patterns
          </p>
        </div>
        <div className="relative">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 border-zinc-800">
            <Calendar className="h-4 w-4 text-zinc-400" /> {timeframe}{" "}
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          </Button>
        </div>
      </div>

      {/* Analytics Summary Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500 block">Total Focus Hours</span>
              <span className="text-2xl font-bold text-white">10.5 hrs</span>
              <span className="text-[10px] text-emerald-400 font-medium block">
                +12% vs last week
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Brain className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500 block">Avg. Engagement</span>
              <span className="text-2xl font-bold text-white">82%</span>
              <span className="text-[10px] text-emerald-400 font-medium block">
                +5% vs last week
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500 block">Task Completion</span>
              <span className="text-2xl font-bold text-white">71.4%</span>
              <span className="text-[10px] text-amber-400 font-medium block">-2% vs last week</span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500 block">Avg. Session Time</span>
              <span className="text-2xl font-bold text-white">90 mins</span>
              <span className="text-[10px] text-emerald-400 font-medium block">
                +8% vs last week
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Focus & Engagement Trend Chart (Area Chart) */}
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-base font-bold">Focus & Engagement Index</CardTitle>
            <CardDescription className="text-xs">
              Daily concentration levels mapped against interaction behaviors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={STUDY_TREND_DATA}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(9, 9, 11, 0.9)",
                      borderColor: "#27272a",
                      color: "#fff",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="focusIndex"
                    name="Focus Index"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#focusGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    name="Engagement"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#engagementGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {focusTrendInsight && (
              <p className="text-xs text-zinc-400 mt-3 border-t border-zinc-800 pt-3">
                {focusTrendInsight.title}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Study Minutes Distribution (Bar Chart) */}
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-base font-bold">Study Duration Distribution</CardTitle>
            <CardDescription className="text-xs">
              Total active learning minutes logged daily
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={STUDY_TREND_DATA}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(9, 9, 11, 0.9)",
                      borderColor: "#27272a",
                      color: "#fff",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="minutes" name="Minutes" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {knowledgeGrowthInsight && (
              <p className="text-xs text-zinc-400 mt-3 border-t border-zinc-800 pt-3">
                {knowledgeGrowthInsight.title}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Competency Completion Rate (Line Chart) */}
        <Card className="border-zinc-800 bg-zinc-900/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Roadmap Milestone Progression Rate
            </CardTitle>
            <CardDescription className="text-xs">
              Cumulative task and competency validation speed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={STUDY_TREND_DATA}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(9, 9, 11, 0.9)",
                      borderColor: "#27272a",
                      color: "#fff",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    name="Completion Rate (%)"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ stroke: "#f59e0b", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {roadmapInsight && (
              <p className="text-xs text-zinc-400 mt-3 border-t border-zinc-800 pt-3">
                {roadmapInsight.title}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Narrative Insights feed — deterministic, rule-based, no LLM */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">What this means for you</h2>
        <InsightFeed insights={insights} />
      </div>
    </div>
  );
}
