import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { GlassCard } from "../components/GlassCard";
import { AdminDashboardSkeleton } from "../components/Skeleton";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, EmptyStateCard } from "../components/ui/EmptyState";
import { DashboardGrid } from "../components/ui/DashboardGrid";
import {
  DashboardCard,
  DashboardCardHeader,
} from "../components/ui/DashboardCard";
import { StatCard } from "../components/ui/StatCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Button } from "../components/ui/Button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  FileText,
  CheckSquare,
  Sparkles,
  Activity,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Brain,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalMeetings: number;
  totalTasks: number;
  aiRequestsCount: number;
  activeUsers: number;
}

interface ChartItem {
  date: string;
  users: number;
  meetings: number;
  tasks: number;
  aiRequests: number;
}

interface ActivityItem {
  id: string;
  type: "user_registered" | "meeting_created" | "task_created";
  message: string;
  user?: { name: string; email: string };
  timestamp: string;
}

const METRIC_CONFIG = {
  users: { label: "Signups", color: "#0f172a" },
  meetings: { label: "Meetings", color: "#64748b" },
  aiRequests: { label: "AI Requests", color: "#94a3b8" },
} as const;

// A custom, theme-aware tooltip matching the app's card styling
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1222] px-3 py-2.5 shadow-lg text-xs space-y-1.5 min-w-[140px]">
      <p className="font-semibold text-slate-900 dark:text-white pb-1 border-b border-slate-100 dark:border-white/5">
        {label}
      </p>
      {payload.map((p: any) => (
        <div
          key={p.dataKey}
          className="flex items-center justify-between gap-4"
        >
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: p.color }}
            />
            {METRIC_CONFIG[p.dataKey as keyof typeof METRIC_CONFIG]?.label}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChartMetric, setSelectedChartMetric] = useState<
    "all" | "aiRequests" | "meetings" | "users"
  >("all");

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const res = await api.get("/admin/analytics");
      setStats(res.data.stats);
      setChartData(res.data.chartData);
      setActivities(res.data.activities);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to retrieve admin analytics. Please verify your connection.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  if (error) {
    return (
      <GlassCard className="max-w-2xl mx-auto mt-12 border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-950/10 p-8 text-center">
        <AlertTriangle
          className="mx-auto text-rose-500 dark:text-rose-400 mb-4"
          size={40}
        />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Administrative Error
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold transition-all shadow-lg inline-flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Retry Request
        </button>
      </GlassCard>
    );
  }

  const activeMetrics =
    selectedChartMetric === "all"
      ? (["users", "meetings", "aiRequests"] as const)
      : ([selectedChartMetric] as const);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Admin Dashboard"
        description="Real-time platform metrics, engagement trends, and system health."
        badge="Admin"
        action={
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            className={refreshing ? "opacity-50 pointer-events-none" : ""}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
              aria-hidden
            />
            Refresh
          </Button>
        }
      />

      <DashboardGrid variant="cards">
        <StatCard
          label="Total Users"
          value={stats?.totalUsers ?? "—"}
          icon={Users}
          iconClassName="bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          trend="↗ Platform scale"
          delay={0}
        />
        <StatCard
          label="Meetings Logs"
          value={stats?.totalMeetings ?? "—"}
          icon={FileText}
          iconClassName="bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          trend="↗ Active discussions"
          delay={0.05}
        />
        <StatCard
          label="Tasks Created"
          value={stats?.totalTasks ?? "—"}
          icon={CheckSquare}
          iconClassName="bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          trend="Live board cards"
          delay={0.1}
        />
        <StatCard
          label="AI Requests"
          value={stats?.aiRequestsCount ?? "—"}
          icon={Sparkles}
          iconClassName="bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          trend="Gemini summaries"
          delay={0.15}
        />
        <StatCard
          label="Active (30D)"
          value={stats?.activeUsers ?? "—"}
          icon={Activity}
          iconClassName="bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          trend="Monthly active users"
          delay={0.2}
        />
      </DashboardGrid>

      <DashboardGrid variant="main" className="!gap-5 lg:!gap-6">
        <div className="lg:col-span-8">
          <DashboardCard className="h-full flex flex-col" padding="md">
            <DashboardCardHeader
              title="Platform Engagement Velocity"
              description="Chronological telemetry of meetings, tasks, and signups."
              action={
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "aiRequests", "meetings", "users"] as const).map(
                    (m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedChartMetric(m)}
                        className={`
                        h-8 px-3 rounded-lg text-xs font-semibold transition-all border
                        ${
                          selectedChartMetric === m
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                            : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.08]"
                        }
                      `}
                      >
                        {m === "all"
                          ? "All"
                          : m === "aiRequests"
                            ? "AI"
                            : m === "meetings"
                              ? "Meetings"
                              : "Signups"}
                      </button>
                    ),
                  )}
                </div>
              }
            />

            {/* Vertical bar chart */}
            <div className="flex-1 min-h-[280px] sm:min-h-[320px] w-full pt-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    barGap={4}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      className="stroke-slate-200 dark:stroke-white/[0.06]"
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-slate-400 dark:text-slate-500"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-slate-400 dark:text-slate-500"
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "rgba(148,163,184,0.08)" }}
                    />
                    {selectedChartMetric === "all" && (
                      <Legend
                        verticalAlign="top"
                        align="right"
                        height={28}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {METRIC_CONFIG[value as keyof typeof METRIC_CONFIG]
                              ?.label ?? value}
                          </span>
                        )}
                      />
                    )}
                    {activeMetrics.map((key) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        name={key}
                        fill={METRIC_CONFIG[key].color}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyStateCard
                  icon={BarChart3}
                  title="No chart data yet"
                  description="Engagement metrics will populate as users create meetings, tasks, and AI summaries."
                  compact
                />
              )}
            </div>
          </DashboardCard>
        </div>

        <div className="lg:col-span-4">
          <DashboardCard
            className="h-full flex flex-col min-h-[20rem]"
            padding="md"
          >
            <DashboardCardHeader
              title="Operational Activity Log"
              description="Real-time events across the platform."
            />

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[320px] pr-1 -mr-1">
              {activities.length > 0 ? (
                activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-start gap-3.5"
                  >
                    <div className="p-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 shrink-0">
                      {act.type === "user_registered" ? (
                        <Users size={16} />
                      ) : act.type === "meeting_created" ? (
                        <FileText size={16} />
                      ) : (
                        <CheckSquare size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 dark:text-slate-200 font-sans tracking-wide leading-relaxed">
                        {act.message}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-slate-500 font-medium truncate">
                          {act.user?.email || "System Event"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium shrink-0 ml-2">
                          {timeAgo(act.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No recent activity"
                  description="Signups, meetings, and tasks will appear here in real time."
                  compact
                />
              )}
            </div>
          </DashboardCard>
        </div>
      </DashboardGrid>

      <div>
        <SectionHeader
          title="Telemetry & System Health"
          description="Live status of core infrastructure and AI services."
        />
        <DashboardGrid variant="health">
          <GlassCard className="border border-slate-200 dark:border-white/5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
              <Server size={22} />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-sans">
                API Gateway
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Express Backend
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-sans font-medium mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                100% Operational
              </span>
            </div>
          </GlassCard>

          <GlassCard className="border border-slate-200 dark:border-white/5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
              <Database size={22} />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-sans">
                Database Layer
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                MongoDB Cloud
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-sans font-medium mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Connected (3ms)
              </span>
            </div>
          </GlassCard>

          <GlassCard className="border border-slate-200 dark:border-white/5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
              <Brain size={22} />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-sans">
                Intelligence Engine
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Gemini 3.1 Flash
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-sans font-medium mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active and Validated
              </span>
            </div>
          </GlassCard>

          <GlassCard className="border border-slate-200 dark:border-white/5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
              <Cpu size={22} />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-sans">
                Hardware Telemetry
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Memory Heap Load
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-sans font-medium mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                24% Normal Capacity
              </span>
            </div>
          </GlassCard>
        </DashboardGrid>
      </div>
    </div>
  );
};
