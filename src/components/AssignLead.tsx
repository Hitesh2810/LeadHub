import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { salesTeam } from "@/data/demoFollowUps";
import { UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AssignLeadProps {
  leadName: string;
  currentAssignee: string;
  onAssign?: (name: string) => void;
}

const AssignLead = ({ leadName, currentAssignee, onAssign }: AssignLeadProps) => {
  const [selected, setSelected] = useState(currentAssignee);

  const handleAssign = () => {
    if (selected === currentAssignee) return;
    // Will persist to Supabase in Phase 6
    toast({ title: "Lead Reassigned", description: `${leadName} assigned to ${selected}` });
    onAssign?.(selected);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Assign Lead</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Sales Representative</label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {salesTeam.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleAssign}
          disabled={selected === currentAssignee}
          className="w-full gap-1.5"
          variant="outline"
        >
          <UserPlus className="h-4 w-4" /> Reassign
        </Button>
      </CardContent>
    </Card>
  );
};

export default AssignLead;
