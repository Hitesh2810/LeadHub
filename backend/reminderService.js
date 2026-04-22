import cron from "node-cron";
import nodemailer from "nodemailer";
import {
  getAllLeads,
  getEmailTemplates,
  markLeadReminderSent,
  markLeadReminderSentDates,
} from "./googleSheets.js";

console.log("Reminder service started");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const hasEmailConfig = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const isValidEmail = (value) => EMAIL_REGEX.test(`${value || ""}`.trim());

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const assertEmailConfig = () => {
  if (!hasEmailConfig()) {
    const error = new Error("EMAIL_USER or EMAIL_PASS is missing.");
    error.status = 400;
    throw error;
  }
};

const TWO_HOURS = 2 * 60 * 60 * 1000;

const getTodayStr = (date = new Date()) => date.toISOString().split("T")[0];

const getSentDates = (lead) =>
  `${lead.ReminderSentDates || lead.reminderSentDates || ""}`
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

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

const getFollowUpStatus = (lead = {}) =>
  `${lead["Follow Up Status"] || lead.followUpStatus || "Pending"}`.trim() || "Pending";

const getCompleteUrl = (lead = {}) => {
  const baseUrl = `${process.env.PUBLIC_BACKEND_URL || "http://localhost:3002"}`.replace(/\/$/, "");
  return `${baseUrl}/api/followup/complete?id=${encodeURIComponent(lead.id)}`;
};

const sendTestEmail = async (recipient = process.env.EMAIL_USER) => {
  assertEmailConfig();

  const normalizedRecipient = `${recipient || ""}`.trim();

  if (!isValidEmail(normalizedRecipient)) {
    const error = new Error("A valid recipient email is required.");
    error.status = 400;
    throw error;
  }

  const transporter = createTransporter();
  console.log("Sending email...");

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: normalizedRecipient,
    subject: "LeadHub Test Email",
    text: `LeadHub test email sent at ${new Date().toISOString()}.`,
  });

  console.log("Email sent");

  return {
    sent: true,
    to: normalizedRecipient,
  };
};

const getDueLeads = (leads = []) => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  return leads.filter((lead) => {
    console.log("Checking lead:", lead.Name || lead.name, lead["Follow Up Date"] || lead.followUpDate);

    const followUpRaw = lead["Follow Up Date"] || lead.followUpDate;
    const reminderSent = `${lead.ReminderSent || lead.reminderSent || ""}`.trim().toUpperCase();
    const sentDates = getSentDates(lead);
    const recipient = `${lead["Follow Up Assigned To"] || lead.followUpAssignedTo || ""}`.trim();
    const status = getFollowUpStatus(lead);

    if (status === "Completed") {
      return false;
    }

    if (!followUpRaw) {
      return false;
    }

    const followUp = new Date(followUpRaw);

    if (Number.isNaN(followUp.getTime())) {
      console.log("Invalid date:", followUpRaw);
      return false;
    }

    if (!recipient || !recipient.includes("@")) {
      console.log("Invalid email:", recipient);
      return false;
    }

    if (sentDates.includes(today)) {
      return false;
    }

    const triggerDates = [];

    const d1 = new Date(followUp);
    d1.setDate(d1.getDate() - 2);

    const d2 = new Date(followUp);
    d2.setDate(d2.getDate() - 1);

    const d3 = new Date(followUp);

    triggerDates.push(d1, d2, d3);

    triggerDates.forEach((d) => {
      d.setHours(9, 30, 0, 0);
    });

    const followUpDayStr = getTodayStr(followUp);

    if (today === followUpDayStr && reminderSent === "YES") {
      return false;
    }

    console.log("Now:", now);
    console.log("Triggers:", triggerDates);

    const isMatch = triggerDates.some((trigger) => {
      const diff = now - trigger;
      return diff >= 0 && diff <= TWO_HOURS;
    });

    if (isMatch) {
      console.log("MATCH -> sending reminder:", lead.Name || lead.name);
    }

    return isMatch;
  });
};

const sendFollowUpReminders = async () => {
  if (!hasEmailConfig()) {
    console.warn("Reminder service skipped: EMAIL_USER or EMAIL_PASS is missing.");
    return;
  }

  const leads = await getAllLeads();
  const dueLeads = getDueLeads(leads);

  if (dueLeads.length === 0) {
    return;
  }

  const transporter = createTransporter();
  const templates = await getEmailTemplates();

  for (const lead of dueLeads) {
    console.log("Sending reminder for:", lead.Name || lead.name);

    const recipient = `${lead["Follow Up Assigned To"] || lead.followUpAssignedTo || ""}`.trim();
    const followUpDate = lead["Follow Up Date"] || lead.followUpDate;
    const completeUrl = getCompleteUrl(lead);
    const reminderText =
      processTemplate(templates.reminderTemplate, lead) ||
      `Reminder: You have a follow-up on ${followUpDate}.`;

    if (!isValidEmail(recipient)) {
      console.warn(`Reminder skipped for lead ${lead.id}: invalid follow-up assignee email.`);
      continue;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipient,
      subject: "Upcoming Follow-Up Reminder",
      text: reminderText,
      html: `
        <p>${reminderText}</p>
        <p>Reminder: Follow-up scheduled on ${followUpDate}</p>
        <a href="${completeUrl}" style="padding:10px 15px; background:green; color:white; text-decoration:none;">
          Mark as Completed
        </a>
      `,
    });

    const now = new Date();
    const todayStr = getTodayStr(now);
    const sentDates = getSentDates(lead);
    const updatedDates = [...new Set([...sentDates, todayStr])].join(",");

    await markLeadReminderSentDates(lead.id, updatedDates);

    const followUp = new Date(followUpDate);

    if (!Number.isNaN(followUp.getTime()) && getTodayStr(followUp) === todayStr) {
      await markLeadReminderSent(lead.id);
    }
  }
};

cron.schedule("* * * * *", async () => {
  try {
    console.log("CRON RUNNING:", new Date());
    await sendFollowUpReminders();
  } catch (error) {
    console.error("Reminder service error:", error);
  }
});

export { sendFollowUpReminders };
export { hasEmailConfig, isValidEmail, sendTestEmail };
