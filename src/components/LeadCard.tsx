import { Lead } from "@/types/lead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, CategoryBadge } from "@/components/StatusBadge";
import { Building2, Mail, Phone, Trash2 } from "lucide-react";
import { getDisplayLeadId } from "@/lib/leadDisplay";

interface LeadCardProps {
  lead: Lead;
  isAdmin?: boolean;
  displayLeadId?: string;
  onClick?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
}

const LeadCard = ({ lead, isAdmin = false, displayLeadId, onClick, onDelete }: LeadCardProps) => (
  <Card
    className="cursor-pointer transition-shadow hover:shadow-md"
    onClick={() => onClick?.(lead)}
  >
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{lead.name}</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.company}</span>
          </div>
        </div>
        <CategoryBadge category={lead.category} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusBadge status={lead.status} />
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
          {lead.source}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Mail className="h-3 w-3" />
          <span className="truncate">{lead.email}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="h-3 w-3" />
          <span>{lead.phone}</span>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        {displayLeadId || getDisplayLeadId(lead, isAdmin)}
      </p>
      {isAdmin ? (
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(lead);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      ) : null}
    </CardContent>
  </Card>
);

export default LeadCard;
