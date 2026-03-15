/* global process */

// Usage: PB_URL=https://your-pocketbase.example PB_ADMIN_EMAIL=admin@example.com PB_ADMIN_PASSWORD=yourpass node scripts/migrate-crm-fields.js
//
// This script is idempotent: it only appends missing fields and skips fields that
// already exist by name.

const PB_URL = process.env.PB_URL;
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

const REQUIRED_FIELDS = [
  { name: "followUpDate", type: "date", required: false },
  { name: "deadline", type: "date", required: false },
  { name: "reminderSnoozedUntil", type: "date", required: false },
  { name: "contactName", type: "text", required: false },
  { name: "contactRole", type: "text", required: false },
  { name: "contactEmail", type: "text", required: false },
  { name: "contactLinkedIn", type: "url", required: false },
  { name: "contactLastDate", type: "date", required: false },
  { name: "contactNextStep", type: "text", required: false },
  { name: "interviewNotes", type: "json", required: false },
  { name: "starred", type: "bool", required: false },
];

function normalizeBaseUrl(url) {
  return (url || "").replace(/\/+$/, "");
}

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function authenticateAdmin(baseUrl) {
  const response = await fetch(`${baseUrl}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: PB_ADMIN_EMAIL,
      password: PB_ADMIN_PASSWORD,
    }),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Admin auth failed: ${response.status} ${response.statusText} ${JSON.stringify(payload)}`);
  }

  const token = payload?.token;
  if (!token) {
    throw new Error("Admin auth succeeded but no token was returned.");
  }

  return token;
}

async function getCardsCollection(baseUrl, token) {
  const response = await fetch(`${baseUrl}/api/collections/cards`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Failed to fetch cards collection: ${response.status} ${response.statusText} ${JSON.stringify(payload)}`);
  }

  if (!payload || !Array.isArray(payload.fields)) {
    throw new Error("Cards collection fields are missing or invalid.");
  }

  return payload;
}

async function patchCardsCollectionSchema(baseUrl, token, mergedSchema) {
  const response = await fetch(`${baseUrl}/api/collections/cards`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: mergedSchema }),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Failed to patch cards schema: ${response.status} ${response.statusText} ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function run() {
  if (!PB_URL || !PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    throw new Error("Environment variables PB_URL, PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD are required.");
  }

  const baseUrl = normalizeBaseUrl(PB_URL);
  if (!baseUrl) {
    throw new Error("PB_URL is required and must not have trailing slashes.");
  }

  console.log(`Using PocketBase at: ${baseUrl}`);
  const token = await authenticateAdmin(baseUrl);
  const cardsCollection = await getCardsCollection(baseUrl, token);

  const existingSchema = Array.isArray(cardsCollection.fields) ? cardsCollection.fields : [];
  const existingNames = new Set(existingSchema.map((field) => field?.name).filter(Boolean));

  const addedFields = [];
  const skippedFields = [];

  const newFields = REQUIRED_FIELDS.filter((field) => {
    if (existingNames.has(field.name)) {
      skippedFields.push(field.name);
      return false;
    }
    addedFields.push(field.name);
    return true;
  });

  if (!newFields.length) {
    console.log("No fields changes needed. All CRM fields already exist.");
    console.log(`Skipped fields: ${skippedFields.join(", ") || "(none)"}`);
    return;
  }

  const mergedSchema = [...existingSchema, ...newFields];
  await patchCardsCollectionSchema(baseUrl, token, mergedSchema);

  console.log("CRM fields migration completed successfully.");
  console.log(`Added fields: ${addedFields.join(", ") || "(none)"}`);
  console.log(`Skipped fields: ${skippedFields.join(", ") || "(none)"}`);
}

run().catch((error) => {
  console.error("CRM schema migration failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
