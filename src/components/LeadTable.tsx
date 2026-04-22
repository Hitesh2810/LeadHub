import { Lead } from "@/types/lead";
import { StatusBadge, CategoryBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { getDisplayLeadId } from "@/lib/leadDisplay";

interface LeadTableProps {
  leads: Lead[];
  isAdmin?: boolean;
  businessUnitLeads?: Lead[];
  onRowClick?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
}

const LeadTable = ({
  leads,
  isAdmin = false,
  businessUnitLeads = [],
  onRowClick,
  onDelete,
}: LeadTableProps) => {
  if (leads.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No leads found.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[120px]">Lead ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Category</TableHead>
            <TableHead className="hidden lg:table-cell">Source</TableHead>
            <TableHead className="hidden xl:table-cell">Assigned To</TableHead>
            <TableHead className="hidden md:table-cell text-right">Date</TableHead>
            {isAdmin ? <TableHead className="w-[88px] text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow
              key={lead.id}
              className="cursor-pointer hover:bg-muted/30"
              onClick={() => onRowClick?.(lead)}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">
                {getDisplayLeadId(lead, isAdmin, businessUnitLeads)}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground md:hidden">{lead.company}</p>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {lead.company}
              </TableCell>
              <TableCell>
                <StatusBadge status={lead.status} />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <CategoryBadge category={lead.category} />
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {lead.source}
              </TableCell>
              <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                {lead.assignedTo}
              </TableCell>
              <TableCell className="hidden md:table-cell text-right text-sm text-muted-foreground">
                {format(new Date(lead.createdAt), "MMM d, yyyy")}
              </TableCell>
              {isAdmin ? (
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete?.(lead);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeadTable;
