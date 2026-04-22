import { cn } from "@/lib/utils";
import { LeadStatus, LeadCategory } from "@/types/lead";

const statusStyles: Record<LeadStatus, string> = {
  New: "bg-primary/10 text-primary",
  Contacted: "bg-blue-500/10 text-blue-600",
  "In Discussion": "bg-lead-warm/10 text-lead-warm",
  "Proposal Sent": "bg-purple-500/10 text-purple-600",
  Negotiation: "bg-orange-500/10 text-orange-600",
  Converted: "bg-success/10 text-success",
  Lost: "bg-destructive/10 text-destructive",
  "On Hold": "bg-muted text-muted-foreground",
};

const categoryStyles: Record<LeadCategory, string> = {
  Hot: "bg-destructive/10 text-destructive",
  Warm: "bg-lead-warm/10 text-lead-warm",
  Cold: "bg-lead-cold/10 text-lead-cold",
};

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      statusStyles[status],
      className
    )}
  >
    {status}
  </span>
);

interface CategoryBadgeProps {
  category: LeadCategory;
  className?: string;
}

export const CategoryBadge = ({ category, className }: CategoryBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      categoryStyles[category],
      className
    )}
  >
    {category}
  </span>
);
