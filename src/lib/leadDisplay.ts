import type { Lead } from "@/types/lead";

export const getDisplayLeadId = (
  lead: Lead,
  isAdmin: boolean,
  businessUnitLeads: Lead[] = [],
) => {
  void isAdmin;
  void businessUnitLeads;
  return lead.leadId;
};
