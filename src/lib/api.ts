import type { BusinessUnit, Lead } from "@/types/lead";
import { firebaseAuth } from "@/lib/firebase";
import type { FollowUp } from "@/types/followUp";

export interface DashboardData {
  totalLeads: number;
  convertedLeads: number;
  pendingLeads: number;
  conversionRate: number;
  categoryCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
}

export interface UserProfilePayload {
  businessUnit: BusinessUnit;
}

export interface CurrentUserAccess {
  email: string;
  businessUnit: BusinessUnit | string;
  isAdmin: boolean;
  role: "admin" | "user";
}

export interface EmailTemplates {
  instantTemplate: string;
  reminderTemplate: string;
}

export interface FollowUpPayload {
  leadId: string;
  followUpDate: string;
  followUpAssignedTo: string;
  followUpNote: string;
}

export interface CreateLeadPayload {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  category: string;
  assignedTo: string;
  businessUnit: BusinessUnit;
  notes?: string;
}

export interface UpdateLeadPayload extends Omit<CreateLeadPayload, "businessUnit"> {
  businessUnit: BusinessUnit | string;
}

interface ApiLead extends Omit<Lead, "businessUnit"> {
  productService: string;
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.details || payload?.error || "Request failed.");
  }

  return payload as T;
};

const getAuthHeaders = async (headers: HeadersInit = {}) => {
  const token = await firebaseAuth.currentUser?.getIdToken();

  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const fetchLeads = async (): Promise<Lead[]> => {
  const response = await fetch("/api/leads", {
    headers: await getAuthHeaders(),
  });
  const leads = await parseResponse<ApiLead[]>(response);

  return leads.map(({ productService, ...lead }) => ({
    ...lead,
    businessUnit: productService,
  }));
};

export const createLead = async (payload: CreateLeadPayload): Promise<Lead> => {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      ...payload,
      productService: payload.businessUnit,
    }),
  });

  const lead = await parseResponse<ApiLead>(response);

  return {
    ...lead,
    businessUnit: lead.productService,
  };
};

export const updateLead = async (leadId: string, payload: UpdateLeadPayload): Promise<Lead> => {
  const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
    method: "PUT",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      ...payload,
      productService: payload.businessUnit,
    }),
  });

  const lead = await parseResponse<ApiLead>(response);

  return {
    ...lead,
    businessUnit: lead.productService,
  };
};

export const scheduleFollowUp = async (payload: FollowUpPayload): Promise<Lead> => {
  const response = await fetch("/api/leads/followup", {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  const result = await parseResponse<{ success: boolean; lead: ApiLead }>(response);

  return {
    ...result.lead,
    businessUnit: result.lead.productService,
  };
};

export const deleteLead = async (leadId: string): Promise<void> => {
  const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });

  await parseResponse(response);
};

export const fetchDashboard = async (): Promise<DashboardData> => {
  const response = await fetch("/api/dashboard", {
    headers: await getAuthHeaders(),
  });
  return parseResponse<DashboardData>(response);
};

export const fetchFollowUps = async (): Promise<FollowUp[]> => {
  const response = await fetch("/api/followups", {
    headers: await getAuthHeaders(),
  });

  return parseResponse<FollowUp[]>(response);
};

export const createUserProfile = async (payload: UserProfilePayload): Promise<void> => {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  await parseResponse(response);
};

export const fetchCurrentUserAccess = async (): Promise<CurrentUserAccess> => {
  const response = await fetch("/api/users/me", {
    headers: await getAuthHeaders(),
  });

  return parseResponse<CurrentUserAccess>(response);
};

export const fetchEmailTemplates = async (): Promise<EmailTemplates> => {
  const response = await fetch("/api/settings/email-templates", {
    headers: await getAuthHeaders(),
  });

  return parseResponse<EmailTemplates>(response);
};

export const saveEmailTemplates = async (payload: EmailTemplates): Promise<EmailTemplates> => {
  const response = await fetch("/api/settings/email-templates", {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return parseResponse<EmailTemplates>(response);
};
