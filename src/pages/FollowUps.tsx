import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, isPast, isToday } from "date-fns";
import { CalendarClock, CheckCircle2, AlertTriangle, Clock, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FollowUp } from "@/types/followUp";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { fetchFollowUps, fetchLeads } from "@/lib/api";

const FollowUps = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "overdue" | "completed">("all");
  const {
    data: allFollowUps = [],
    isLoading: followUpsLoading,
    isError: followUpsError,
  } = useQuery({
    queryKey: ["followups"],
    queryFn: fetchFollowUps,
    refetchInterval: 10000,
  });
  const {
    data: leads = [],
    isLoading: leadsLoading,
    isError: leadsError,
  } = useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
  });

  const leadBusinessUnitMap = useMemo(
    () =>
      leads.reduce<Record<string, string>>((acc, lead) => {
        acc[lead.id] = `${lead.businessUnit || ""}`.trim();
        return acc;
      }, {}),
    [leads]
  );

  const categorised = useMemo(() => {
    const now = new Date();
    const overdue: FollowUp[] = [];
    const today: FollowUp[] = [];
    const upcoming: FollowUp[] = [];
    const completed: FollowUp[] = [];

    allFollowUps.forEach((f) => {
      const status = f.status || "Pending";
      if (status === "Completed" || f.completed) {
        completed.push(f);
      } else if (isToday(new Date(f.date))) {
        today.push(f);
      } else if (isPast(new Date(f.date))) {
        overdue.push(f);
      } else {
        upcoming.push(f);
      }
    });
    return { overdue, today, upcoming, completed };
  }, [allFollowUps]);

  const filtered = useMemo(() => {
    switch (statusFilter) {
      case "overdue":
        return { overdue: categorised.overdue, today: [], upcoming: [], completed: [] };
      case "pending":
        return { overdue: [], today: categorised.today, upcoming: categorised.upcoming, completed: [] };
      case "completed":
        return { overdue: [], today: [], upcoming: [], completed: categorised.completed };
      default:
        return categorised;
    }
  }, [categorised, statusFilter]);

  const overdueCount = categorised.overdue.length;
  const todayCount = categorised.today.length;
  const pendingCount = categorised.upcoming.length + todayCount;

  const summaryCards = [
    { label: "Overdue", value: overdueCount, icon: AlertTriangle, color: "text-destructive" },
    { label: "Due Today", value: todayCount, icon: Clock, color: "text-lead-warm" },
    { label: "Upcoming", value: pendingCount, icon: CalendarClock, color: "text-primary" },
    { label: "Completed", value: categorised.completed.length, icon: CheckCircle2, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Follow-Ups</h1>
          <p className="text-sm text-muted-foreground">Track and manage your scheduled follow-ups.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {followUpsLoading || leadsLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Loading follow-ups...
        </div>
      ) : followUpsError || leadsError ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
          Starting server... please wait
        </div>
      ) : (
      <>
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-display">{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Follow-up sections */}
      <div className="space-y-5">
        <FollowUpSection
          title="Overdue"
          items={filtered.overdue}
          variant="overdue"
          navigate={navigate}
          leadBusinessUnitMap={leadBusinessUnitMap}
        />
        <FollowUpSection
          title="Due Today"
          items={filtered.today}
          variant="today"
          navigate={navigate}
          leadBusinessUnitMap={leadBusinessUnitMap}
        />
        <FollowUpSection
          title="Upcoming"
          items={filtered.upcoming}
          variant="upcoming"
          navigate={navigate}
          leadBusinessUnitMap={leadBusinessUnitMap}
        />
        <FollowUpSection
          title="Completed"
          items={filtered.completed}
          variant="completed"
          navigate={navigate}
          leadBusinessUnitMap={leadBusinessUnitMap}
        />
      </div>
      </>
      )}
    </div>
  );
};

/* --- Section component --- */
interface FollowUpSectionProps {
  title: string;
  items: FollowUp[];
  variant: "overdue" | "today" | "upcoming" | "completed";
  navigate: (path: string) => void;
  leadBusinessUnitMap: Record<string, string>;
}

const variantStyles: Record<string, string> = {
  overdue: "border-l-destructive",
  today: "border-l-lead-warm",
  upcoming: "border-l-primary",
  completed: "border-l-success",
};

const FollowUpSection = ({ title, items, variant, navigate, leadBusinessUnitMap }: FollowUpSectionProps) => {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
        {title}
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </h2>
      <div className="space-y-2">
        {items.map((f) => {
          const lead = f as FollowUp & {
            businessUnit?: string;
            productService?: string;
            ProductService?: string;
          };
          const businessUnit =
            leadBusinessUnitMap[f.leadId] ||
            lead.businessUnit ||
            lead.productService ||
            lead.ProductService ||
            "N/A";

          console.log("Lead:", lead);

          return (
            <Card
              key={f.id}
              className={cn(
                "border-l-4 cursor-pointer transition-shadow hover:shadow-md",
                variantStyles[variant],
                f.completed && "opacity-60"
              )}
              onClick={() => navigate(`/leads/${f.leadId}`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{f.leadName}</p>
                  <p className="text-xs text-muted-foreground">{f.company}</p>
                  <p className="text-sm mt-1">{f.note}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-xs font-medium">
                    {format(new Date(f.date), "MMM d, yyyy")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{f.assignedTo}</p>
                  <p className="text-xs text-gray-400">{businessUnit}</p>
                  <p className="text-xs text-muted-foreground">{f.status || "Pending"}</p>
                  {(f.status === "Completed" || f.completed) && (
                    <Badge variant="secondary" className="text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-0.5" /> Done
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FollowUps;
