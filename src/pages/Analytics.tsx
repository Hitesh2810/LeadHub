import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchLeads } from "@/lib/api";
import {
  Users,
  UserCheck,
  TrendingUp,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import { CategoryBadge } from "@/components/StatusBadge";
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
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";

/* ─── colour maps ─── */
const CATEGORY_COLORS: Record<string, string> = {
  Hot: "hsl(0, 84%, 60%)",
  Warm: "hsl(38, 92%, 50%)",
  Cold: "hsl(210, 40%, 60%)",
};

const STATUS_COLORS: Record<string, string> = {
  New: "hsl(243, 75%, 59%)",
  Contacted: "hsl(172, 66%, 50%)",
  "In Discussion": "hsl(38, 92%, 50%)",
  "Proposal Sent": "hsl(280, 65%, 60%)",
  Negotiation: "hsl(200, 70%, 50%)",
  Converted: "hsl(142, 71%, 45%)",
  Lost: "hsl(0, 84%, 60%)",
  "On Hold": "hsl(220, 9%, 46%)",
};

const SOURCE_COLORS = [
  "hsl(243, 75%, 59%)",
  "hsl(172, 66%, 50%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 65%, 60%)",
  "hsl(200, 70%, 50%)",
  "hsl(142, 71%, 45%)",
];

const PIPELINE_STAGES = [
  "New",
  "Contacted",
  "In Discussion",
  "Proposal Sent",
  "Negotiation",
  "Converted",
];

/* ─── tooltip style ─── */
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const Analytics = () => {
  const {
    data: leads = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
  });

  /* ── KPI stats ── */
  const kpis = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter((l) => l.status === "Converted").length;
    const lost = leads.filter((l) => l.status === "Lost").length;
    const active = leads.filter(
      (l) => !["Converted", "Lost"].includes(l.status)
    ).length;
    const hot = leads.filter((l) => l.category === "Hot").length;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
    const lossRate = total > 0 ? Math.round((lost / total) * 100) : 0;
    return { total, converted, lost, active, hot, conversionRate, lossRate };
  }, [leads]);

  /* ── Lead sources ── */
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => (map[l.source] = (map[l.source] || 0) + 1));
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  /* ── Lead categories ── */
  const categoryData = useMemo(() => {
    const map: Record<string, number> = { Hot: 0, Warm: 0, Cold: 0 };
    leads.forEach((l) => (map[l.category] = (map[l.category] || 0) + 1));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [leads]);

  /* ── Lead statuses ── */
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => (map[l.status] = (map[l.status] || 0) + 1));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [leads]);

  /* ── Sales team performance ── */
  const teamData = useMemo(() => {
    const map: Record<string, { total: number; converted: number; hot: number }> = {};
    leads.forEach((l) => {
      if (!map[l.assignedTo]) map[l.assignedTo] = { total: 0, converted: 0, hot: 0 };
      map[l.assignedTo].total++;
      if (l.status === "Converted") map[l.assignedTo].converted++;
      if (l.category === "Hot") map[l.assignedTo].hot++;
    });
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        total: d.total,
        converted: d.converted,
        hot: d.hot,
        rate: d.total > 0 ? Math.round((d.converted / d.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  /* ── Conversion funnel ── */
  const funnelData = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      name: stage,
      value: leads.filter((l) => PIPELINE_STAGES.indexOf(l.status) >= PIPELINE_STAGES.indexOf(stage)).length,
    }));
  }, [leads]);

  /* ── Conversion radial gauge ── */
  const gaugeData = useMemo(
    () => [{ name: "Conversion", value: kpis.conversionRate, fill: "hsl(142, 71%, 45%)" }],
    [kpis.conversionRate]
  );

  const statCards = [
    { label: "Total Leads", value: kpis.total, icon: Users, color: "text-primary" },
    { label: "Converted", value: kpis.converted, icon: UserCheck, color: "text-success" },
    { label: "Conversion Rate", value: `${kpis.conversionRate}%`, icon: TrendingUp, color: "text-accent" },
    { label: "Active Pipeline", value: kpis.active, icon: Target, color: "text-lead-warm" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Analytics</h1>
        <p className="text-muted-foreground">Live performance metrics from your Google Sheets lead data.</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-display">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Loading analytics data...
        </div>
      ) : isError ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-destructive">
          {error instanceof Error ? error.message : "Unable to load analytics data."}
        </div>
      ) : (
        <>

      {/* Row 1: Source bar + Category pie */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Source performance */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Lead Sources Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">Lead Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[260px] items-center justify-center gap-6">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                >
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
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

      {/* Row 2: Conversion funnel + Status breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversion funnel */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Activity className="h-4 w-4 text-chart-5" />
            <CardTitle className="text-base">Lead Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "hsl(var(--muted))"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Sales team performance */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Sales Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Grouped bar chart */}
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamData} margin={{ left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total" name="Total Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="converted" name="Converted" fill="hsl(var(--success, 142 71% 45%))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="hot" name="Hot Leads" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Team stats table */}
            <div className="space-y-3">
              {teamData.map((member) => (
                <div
                  key={member.name}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.total} leads · {member.converted} converted
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-success">{member.rate}%</p>
                    <p className="text-xs text-muted-foreground">conversion</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 4: Follow-up summary + Conversion gauge */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pipeline stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Active Leads", value: kpis.active, color: "text-lead-warm" },
                { label: "Hot Leads", value: kpis.hot, color: "text-destructive" },
                { label: "Lost Leads", value: kpis.lost, color: "text-destructive" },
                { label: "Loss Rate", value: `${kpis.lossRate}%`, color: "text-destructive" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-muted/40 p-4 text-center">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion gauge */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent className="relative flex h-[200px] items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                data={gaugeData}
                startAngle={180}
                endAngle={0}
                barSize={16}
              >
                <RadialBar
                  background={{ fill: "hsl(var(--muted))" }}
                  dataKey="value"
                  cornerRadius={8}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-3xl font-bold text-success">{kpis.conversionRate}%</p>
              <p className="text-xs text-muted-foreground">of leads converted</p>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
