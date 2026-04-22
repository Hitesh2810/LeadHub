export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  company: string;
  note: string;
  date: string; // ISO date string
  status: "Pending" | "Completed" | string;
  completed: boolean;
  assignedTo: string;
  createdAt: string;
}
