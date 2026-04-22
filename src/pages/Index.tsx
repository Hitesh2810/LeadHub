import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Clock, TrendingUp, ArrowUpRight, CalendarClock } from "lucide-react";
import LeadTable from "@/components/LeadTable";
import { CategoryBadge } from "@/components/StatusBadge";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fetchCurrentUserAccess, fetchDashboard, fetchFollowUps, fetchLeads } from "@/lib/api";

const CATEGORY_COLORS = {
  Hot: "hsl(0, 84%, 60%)",
  Warm: "hsl(38, 92%, 50%)",
  Cold: "hsl(210, 40%, 60%)",
};

const Index = () => {
  const navigate = useNavigate();
  const {
    data: leads = [],
    isLoading: leadsLoading,
    isError: leadsError,
    error: leadsQueryError,
  } = useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
  });
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isError: dashboardError,
    error: dashboardQueryError,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });
  const { data: followUps = [] } = useQuery({
    queryKey: ["followups"],
    queryFn: fetchFollowUps,
  });
  const { data: currentUserAccess } = useQuery({
    queryKey: ["current-user-access"],
    queryFn: fetchCurrentUserAccess,
  });

  const sourceData = useMemo(
    () =>
      Object.entries(dashboard?.sourceCounts || {})
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    [dashboard],
  );

  const categoryData = useMemo(() => {
    const counts = dashboard?.categoryCounts || {};
    return ["Hot", "Warm", "Cold"].map((name) => ({
      name,
      value: counts[name] || 0,
    }));
  }, [dashboard]);

  const recentLeads = useMemo(
    () =>
      [...leads]
      .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [leads]
  );

  const cards = [
    {
      label: "Total Leads",
      value: dashboard?.totalLeads ?? 0,
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Converted",
      value: dashboard?.convertedLeads ?? 0,
      icon: UserCheck,
      color: "text-success",
    },
    {
      label: "Pending",
      value: dashboard?.pendingLeads ?? 0,
      icon: Clock,
      color: "text-lead-warm",
    },
    {
      label: "Conversion Rate",
      value: `${dashboard?.conversionRate ?? 0}%`,
      icon: TrendingUp,
      color: "text-accent",
    },
  ];

  // Follow-up indicators
  const followUpStats = useMemo(() => {
    const now = new Date();
    const overdue = followUps.filter((f) => !f.completed && new Date(f.date) < now && new Date(f.date).toDateString() !== now.toDateString()).length;
    const dueToday = followUps.filter((f) => !f.completed && new Date(f.date).toDateString() === now.toDateString()).length;
    return { overdue, dueToday };
  }, [followUps]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Your lead overview at a glance.
          </p>
        </div>
        <button
          onClick={() => navigate("/leads")}
          className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
        >
          View all leads <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-display">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {(dashboardLoading || leadsLoading) && (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Loading dashboard data...
        </div>
      )}

      {(dashboardError || leadsError) && (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-destructive">
          {dashboardQueryError instanceof Error
            ? dashboardQueryError.message
            : leadsQueryError instanceof Error
              ? leadsQueryError.message
              : "Unable to load dashboard data."}
        </div>
      )}

      {/* Charts row */}
      {!dashboardLoading && !leadsLoading && !dashboardError && !leadsError && (
      <>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Source bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Source</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[240px] items-center justify-center gap-6">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                >
                  {categoryData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {categoryData.map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-sm">
                  <CategoryBadge category={c.name as any} />
                  <span className="font-semibold">{c.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up reminders */}
      {(followUpStats.overdue > 0 || followUpStats.dueToday > 0) && (
        <Card className="border-l-4 border-l-lead-warm cursor-pointer" onClick={() => navigate("/follow-ups")}>
          <CardContent className="flex items-center gap-4 p-4">
            <CalendarClock className="h-5 w-5 text-lead-warm shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Follow-Up Reminders</p>
              <p className="text-xs text-muted-foreground">
                {followUpStats.overdue > 0 && (
                  <span className="text-destructive font-semibold">{followUpStats.overdue} overdue</span>
                )}
                {followUpStats.overdue > 0 && followUpStats.dueToday > 0 && " · "}
                {followUpStats.dueToday > 0 && `${followUpStats.dueToday} due today`}
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {/* Recent leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Leads</CardTitle>
          <button
            onClick={() => navigate("/leads")}
            className="text-xs font-medium text-primary hover:underline"
          >
            See all
          </button>
        </CardHeader>
        <CardContent className="p-0">
          <LeadTable
            leads={recentLeads}
            isAdmin={currentUserAccess?.isAdmin}
            onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
          />
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
};

export default Index;
