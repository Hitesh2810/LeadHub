import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import nodemailer from "nodemailer";
import "./reminderService.js";
import { sendTestEmail } from "./reminderService.js";
import {
  attachBusinessUnitLeadIds,
  appendBusinessUnitLeadRow,
  appendLeadRow,
  deleteLeadRow,
  getEmailTemplates,
  getAllLeads,
  getUserByEmail,
  markFollowUpCompleted,
  scheduleLeadFollowUp,
  upsertEmailTemplates,
  upsertUserRow,
  updateLeadRow,
} from "./googleSheets.js";

dotenv.config();

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

const app = express();
const port = Number(process.env.PORT) || 3001;
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;
const DEFAULT_ADMIN_EMAILS = ["admin@dadisha.com", "hiteshkumar20058@gmail.com"];
const BUSINESS_UNIT_CODE_MAP = {
  "Risk Management Products & Services": "RM",
  "SaaS & Custom Software Development": "SA",
  "E-Learning & Professional Training": "EL",
  "Dadisha Marketplace (E-Commerce)": "MK",
};

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

app.post("/api/test", (req, res) => {
  res.status(200).json({ message: "OK" });
});

app.post("/api/test-email", async (req, res) => {
  try {
    const result = await sendTestEmail(req.body?.to);
    res.status(200).json({
      message: "Email sent successfully",
      ...result,
    });
  } catch (error) {
    console.error("Email error:", error);
    res.status(error?.status || 500).json({ error: error?.message || "Failed to send test email." });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }

  next(error);
});

const isPendingStatus = (status) => !["Converted", "Lost"].includes(status);

const getGoogleSheetsErrorMessage = (error, action) => {
  const status = error?.status || error?.code || error?.response?.status;

  if (status === 404) {
    return "Google Sheets could not find that spreadsheet. Recheck the spreadsheet ID and share the spreadsheet with the service account email.";
  }

  if (status === 403) {
    return "Google Sheets access denied. Share the sheet with the service account email and confirm the API is enabled.";
  }

  if (status === 401) {
    return "Google Sheets authentication failed. Recheck the service account credentials in .env.";
  }

  return `Failed to ${action} Google Sheets data.`;
};

const generateLeadId = async (businessUnit = "") => {
  const leads = await getAllLeads();
  const date = new Date();
  const yearMonth = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const normalizedBusinessUnit = `${businessUnit || ""}`.trim();
  const code = BUSINESS_UNIT_CODE_MAP[normalizedBusinessUnit];

  if (!code) {
    console.warn("Unknown BU, fallback to existing logic");
    const sequence = String(leads.length + 1).padStart(3, "0");

    return `LH-${yearMonth}-${sequence}`;
  }

  const sameBusinessUnitLeads = leads.filter((lead) => {
    const leadBusinessUnit = `${lead.productService || lead.businessUnit || ""}`.trim();
    return leadBusinessUnit === normalizedBusinessUnit && `${lead.leadId || ""}`.includes(`DAD-${code}-${yearMonth}`);
  });
  const sequence = String(sameBusinessUnitLeads.length + 1).padStart(3, "0");

  return `DAD-${code}-${yearMonth}-${sequence}`;
};

const validateLeadPayload = (body) => {
  const requiredFields = [
    "name",
    "company",
    "email",
    "phone",
    "source",
    "status",
    "category",
    "assignedTo",
    "productService",
  ];

  const missingField = requiredFields.find((field) => !`${body[field] || ""}`.trim());

  if (missingField) {
    return `Missing required field: ${missingField}`;
  }

  return null;
};

const validateFollowUpPayload = (body) => {
  const requiredFields = ["leadId", "followUpDate", "followUpAssignedTo", "followUpNote"];
  const missingField = requiredFields.find((field) => !`${body[field] || ""}`.trim());

  if (missingField) {
    return `Missing required field: ${missingField}`;
  }

  return null;
};

const buildDashboard = (leads) => {
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((lead) => lead.status === "Converted").length;
  const pendingLeads = leads.filter((lead) => isPendingStatus(lead.status)).length;
  const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

  const categoryCounts = leads.reduce((acc, lead) => {
    acc[lead.category] = (acc[lead.category] || 0) + 1;
    return acc;
  }, {});

  const sourceCounts = leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {});

  return {
    totalLeads,
    convertedLeads,
    pendingLeads,
    conversionRate,
    categoryCounts,
    sourceCounts,
  };
};

const buildFollowUps = (leads) =>
  leads
    .filter((lead) => `${lead.followUpDate || ""}`.trim() && `${lead.followUpNote || ""}`.trim())
    .map((lead) => ({
      status: lead.followUpStatus || lead["Follow Up Status"] || "Pending",
      id: `${lead.id}-follow-up`,
      leadId: lead.id,
      leadName: lead.name,
      company: lead.company,
      note: lead.followUpNote || "",
      date: lead.followUpDate || "",
      completed: (lead.followUpStatus || lead["Follow Up Status"] || "Pending") === "Completed",
      assignedTo: lead.followUpAssignedTo || lead.assignedTo,
      createdAt: lead.updatedAt,
    }));

const getAuthorizationToken = (req) => {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
};

const getAdminEmails = () =>
  [...DEFAULT_ADMIN_EMAILS, process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const normalizeBusinessUnit = (value) => `${value ?? ""}`.trim();
const hasInstantEmailConfig = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const createInstantEmailTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const processTemplate = (template = "", lead = {}) => {
  if (!template) return template;

  const assignedTo = `${
    lead.AssignedTo ||
    lead["AssignedTo"] ||
    lead.assignedTo ||
    ""
  }`;
  const name = `${lead.Name || lead.name || ""}`;
  const company = `${lead.Company || lead.company || ""}`;
  const date = `${lead["Follow Up Date"] || lead.followUpDate || ""}`;

  return `${template}`
    .replace(/{{assignedto}}/gi, assignedTo)
    .replace(/{{name}}/gi, name)
    .replace(/{{company}}/gi, company)
    .replace(/{{date}}/gi, date);
};

const sendInstantFollowUpEmail = async (lead) => {
  const recipient = `${lead["Follow Up Assigned To"] || lead.followUpAssignedTo || ""}`.trim();
  const followUpDate = `${lead["Follow Up Date"] || lead.followUpDate || ""}`.trim();

  if (!hasInstantEmailConfig() || !recipient || !recipient.includes("@")) {
    return;
  }

  const transporter = createInstantEmailTransporter();
  const templates = await getEmailTemplates();
  const content =
    processTemplate(templates.instantTemplate, lead) ||
    `You have been assigned a follow-up scheduled on ${followUpDate}. Please take necessary action.`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recipient,
    subject: "New Follow-Up Assigned",
    text: content,
  });

  console.log("Instant follow-up email sent to:", recipient);
};

const verifyFirebaseToken = async (idToken) => {
  if (!FIREBASE_API_KEY) {
    throw new Error("Missing VITE_FIREBASE_API_KEY");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error?.message || "Invalid Firebase token.");
    error.status = 401;
    throw error;
  }

  const email = `${payload?.users?.[0]?.email || ""}`.trim().toLowerCase();

  if (!email) {
    const error = new Error("Authenticated user email not found.");
    error.status = 401;
    throw error;
  }

  return { email };
};

const getRequestUserContext = async (req) => {
  const idToken = getAuthorizationToken(req);

  if (!idToken) {
    const error = new Error("Missing authorization token.");
    error.status = 401;
    throw error;
  }

  const { email } = await verifyFirebaseToken(idToken);
  const user = await getUserByEmail(email);
  const isAdmin = getAdminEmails().includes(email);

  if (isAdmin) {
    return {
      email,
      businessUnit: user?.businessUnit || "",
      isAdmin: true,
    };
  }

  if (!user?.businessUnit) {
    const error = new Error("Business unit not found for this user.");
    error.status = 403;
    throw error;
  }

  return {
    email,
    businessUnit: user.businessUnit,
    isAdmin: false,
  };
};

const filterLeadsForUser = (leads, userContext) => {
  if (userContext.isAdmin) {
    return leads;
  }

  const userBusinessUnit = normalizeBusinessUnit(userContext.businessUnit);
  console.log("User BU:", userBusinessUnit);

  return leads.filter((lead) => {
    const leadBusinessUnit = normalizeBusinessUnit(lead.productService);
    console.log("Lead BU:", leadBusinessUnit);
    return leadBusinessUnit === userBusinessUnit;
  });
};

app.post("/api/users", async (req, res) => {
  try {
    const businessUnit = `${req.body?.businessUnit || ""}`.trim();

    if (!businessUnit) {
      res.status(400).json({ error: "Missing required field: businessUnit" });
      return;
    }

    const { email } = await verifyFirebaseToken(getAuthorizationToken(req));
    const user = await upsertUserRow({ email, businessUnit });

    res.status(201).json(user);
  } catch (error) {
    if (error?.status === 401) {
      res.status(401).json({ error: error.message });
      return;
    }

    console.error("Google Sheets error while saving user:", error);
    res.status(500).json({
      error: getGoogleSheetsErrorMessage(error, "save"),
    });
  }
});

app.get("/api/users/me", async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);
    res.json({
      email: userContext.email,
      businessUnit: userContext.businessUnit,
      isAdmin: userContext.isAdmin,
      role: userContext.isAdmin ? "admin" : "user",
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Error while fetching user context:", error);
    res.status(500).json({
      error: "Failed to fetch user context.",
    });
  }
});

app.get("/api/settings/email-templates", async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);

    if (!userContext.isAdmin) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    res.json(await getEmailTemplates());
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Google Sheets error while fetching email templates:", error);
    res.status(500).json({
      error: getGoogleSheetsErrorMessage(error, "fetch"),
    });
  }
});

app.post("/api/settings/email-templates", async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);

    if (!userContext.isAdmin) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    const templates = await upsertEmailTemplates({
      instantTemplate: `${req.body?.instantTemplate ?? ""}`,
      reminderTemplate: `${req.body?.reminderTemplate ?? ""}`,
    });

    res.json(templates);
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Google Sheets error while saving email templates:", error);
    res.status(500).json({
      error: getGoogleSheetsErrorMessage(error, "save"),
    });
  }
});

app.get("/api/leads", async (req, res) => {
  try {
    const leads = await getAllLeads();
    const userContext = await getRequestUserContext(req);
    const filteredLeads = filterLeadsForUser(leads, userContext);
    res.json(await attachBusinessUnitLeadIds(filteredLeads));
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Google Sheets error while fetching leads:", error);
    res.status(500).json({
      error: getGoogleSheetsErrorMessage(error, "fetch"),
    });
  }
});

app.post("/api/leads", async (req, res) => {
  try {
    const validationError = validateLeadPayload(req.body);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const createdAt = new Date().toISOString();
    const lead = await appendLeadRow({
      leadId: await generateLeadId(req.body.productService || req.body.businessUnit),
      name: req.body.name.trim(),
      company: req.body.company.trim(),
      email: req.body.email.trim(),
      phone: req.body.phone.trim(),
      source: req.body.source.trim(),
      status: req.body.status.trim(),
      category: req.body.category.trim(),
      assignedTo: req.body.assignedTo.trim(),
      productService: req.body.productService.trim(),
      notes: `${req.body.notes || ""}`.trim(),
      createdAt,
    });

    try {
      await appendBusinessUnitLeadRow(lead);
    } catch (businessUnitError) {
      console.error("Google Sheets error while saving business unit copy:", businessUnitError);
    }

    res.status(201).json(lead);
  } catch (error) {
    console.error("Google Sheets error while saving lead:", error);
    res.status(500).json({
      error: getGoogleSheetsErrorMessage(error, "save"),
    });
  }
});

app.put("/api/leads/:leadId", async (req, res) => {
  try {
    const validationError = validateLeadPayload(req.body);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const updatedLead = await updateLeadRow(req.params.leadId, {
      name: req.body.name.trim(),
      company: req.body.company.trim(),
      email: req.body.email.trim(),
      phone: req.body.phone.trim(),
      source: req.body.source.trim(),
      status: req.body.status.trim(),
      category: req.body.category.trim(),
      assignedTo: req.body.assignedTo.trim(),
      productService: req.body.productService.trim(),
      notes: `${req.body.notes || ""}`.trim(),
    });

    res.json(updatedLead);
  } catch (error) {
    if (error?.status === 404) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    console.error("Google Sheets error while updating lead:", error);
    res.status(500).json({
      error: getGoogleSheetsErrorMessage(error, "update"),
    });
  }
});

app.post("/api/leads/followup", async (req, res) => {
  try {
    const validationError = validateFollowUpPayload(req.body);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const lead = await scheduleLeadFollowUp(req.body.leadId.trim(), {
      followUpDate: req.body.followUpDate.trim(),
      followUpAssignedTo: req.body.followUpAssignedTo.trim(),
      followUpNote: req.body.followUpNote.trim(),
    });

    try {
      await sendInstantFollowUpEmail(lead);
    } catch (instantEmailError) {
      console.error("Instant follow-up email failed:", instantEmailError.message);
    }

    res.status(201).json({
      success: true,
      lead,
    });
  } catch (error) {
    if (error?.status === 404) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    console.error("Google Sheets error while saving follow-up:", error);
    res.status(500).json({
      error: getGoogleSheetsErrorMessage(error, "save"),
    });
  }
});

app.get("/api/followup/complete", async (req, res) => {
  try {
    const { id } = req.query;
    const leadId = `${id || ""}`.trim();

    if (!leadId) {
      return res.status(400).send("Invalid request");
    }

    await markFollowUpCompleted(leadId);

    return res.send("Follow-up marked as completed successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating follow-up");
  }
});

app.delete("/api/leads/:leadId", async (req, res) => {
  try {
    const result = await deleteLeadRow(req.params.leadId);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error?.status === 404) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    console.error("Google Sheets error while deleting lead:", error);
    res.status(500).json({
      error: getGoogleSheetsErrorMessage(error, "delete"),
    });
  }
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const leads = await getAllLeads();
    const userContext = await getRequestUserContext(req);
    res.json(buildDashboard(filterLeadsForUser(leads, userContext)));
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Google Sheets error while building dashboard:", error);
    res.status(500).json({
      error: getGoogleSheetsErrorMessage(error, "build"),
    });
  }
});

app.get("/api/followups", async (req, res) => {
  try {
    const leads = await getAllLeads();
    const userContext = await getRequestUserContext(req);
    const filteredLeads = filterLeadsForUser(leads, userContext);
    res.json(buildFollowUps(filteredLeads));
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Google Sheets error while fetching follow-ups:", error);
    res.status(500).json({
      error: getGoogleSheetsErrorMessage(error, "fetch"),
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`LeadHub backend listening on http://localhost:${port}`);
});
