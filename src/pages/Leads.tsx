import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchBar from "@/components/SearchBar";
import LeadTable from "@/components/LeadTable";
import LeadCard from "@/components/LeadCard";
import { allStatuses, allSources } from "@/data/demoLeads";
import { deleteLead, fetchCurrentUserAccess, fetchLeads } from "@/lib/api";
import { getDisplayLeadId } from "@/lib/leadDisplay";
import { toast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";

const Leads = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [view, setView] = useState<"table" | "grid">("table");
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const { data: currentUserAccess } = useQuery({
    queryKey: ["current-user-access"],
    queryFn: fetchCurrentUserAccess,
  });
  const { data: leads = [], isLoading, isError } = useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
  });

  const deleteLeadMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["followups"] }),
      ]);

      toast({
        title: "Lead Deleted",
        description: `${leadToDelete?.name || "Lead"} has been removed.`,
      });
      setLeadToDelete(null);
    },
    onError: (mutationError) => {
      toast({
        title: "Unable to delete lead",
        description: mutationError instanceof Error ? mutationError.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    let result = leads;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          getDisplayLeadId(l, Boolean(currentUserAccess?.isAdmin))
            .toLowerCase()
            .includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }

    if (sourceFilter !== "all") {
      result = result.filter((l) => l.source === sourceFilter);
    }

    return result;
  }, [currentUserAccess?.isAdmin, leads, search, sourceFilter, statusFilter]);

  const handleDelete = (lead: Lead) => {
    if (!currentUserAccess?.isAdmin) {
      return;
    }

    setLeadToDelete(lead);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Leads
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Button onClick={() => navigate("/leads/new")} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Lead
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={setSearch} />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {allStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {allSources.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1 ml-auto">
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("table")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Loading leads...
        </div>
      ) : isError ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
          Starting server... please wait
        </div>
      ) : (
      <>
      {view === "table" ? (
        <LeadTable
          leads={filtered}
          isAdmin={currentUserAccess?.isAdmin}
          businessUnitLeads={leads}
          onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
          onDelete={handleDelete}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No leads found.
            </div>
          ) : (
            filtered.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isAdmin={currentUserAccess?.isAdmin}
                displayLeadId={getDisplayLeadId(lead, Boolean(currentUserAccess?.isAdmin), leads)}
                onClick={(l) => navigate(`/leads/${l.id}`)}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}
      </>
      )}

      <AlertDialog open={Boolean(leadToDelete)} onOpenChange={(open) => !open && setLeadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {leadToDelete
                ? `${leadToDelete.name} (${getDisplayLeadId(leadToDelete, Boolean(currentUserAccess?.isAdmin), leads)}) will be removed from the main sheet, and the linked business unit row will be removed by email or phone when found.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLeadMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteLeadMutation.isPending}
              onClick={(event) => {
                event.preventDefault();

                if (!leadToDelete) {
                  return;
                }

                deleteLeadMutation.mutate(leadToDelete.leadId);
              }}
            >
              {deleteLeadMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Leads;
