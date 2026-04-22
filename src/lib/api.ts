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

const fetchWithRetry = async <T>(url: string, init?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(url, init);

    return parseResponse<T>(response);
  } catch (error) {
    console.log("Retrying...");
    throw error;
  }
};

const getAuthHeaders = async (headers: HeadersInit = {}) => {
  const token = await firebaseAuth.currentUser?.getIdToken();

  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const fetchLeads = async (): Promise<Lead[]> => {
  const leads = await fetchWithRetry<ApiLead[]>("/api/leads", {
    headers: await getAuthHeaders(),
  });

  return leads.map(({ productService, ...lead }) => ({
    ...lead,
    businessUnit: productService,
  }));
};

export const createLead = async (payload: CreateLeadPayload): Promise<Lead> => {
  const lead = await fetchWithRetry<ApiLead>("/api/leads", {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      ...payload,
      productService: payload.businessUnit,
    }),
  });

  return {
    ...lead,
    businessUnit: lead.productService,
  };
};

export const updateLead = async (leadId: string, payload: UpdateLeadPayload): Promise<Lead> => {
  const lead = await fetchWithRetry<ApiLead>(`/api/leads/${encodeURIComponent(leadId)}`, {
    method: "PUT",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      ...payload,
      productService: payload.businessUnit,
    }),
  });

  return {
    ...lead,
    businessUnit: lead.productService,
  };
};

export const scheduleFollowUp = async (payload: FollowUpPayload): Promise<Lead> => {
  const result = await fetchWithRetry<{ success: boolean; lead: ApiLead }>("/api/leads/followup", {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return {
    ...result.lead,
    businessUnit: result.lead.productService,
  };
};

export const deleteLead = async (leadId: string): Promise<void> => {
  await fetchWithRetry(`/api/leads/${encodeURIComponent(leadId)}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
};

export const fetchDashboard = async (): Promise<DashboardData> => {
  return fetchWithRetry<DashboardData>("/api/dashboard", {
    headers: await getAuthHeaders(),
  });
};

export const fetchFollowUps = async (): Promise<FollowUp[]> => {
  return fetchWithRetry<FollowUp[]>("/api/followups", {
    headers: await getAuthHeaders(),
  });
};

export const createUserProfile = async (payload: UserProfilePayload): Promise<void> => {
  await fetchWithRetry("/api/users", {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
};

export const fetchCurrentUserAccess = async (): Promise<CurrentUserAccess> => {
  return fetchWithRetry<CurrentUserAccess>("/api/users/me", {
    headers: await getAuthHeaders(),
  });
};

export const fetchEmailTemplates = async (): Promise<EmailTemplates> => {
  return fetchWithRetry<EmailTemplates>("/api/settings/email-templates", {
    headers: await getAuthHeaders(),
  });
};

export const saveEmailTemplates = async (payload: EmailTemplates): Promise<EmailTemplates> => {
  return fetchWithRetry<EmailTemplates>("/api/settings/email-templates", {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
};
