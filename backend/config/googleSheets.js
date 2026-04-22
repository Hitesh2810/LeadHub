import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SERVICE_ACCOUNT_PATH = path.join(__dirname, "google-service-account.json");

export const getSpreadsheetId = () => {
  const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  console.log("Spreadsheet ID:", SPREADSHEET_ID);
  return SPREADSHEET_ID;
};

export const getSheetName = () => process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

const getEnvCredentials = () => {
  const client_email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const private_key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const project_id = process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID;

  if (!client_email || !private_key) {
    return null;
  }

  return {
    type: "service_account",
    project_id,
    client_email,
    private_key,
  };
};

const getFileCredentials = () => {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
};

export const getGoogleCredentials = () => {
  const credentials = getEnvCredentials() || getFileCredentials();

  if (!credentials) {
    throw new Error(
      "Missing Google Sheets credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in .env or place the JSON file at backend/config/google-service-account.json.",
    );
  }

  return credentials;
};

export const getSheetsClient = async () => {
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const envPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const envClientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const credentials = envClientEmail && envPrivateKey
    ? {
        ...getGoogleCredentials(),
        client_email: envClientEmail,
        private_key: envPrivateKey.replace(/\\n/g, "\n"),
      }
    : getGoogleCredentials();

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const authClient = await auth.getClient();

  return google.sheets({
    version: "v4",
    auth: authClient,
  });
};
