import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  Package,
  User,
  Calendar,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, CategoryBadge } from "@/components/StatusBadge";
import { allStatuses, allCategories } from "@/data/demoLeads";
import type { Lead, LeadStatus, LeadCategory } from "@/types/lead";
import type { FollowUp } from "@/types/followUp";
import { toast } from "@/hooks/use-toast";
import AssignLead from "@/components/AssignLead";
import FollowUpForm from "@/components/FollowUpForm";
import { fetchCurrentUserAccess, fetchFollowUps, fetchLeads, updateLead } from "@/lib/api";
import { getDisplayLeadId } from "@/lib/leadDisplay";

// Placeholder activity timeline (will come from DB in Phase 6)
const generateTimeline = (lead: Lead) => [
  { id: "1", action: "Lead created", detail: `Source: ${lead.source}`, date: lead.createdAt },
  { id: "2", action: "Assigned to", detail: lead.assignedTo, date: lead.createdAt },
  ...(lead.status !== "New"
    ? [{ id: "3", action: "Status changed", detail: `→ ${lead.status}`, date: lead.updatedAt }]
    : []),
];

const LeadDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUserAccess } = useQuery({
    queryKey: ["current-user-access"],
    queryFn: fetchCurrentUserAccess,
  });
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
  });
  const { data: followUps = [] } = useQuery({
    queryKey: ["followups"],
    queryFn: fetchFollowUps,
  });
  const lead = leads.find((item) => item.id === id);

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});

  const updateLeadMutation = useMutation({
    mutationFn: async () => {
      if (!lead) {
        throw new Error("Lead not found.");
      }

      return updateLead(lead.leadId, {
        name: `${editData.name ?? lead.name}`.trim(),
        company: `${editData.company ?? lead.company}`.trim(),
        email: `${editData.email ?? lead.email}`.trim(),
        phone: `${editData.phone ?? lead.phone}`.trim(),
        source: `${lead.source}`.trim(),
        status: `${editData.status ?? lead.status}`.trim(),
        category: `${editData.category ?? lead.category}`.trim(),
        assignedTo: `${editData.assignedTo ?? lead.assignedTo}`.trim(),
        businessUnit: `${editData.businessUnit ?? lead.businessUnit}`.trim(),
        notes: `${editData.notes ?? lead.notes ?? ""}`.trim(),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["followups"] }),
      ]);

      toast({ title: "Lead Updated", description: "Changes saved successfully." });
      setEditing(false);
      setEditData({});
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to update lead",
        description: error.message || "Something went wrong while saving changes.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Loading lead...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button variant="outline" onClick={() => navigate("/leads")}>
          Back to Leads
        </Button>
      </div>
    );
  }

  const timeline = generateTimeline(lead);
  const leadFollowUps: FollowUp[] = [
    ...followUps.filter((f) => f.leadId === lead.id),
  ];

  const startEdit = () => {
    setEditData({
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      businessUnit: lead.businessUnit,
      notes: lead.notes,
      assignedTo: lead.assignedTo,
      status: lead.status,
      category: lead.category,
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditData({});
  };

  const saveEdit = () => {
    updateLeadMutation.mutate();
  };

  const currentStatus = (editing ? editData.status : lead.status) as LeadStatus;
  const currentCategory = (editing ? editData.category : lead.category) as LeadCategory;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {editing ? (
                <Input
                  className="text-2xl font-bold h-auto py-0 px-1 md:text-3xl"
                  value={editData.name ?? ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              ) : (
                lead.name
              )}
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {getDisplayLeadId(lead, Boolean(currentUserAccess?.isAdmin), leads)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={updateLeadMutation.isPending}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={updateLeadMutation.isPending}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Edit2 className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column: Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status & Category */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              {editing ? (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Select
                      value={editData.status}
                      onValueChange={(v) => setEditData({ ...editData, status: v as LeadStatus })}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allStatuses.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <Select
                      value={editData.category}
                      onValueChange={(v) => setEditData({ ...editData, category: v as LeadCategory })}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <StatusBadge status={currentStatus} />
                  <CategoryBadge category={currentCategory} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={Building2} label="Company" value={editing ? editData.company : lead.company} editing={editing} onChange={(v) => setEditData({ ...editData, company: v })} />
              <InfoRow icon={Mail} label="Email" value={editing ? editData.email : lead.email} editing={editing} onChange={(v) => setEditData({ ...editData, email: v })} />
              <InfoRow icon={Phone} label="Phone" value={editing ? editData.phone : lead.phone} editing={editing} onChange={(v) => setEditData({ ...editData, phone: v })} />
              <InfoRow icon={Globe} label="Source" value={lead.source} />
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={Package} label="Business Unit" value={editing ? editData.businessUnit : lead.businessUnit} editing={editing} onChange={(v) => setEditData({ ...editData, businessUnit: v })} />
              <InfoRow icon={User} label="Assigned To" value={editing ? editData.assignedTo : lead.assignedTo} editing={editing} onChange={(v) => setEditData({ ...editData, assignedTo: v })} />
              <InfoRow icon={Calendar} label="Created" value={format(new Date(lead.createdAt), "MMM d, yyyy h:mm a")} />
              <InfoRow icon={Calendar} label="Updated" value={format(new Date(lead.updatedAt), "MMM d, yyyy h:mm a")} />
            </CardContent>
          </Card>
        </div>

        {/* Right column: Assignment, Follow-ups, Timeline */}
        <div className="space-y-5">
          <AssignLead
            leadName={lead.name}
            currentAssignee={lead.assignedTo}
          />

          <FollowUpForm
            leadId={lead.id}
            leadName={lead.name}
            currentAssignee={lead.assignedTo}
          />

          {/* Existing follow-ups for this lead */}
          {leadFollowUps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scheduled Follow-Ups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {leadFollowUps.map((f) => (
                    <div key={f.id} className="flex items-start gap-3 rounded-md border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{f.note}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(f.date), "MMM d, yyyy")} · {f.assignedTo}
                        </p>
                      </div>
                      {f.completed && (
                        <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                          Done
                        </span>
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l border-border ml-2">
                {timeline.map((event) => (
                  <li key={event.id} className="mb-6 ml-6">
                    <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                    <p className="text-sm font-medium">{event.action}</p>
                    <p className="text-xs text-muted-foreground">{event.detail}</p>
                    <time className="text-[10px] text-muted-foreground">
                      {format(new Date(event.date), "MMM d, yyyy h:mm a")}
                    </time>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ---- Helper ---- */
interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  editing?: boolean;
  onChange?: (v: string) => void;
}

const InfoRow = ({ icon: Icon, label, value, editing, onChange }: InfoRowProps) => (
  <div className="flex items-start gap-3">
    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {editing && onChange ? (
        <Input
          className="mt-0.5 h-8 text-sm"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <p className="text-sm font-medium truncate">{value}</p>
      )}
    </div>
  </div>
);

export default LeadDetails;
