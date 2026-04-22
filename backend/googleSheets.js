import { getSheetsClient, getSheetName, getSpreadsheetId } from "./config/googleSheets.js";

export const SHEET_HEADERS = [
  "LeadID",
  "Name",
  "Company",
  "Email",
  "Phone",
  "Source",
  "Status",
  "Category",
  "AssignedTo",
  "ProductService",
  "Notes",
  "Date",
  "Follow Up Date",
  "Follow Up Assigned To",
  "Follow Up Note",
  "ReminderSent",
  "ReminderSentDates",
  "Follow Up Status",
];

const USERS_SHEET_NAME = "Users";
const USERS_SHEET_HEADERS = ["Email", "BusinessUnit"];
const SETTINGS_SHEET_NAME = "Settings";
const SETTINGS_SHEET_HEADERS = ["Key", "Value"];

const BUSINESS_UNIT_SHEET_MAP = {
  "Risk Management Products & Services": "Risk",
  "SaaS & Custom Software Development": "SaaS",
  "E-Learning & Professional Training": "Elearning",
  "Dadisha Marketplace (E-Commerce)": "Marketplace",
};

const BUSINESS_UNIT_CODE_MAP = {
  "Risk Management Products & Services": "RM",
  "SaaS & Custom Software Development": "SA",
  "E-Learning & Professional Training": "EL",
  "Dadisha Marketplace (E-Commerce)": "MK",
};

const MAIN_SHEET_COLUMN_COUNT = SHEET_HEADERS.length;
const MAIN_SHEET_RANGE = "A:R";

const getSheetRange = (sheetName, suffix = MAIN_SHEET_RANGE) => `${sheetName}!${suffix}`;
const getUsersSheetRange = (suffix = "A:B") => `${USERS_SHEET_NAME}!${suffix}`;
const getSettingsSheetRange = (suffix = "A:B") => `${SETTINGS_SHEET_NAME}!${suffix}`;

const normalizeCell = (value) => `${value ?? ""}`.trim();

const toLead = (row = []) => {
  const [
    leadId = "",
    name = "",
    company = "",
    email = "",
    phone = "",
    source = "",
    status = "",
    category = "",
    assignedTo = "",
    productService = "",
    notes = "",
    date = "",
    followUpDate = "",
    followUpAssignedTo = "",
    followUpNote = "",
    reminderSent = "",
    reminderSentDates = "",
    followUpStatus = "Pending",
  ] = row;

  const createdAt = date || new Date().toISOString();

  return {
    id: leadId,
    leadId,
    name,
    company,
    email,
    phone,
    source,
    status,
    category,
    assignedTo,
    productService,
    notes,
    followUpDate,
    followUpAssignedTo,
    followUpNote,
    reminderSent,
    reminderSentDates,
    followUpStatus: followUpStatus || "Pending",
    "Follow Up Status": followUpStatus || "Pending",
    createdAt,
    updatedAt: createdAt,
  };
};

const getSpreadsheetMetadata = async (sheets, spreadsheetId) => {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
  });

  return response.data;
};

const resolveSheetName = (metadata) => {
  const configuredSheetName = getSheetName();
  const availableSheets =
    metadata.sheets
      ?.map((sheet) => sheet.properties?.title)
      .filter(Boolean) || [];

  if (availableSheets.includes(configuredSheetName)) {
    return configuredSheetName;
  }

  const fallbackSheetName = availableSheets[0];

  if (!fallbackSheetName) {
    throw new Error("The spreadsheet does not contain any sheets.");
  }

  return fallbackSheetName;
};

const getSheetIdByTitle = (metadata, title) => {
  const matchingSheet = metadata.sheets?.find((sheet) => sheet.properties?.title === title);
  return matchingSheet?.properties?.sheetId;
};

const getSheetConfig = async () => {
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const sheets = await getSheetsClient();
  const metadata = await getSpreadsheetMetadata(sheets, spreadsheetId);
  const sheetName = resolveSheetName(metadata);

  return {
    sheets,
    spreadsheetId,
    sheetName,
  };
};

export const ensureSheetHeaders = async () => {
  const { sheets, spreadsheetId, sheetName } = await getSheetConfig();
  const range = getSheetRange(sheetName, "1:1");
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const currentHeaders = response.data.values?.[0] || [];

  if (SHEET_HEADERS.every((header, index) => currentHeaders[index] === header)) {
    return { sheets, spreadsheetId, sheetName };
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [SHEET_HEADERS],
    },
  });

  return { sheets, spreadsheetId, sheetName };
};

export const getAllLeads = async () => {
  const { sheets, spreadsheetId, sheetName } = await ensureSheetHeaders();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getSheetRange(sheetName),
  });

  const rows = response.data.values || [];
  const dataRows = rows.slice(1).filter((row) => row.some((value) => `${value}`.trim().length > 0));

  return dataRows.map(toLead).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

const ensureUsersSheetExists = async (sheets, spreadsheetId) => {
  const metadata = await getSpreadsheetMetadata(sheets, spreadsheetId);

  if (getSheetIdByTitle(metadata, USERS_SHEET_NAME) !== undefined) {
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: USERS_SHEET_NAME,
            },
          },
        },
      ],
    },
  });
};

const ensureSettingsSheetExists = async (sheets, spreadsheetId) => {
  const metadata = await getSpreadsheetMetadata(sheets, spreadsheetId);

  if (getSheetIdByTitle(metadata, SETTINGS_SHEET_NAME) !== undefined) {
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: SETTINGS_SHEET_NAME,
            },
          },
        },
      ],
    },
  });
};

export const ensureUsersSheetHeaders = async () => {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  await ensureUsersSheetExists(sheets, spreadsheetId);

  const range = getUsersSheetRange("1:1");
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const currentHeaders = response.data.values?.[0] || [];

  if (USERS_SHEET_HEADERS.every((header, index) => currentHeaders[index] === header)) {
    return { sheets, spreadsheetId };
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [USERS_SHEET_HEADERS],
    },
  });

  return { sheets, spreadsheetId };
};

export const ensureSettingsSheetHeaders = async () => {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  await ensureSettingsSheetExists(sheets, spreadsheetId);

  const range = getSettingsSheetRange("1:1");
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const currentHeaders = response.data.values?.[0] || [];

  if (SETTINGS_SHEET_HEADERS.every((header, index) => currentHeaders[index] === header)) {
    return { sheets, spreadsheetId };
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [SETTINGS_SHEET_HEADERS],
    },
  });

  return { sheets, spreadsheetId };
};

export const getEmailTemplates = async () => {
  const { sheets, spreadsheetId } = await ensureSettingsSheetHeaders();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getSettingsSheetRange(),
  });

  const rows = response.data.values || [];
  const settings = rows.slice(1).reduce((acc, row) => {
    const key = normalizeCell(row[0]);

    if (!key) {
      return acc;
    }

    acc[key] = `${row[1] ?? ""}`;
    return acc;
  }, {});

  return {
    instantTemplate: `${settings.instantTemplate ?? ""}`,
    reminderTemplate: `${settings.reminderTemplate ?? ""}`,
  };
};

export const upsertEmailTemplates = async ({ instantTemplate = "", reminderTemplate = "" }) => {
  const { sheets, spreadsheetId } = await ensureSettingsSheetHeaders();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getSettingsSheetRange(),
  });

  const rows = response.data.values || [];
  const settings = rows.slice(1).reduce((acc, row) => {
    const key = normalizeCell(row[0]);

    if (!key) {
      return acc;
    }

    acc[key] = `${row[1] ?? ""}`;
    return acc;
  }, {});

  settings.instantTemplate = `${instantTemplate ?? ""}`;
  settings.reminderTemplate = `${reminderTemplate ?? ""}`;

  const values = [
    SETTINGS_SHEET_HEADERS,
    ...Object.entries(settings).map(([key, value]) => [key, `${value ?? ""}`]),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: getSettingsSheetRange(),
    valueInputOption: "RAW",
    requestBody: {
      values,
    },
  });

  return {
    instantTemplate: settings.instantTemplate,
    reminderTemplate: settings.reminderTemplate,
  };
};

export const upsertUserRow = async ({ email, businessUnit }) => {
  const normalizedEmail = normalizeCell(email).toLowerCase();
  const normalizedBusinessUnit = normalizeCell(businessUnit);

  if (!normalizedEmail || !normalizedBusinessUnit) {
    throw new Error("Email and business unit are required.");
  }

  const { sheets, spreadsheetId } = await ensureUsersSheetHeaders();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getUsersSheetRange(),
  });

  const rows = response.data.values || [];
  const existingRowIndex = rows.slice(1).findIndex((row) => normalizeCell(row[0]).toLowerCase() === normalizedEmail);
  const row = [normalizedEmail, normalizedBusinessUnit];

  if (existingRowIndex >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${USERS_SHEET_NAME}!A${existingRowIndex + 2}:B${existingRowIndex + 2}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    });

    return {
      email: normalizedEmail,
      businessUnit: normalizedBusinessUnit,
    };
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: getUsersSheetRange(),
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });

  return {
    email: normalizedEmail,
    businessUnit: normalizedBusinessUnit,
  };
};

export const getUserByEmail = async (email) => {
  const normalizedEmail = normalizeCell(email).toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const { sheets, spreadsheetId } = await ensureUsersSheetHeaders();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getUsersSheetRange(),
  });

  const rows = response.data.values || [];
  const match = rows
    .slice(1)
    .find((row) => normalizeCell(row[0]).toLowerCase() === normalizedEmail);

  if (!match) {
    return null;
  }

  return {
    email: normalizedEmail,
    businessUnit: normalizeCell(match[1]),
  };
};

const getLeadLookupKeys = (lead) => ({
  email: normalizeCell(lead.email).toLowerCase(),
  phone: normalizeCell(lead.phone),
});

export const attachBusinessUnitLeadIds = async (leads = []) => {
  if (leads.length === 0) {
    return leads;
  }

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const sheetNames = [...new Set(
    leads
      .map((lead) => BUSINESS_UNIT_SHEET_MAP[normalizeCell(lead.productService)])
      .filter(Boolean),
  )];

  const sheetResponses = await Promise.all(
    sheetNames.map(async (sheetName) => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:O`,
      });

      return [sheetName, response.data.values || []];
    }),
  );

  const rowsBySheet = Object.fromEntries(sheetResponses);

  return leads.map((lead) => {
    const sheetName = BUSINESS_UNIT_SHEET_MAP[normalizeCell(lead.productService)];
    const rows = rowsBySheet[sheetName] || [];
    const { email, phone } = getLeadLookupKeys(lead);
    const match = rows.find((row) => {
      const rowEmail = normalizeCell(row[3]).toLowerCase();
      const rowPhone = normalizeCell(row[4]);

      return (email && rowEmail === email) || (phone && rowPhone === phone);
    });

    return {
      ...lead,
      businessUnitLeadId: normalizeCell(match?.[0]) || lead.leadId,
    };
  });
};

export const appendLeadRow = async (lead) => {
  const { sheets, spreadsheetId, sheetName } = await ensureSheetHeaders();

  const row = [
    lead.leadId,
    lead.name,
    lead.company,
    lead.email,
    lead.phone,
    lead.source,
    lead.status,
    lead.category,
    lead.assignedTo,
    lead.productService,
    lead.notes,
    lead.createdAt,
    lead.followUpDate || "",
    lead.followUpAssignedTo || "",
    lead.followUpNote || "",
    lead.reminderSent || "",
    lead.reminderSentDates || "",
    lead.followUpStatus || "Pending",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: getSheetRange(sheetName),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });

  return toLead(row);
};

export const appendBusinessUnitLeadRow = async (lead) => {
  const businessUnit = `${lead.productService || ""}`.trim();
  const targetSheet = BUSINESS_UNIT_SHEET_MAP[businessUnit];
  const code = BUSINESS_UNIT_CODE_MAP[businessUnit];

  if (!targetSheet || !code) {
    return null;
  }

  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${targetSheet}!A:A`,
  });
  const count = existing.data.values ? existing.data.values.length : 1;
  const sequence = String(count).padStart(3, "0");
  const buLeadId = `DAD-${code}-${yearMonth}-${sequence}`;

  const row = [
    buLeadId,
    lead.name,
    lead.company,
    lead.email,
    lead.phone,
    lead.source,
    lead.status,
    lead.category,
    lead.assignedTo,
    lead.productService,
    lead.notes,
    lead.createdAt,
    lead.followUpDate || "",
    lead.followUpAssignedTo || "",
    lead.followUpNote || "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${targetSheet}!A:O`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });

  return row;
};

const buildLeadRow = (leadId, lead = {}, fallbackRow = []) => [
  leadId,
  `${lead.name ?? fallbackRow[1] ?? ""}`.trim(),
  `${lead.company ?? fallbackRow[2] ?? ""}`.trim(),
  `${lead.email ?? fallbackRow[3] ?? ""}`.trim(),
  `${lead.phone ?? fallbackRow[4] ?? ""}`.trim(),
  `${lead.source ?? fallbackRow[5] ?? ""}`.trim(),
  `${lead.status ?? fallbackRow[6] ?? ""}`.trim(),
  `${lead.category ?? fallbackRow[7] ?? ""}`.trim(),
  `${lead.assignedTo ?? fallbackRow[8] ?? ""}`.trim(),
  `${lead.productService ?? fallbackRow[9] ?? ""}`.trim(),
  `${lead.notes ?? fallbackRow[10] ?? ""}`.trim(),
  `${fallbackRow[11] ?? lead.createdAt ?? ""}`.trim(),
  `${lead.followUpDate ?? fallbackRow[12] ?? ""}`.trim(),
  `${lead.followUpAssignedTo ?? fallbackRow[13] ?? ""}`.trim(),
  `${lead.followUpNote ?? fallbackRow[14] ?? ""}`.trim(),
  `${lead.reminderSent ?? fallbackRow[15] ?? ""}`.trim(),
  `${lead.reminderSentDates ?? fallbackRow[16] ?? ""}`.trim(),
  `${lead.followUpStatus ?? fallbackRow[17] ?? "Pending"}`.trim() || "Pending",
];

const toMainSheetRow = (row = []) => {
  const normalizedRow = [...row];

  while (normalizedRow.length < MAIN_SHEET_COLUMN_COUNT) {
    normalizedRow.push("");
  }

  return normalizedRow;
};

const syncBusinessUnitLeadRow = async (sheets, spreadsheetId, updatedRow) => {
  const businessUnit = normalizeCell(updatedRow[9]);
  const targetSheet = BUSINESS_UNIT_SHEET_MAP[businessUnit];

  if (!targetSheet) {
    return false;
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${targetSheet}!A:O`,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => {
    const rowEmail = normalizeCell(row[3]);
    const rowPhone = normalizeCell(row[4]);
    const updatedEmail = normalizeCell(updatedRow[3]);
    const updatedPhone = normalizeCell(updatedRow[4]);

    return (updatedEmail && rowEmail === updatedEmail) || (updatedPhone && rowPhone === updatedPhone);
  });

  if (rowIndex === -1) {
    return false;
  }

  const now = new Date().toLocaleString();
  const updatedBUData = [...updatedRow].slice(0, 15);
  updatedBUData[11] = now;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${targetSheet}!A${rowIndex + 1}:O${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [updatedBUData],
    },
  });

  return true;
};

const deleteSheetRow = async (sheets, spreadsheetId, sheetId, rowIndex) => {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
};

export const updateLeadRow = async (leadId, lead) => {
  const { sheets, spreadsheetId, sheetName } = await ensureSheetHeaders();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getSheetRange(sheetName),
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => normalizeCell(row[0]) === normalizeCell(leadId));

  if (rowIndex === -1) {
    const error = new Error("Lead not found");
    error.status = 404;
    throw error;
  }

  const existingRow = rows[rowIndex] || [];
  const updatedRow = buildLeadRow(normalizeCell(existingRow[0]) || normalizeCell(leadId), lead, existingRow);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex + 1}:R${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [updatedRow],
    },
  });

  try {
    await syncBusinessUnitLeadRow(sheets, spreadsheetId, updatedRow);
  } catch (error) {
    console.error("Google Sheets error while updating business unit copy:", error);
  }

  return toLead(updatedRow);
};

export const scheduleLeadFollowUp = async (
  leadId,
  { followUpDate, followUpAssignedTo, followUpNote },
) => {
  const { sheets, spreadsheetId, sheetName } = await ensureSheetHeaders();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getSheetRange(sheetName),
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => normalizeCell(row[0]) === normalizeCell(leadId));

  if (rowIndex === -1) {
    const error = new Error("Lead not found");
    error.status = 404;
    throw error;
  }

  const row = toMainSheetRow(rows[rowIndex] || []);
  row[12] = `${followUpDate ?? ""}`.trim();
  row[13] = `${followUpAssignedTo ?? ""}`.trim();
  row[14] = `${followUpNote ?? ""}`.trim();
  row[15] = "";
  row[16] = "";
  row[17] = "Pending";

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex + 1}:R${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });

  const businessUnit = normalizeCell(row[9]);
  const targetSheet = BUSINESS_UNIT_SHEET_MAP[businessUnit];

  if (targetSheet) {
    try {
      const buResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${targetSheet}!A:O`,
      });

      const buRows = buResponse.data.values || [];
      const email = normalizeCell(row[3]);
      const phone = normalizeCell(row[4]);
      const buIndex = buRows.findIndex((buRow) => {
        const rowEmail = normalizeCell(buRow[3]);
        const rowPhone = normalizeCell(buRow[4]);

        return (email && rowEmail === email) || (phone && rowPhone === phone);
      });

      if (buIndex !== -1) {
        const updatedBURow = [...(buRows[buIndex] || [])];
        while (updatedBURow.length < 15) {
          updatedBURow.push("");
        }
        updatedBURow[12] = row[12];
        updatedBURow[13] = row[13];
        updatedBURow[14] = row[14];
        updatedBURow[11] = new Date().toLocaleString();

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${targetSheet}!A${buIndex + 1}:O${buIndex + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [updatedBURow],
          },
        });
      }
    } catch (error) {
      console.error("Google Sheets error while updating business unit follow-up:", error);
    }
  }

  return toLead(row);
};

export const deleteLeadRow = async (leadId) => {
  const { sheets, spreadsheetId, sheetName } = await ensureSheetHeaders();
  const metadata = await getSpreadsheetMetadata(sheets, spreadsheetId);
  const mainSheetId = getSheetIdByTitle(metadata, sheetName);

  if (typeof mainSheetId !== "number") {
    throw new Error(`Unable to resolve sheet id for ${sheetName}.`);
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getSheetRange(sheetName),
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => normalizeCell(row[0]) === normalizeCell(leadId));

  if (rowIndex === -1) {
    const error = new Error("Lead not found");
    error.status = 404;
    throw error;
  }

  const mainRow = rows[rowIndex] || [];
  const businessUnit = normalizeCell(mainRow[9]);
  const email = normalizeCell(mainRow[3]);
  const phone = normalizeCell(mainRow[4]);
  const targetSheet = BUSINESS_UNIT_SHEET_MAP[businessUnit];

  await deleteSheetRow(sheets, spreadsheetId, mainSheetId, rowIndex);

  let businessUnitDeleted = false;

  if (targetSheet) {
    try {
      const targetSheetId = getSheetIdByTitle(metadata, targetSheet);

      if (typeof targetSheetId === "number") {
        const buResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${targetSheet}!A:O`,
        });

        const buRows = buResponse.data.values || [];
        const buIndex = buRows.findIndex((row) => {
          const rowEmail = normalizeCell(row[3]);
          const rowPhone = normalizeCell(row[4]);

          return (email && rowEmail === email) || (phone && rowPhone === phone);
        });

        if (buIndex !== -1) {
          await deleteSheetRow(sheets, spreadsheetId, targetSheetId, buIndex);
          businessUnitDeleted = true;
        }
      }
    } catch (error) {
      console.error("Google Sheets error while deleting business unit copy:", error);
    }
  }

  return {
    leadId: normalizeCell(mainRow[0]),
    businessUnit,
    businessUnitDeleted,
  };
};

export const markLeadReminderSent = async (leadId) => {
  const { sheets, spreadsheetId, sheetName } = await ensureSheetHeaders();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getSheetRange(sheetName),
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => normalizeCell(row[0]) === normalizeCell(leadId));

  if (rowIndex === -1) {
    const error = new Error("Lead not found");
    error.status = 404;
    throw error;
  }

  const row = toMainSheetRow(rows[rowIndex] || []);
  row[15] = "YES";

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex + 1}:R${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });

  return toLead(row);
};

export const markLeadReminderSentDates = async (leadId, reminderSentDates) => {
  const { sheets, spreadsheetId, sheetName } = await ensureSheetHeaders();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getSheetRange(sheetName),
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => normalizeCell(row[0]) === normalizeCell(leadId));

  if (rowIndex === -1) {
    const error = new Error("Lead not found");
    error.status = 404;
    throw error;
  }

  const row = toMainSheetRow(rows[rowIndex] || []);
  row[16] = `${reminderSentDates ?? ""}`.trim();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex + 1}:R${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });

  return toLead(row);
};

export const markFollowUpCompleted = async (leadId) => {
  const { sheets, spreadsheetId, sheetName } = await ensureSheetHeaders();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: getSheetRange(sheetName),
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => normalizeCell(row[0]) === normalizeCell(leadId));

  if (rowIndex === -1) {
    const error = new Error("Lead not found");
    error.status = 404;
    throw error;
  }

  const row = toMainSheetRow(rows[rowIndex] || []);
  row[17] = "Completed";

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex + 1}:R${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });

  return toLead(row);
};
