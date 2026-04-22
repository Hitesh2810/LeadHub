import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { scheduleFollowUp } from "@/lib/api";

interface FollowUpFormProps {
  leadId: string;
  leadName: string;
  currentAssignee?: string;
  onCreated?: () => void;
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const FollowUpForm = ({ leadId, leadName, currentAssignee, onCreated }: FollowUpFormProps) => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>();
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState(
    isValidEmail(`${currentAssignee ?? ""}`.trim()) ? `${currentAssignee ?? ""}`.trim() : "",
  );
  const [assignedToError, setAssignedToError] = useState("");

  const scheduleFollowUpMutation = useMutation({
    mutationFn: async () => {
      if (!date) {
        throw new Error("Please fill in date and note.");
      }

      return scheduleFollowUp({
        leadId,
        followUpDate: date.toISOString(),
        followUpAssignedTo: assignedTo,
        followUpNote: note.trim(),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["followups"] }),
      ]);

      toast({
        title: "Follow-up Scheduled",
        description: `${leadName} - ${date ? format(date, "PPP") : ""}`,
      });
      setDate(undefined);
      setNote("");
      setAssignedTo(isValidEmail(`${currentAssignee ?? ""}`.trim()) ? `${currentAssignee ?? ""}`.trim() : "");
      setAssignedToError("");
      onCreated?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to schedule follow-up",
        description: error.message || "Something went wrong while saving the follow-up.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !note.trim()) {
      toast({ title: "Missing fields", description: "Please fill in date and note.", variant: "destructive" });
      return;
    }

    if (!isValidEmail(assignedTo.trim())) {
      setAssignedToError("Please enter a valid email address.");
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setAssignedToError("");
    scheduleFollowUpMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Schedule Follow-Up</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Assign To</label>
            <Input
              type="email"
              name="followUpAssignedTo"
              placeholder="Enter email address"
              value={assignedTo}
              required
              onChange={(e) => {
                setAssignedTo(e.target.value);
                if (assignedToError) {
                  setAssignedToError("");
                }
              }}
              className={cn(assignedToError && "border-destructive focus-visible:ring-destructive")}
            />
            {assignedToError ? (
              <p className="text-sm text-destructive">{assignedToError}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Note</label>
            <Textarea
              placeholder="What needs to be done?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px]"
              maxLength={500}
            />
          </div>

          <Button type="submit" className="w-full" disabled={scheduleFollowUpMutation.isPending}>Schedule Follow-Up</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FollowUpForm;
