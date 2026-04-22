// Lead-related types used across the app

export type LeadStatus =
  | "New"
  | "Contacted"
  | "In Discussion"
  | "Proposal Sent"
  | "Negotiation"
  | "Converted"
  | "Lost"
  | "On Hold";

export type LeadCategory = "Hot" | "Warm" | "Cold";

export const BUSINESS_UNITS = [
  "Risk Management Products & Services",
  "SaaS & Custom Software Development",
  "E-Learning & Professional Training",
  "Dadisha Marketplace (E-Commerce)",
] as const;

export type BusinessUnit = (typeof BUSINESS_UNITS)[number];

export type LeadSource =
  | "Website"
  | "Social Media"
  | "Email"
  | "WhatsApp"
  | "Phone"
  | "Referral"
  | "Event";

export interface Lead {
  id: string;
  leadId: string; // e.g. LH-MK-202603-001
  businessUnitLeadId?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  category: LeadCategory;
  businessUnit: BusinessUnit | string;
  assignedTo: string;
  notes?: string;
  followUpDate?: string;
  followUpAssignedTo?: string;
  followUpNote?: string;
  followUpStatus?: "Pending" | "Completed" | string;
  createdAt: string;
  updatedAt: string;
}
