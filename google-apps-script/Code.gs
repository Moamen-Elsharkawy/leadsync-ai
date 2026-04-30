/*
 * SmartFlow AI - MoveWell Physical Therapy Intake Web App
 *
 * Copy-paste deployment:
 * 1. Create a NEW Google Sheet for the clean physical therapy CRM.
 * 2. Go to Extensions -> Apps Script.
 * 3. Delete starter code, paste this entire Code.gs file, and save.
 * 4. Deploy -> New deployment -> Web app.
 * 5. Set "Execute as" to "Me".
 * 6. Set "Who has access" to "Anyone".
 * 7. Copy the Web App URL into GOOGLE_SHEETS_WEBAPP_URL in .env.
 * 8. Initialize the shared secret once with action "initSecret".
 * 9. Run action "setup" from the dashboard or npm run setup:sheets.
 *
 * This script uses only SpreadsheetApp.getActiveSpreadsheet().
 * No Google Cloud, service account, Sheets API credentials, or credentials JSON.
 */

var SMARTFLOW_VERSION = "2026-04-28-production";
var SECRET_PROPERTY_KEY = "SMARTFLOW_SECRET";

var HEADERS = {
  Leads: [
    "leadId",
    "telegramUserId",
    "telegramUsername",
    "fullName",
    "phone",
    "serviceRequested",
    "branch",
    "conditionArea",
    "urgency",
    "preferredDate",
    "preferredTime",
    "contactPreference",
    "timeline",
    "location",
    "status",
    "leadScore",
    "stage",
    "lastQuestionAsked",
    "notes",
    "rawMessages",
    "createdAt",
    "updatedAt",
    "followUpCount",
    "nextFollowUpAt"
  ],
  Sessions: [
    "telegramUserId",
    "currentStep",
    "collectedFieldsJson",
    "lastQuestionAsked",
    "questionAskCount",
    "lastMessageAt",
    "createdAt",
    "updatedAt"
  ],
  Messages: [
    "messageId",
    "leadId",
    "telegramUserId",
    "direction",
    "text",
    "createdAt"
  ],
  FollowUps: [
    "followUpId",
    "leadId",
    "telegramUserId",
    "status",
    "scheduledAt",
    "sentAt",
    "message",
    "attemptNumber"
  ],
  Reports: [
    "reportId",
    "reportDate",
    "totalLeads",
    "hotLeads",
    "warmLeads",
    "coldLeads",
    "conversionSummaryJson",
    "createdAt"
  ],
  Settings: ["key", "value"]
};

var ACTIONS = [
  "initSecret",
  "diagnostics",
  "setup",
  "appendMessage",
  "upsertSession",
  "getSession",
  "upsertLead",
  "getLead",
  "listLeads",
  "listHotLeads",
  "listWarmLeads",
  "listColdLeads",
  "listMessages",
  "listMessagesByLead",
  "listMessagesByTelegramUser",
  "appendFollowUp",
  "listFollowUps",
  "updateFollowUp",
  "listSettings",
  "upsertSetting",
  "appendReport",
  "getReportSummary",
  "getDashboardData"
];

function doGet(e) {
  return jsonResponse({
    ok: true,
    data: {
      name: "SmartFlow MoveWell Physical Therapy Intake Web App",
      status: "healthy",
      version: SMARTFLOW_VERSION,
      actions: ACTIONS,
      timestamp: new Date().toISOString()
    }
  });
}

function doPost(e) {
  try {
    var body = parseJsonBody(e);
    var action = body.action;
    var payload = body.payload || {};

    if (!action) {
      throw userError("Missing required field: action", "MISSING_ACTION");
    }

    if (!body.secret) {
      throw userError("Missing required field: secret", "MISSING_SECRET");
    }

    if (action === "initSecret") {
      return jsonResponse({ ok: true, data: initSecret(body.secret) });
    }

    validateSecret(body.secret);

    switch (action) {
      case "diagnostics":
        return jsonResponse({ ok: true, data: diagnostics() });
      case "setup":
        return jsonResponse({ ok: true, data: setupSpreadsheet() });
      case "appendMessage":
        return jsonResponse({
          ok: true,
          data: appendObject("Messages", payload.message)
        });
      case "upsertSession":
        return jsonResponse({
          ok: true,
          data: upsertByKey("Sessions", "telegramUserId", payload.session)
        });
      case "getSession":
        return jsonResponse({
          ok: true,
          data: getObjectByKey("Sessions", "telegramUserId", payload.telegramUserId)
        });
      case "upsertLead":
        return jsonResponse({
          ok: true,
          data: upsertByKey("Leads", "leadId", payload.lead)
        });
      case "getLead":
        return jsonResponse({
          ok: true,
          data: getObjectByKey("Leads", "leadId", payload.leadId)
        });
      case "listLeads":
        return jsonResponse({ ok: true, data: applyLimit(listObjects("Leads"), payload.limit) });
      case "listHotLeads":
        return jsonResponse({ ok: true, data: applyLimit(listLeadsByStatus("Hot"), payload.limit) });
      case "listWarmLeads":
        return jsonResponse({ ok: true, data: applyLimit(listLeadsByStatus("Warm"), payload.limit) });
      case "listColdLeads":
        return jsonResponse({ ok: true, data: applyLimit(listLeadsByStatus("Cold"), payload.limit) });
      case "listMessages":
        return jsonResponse({ ok: true, data: applyLimit(listMessages(payload || {}), payload.limit) });
      case "listMessagesByLead":
        return jsonResponse({
          ok: true,
          data: applyLimit(listMessages({ leadId: payload.leadId }), payload.limit)
        });
      case "listMessagesByTelegramUser":
        return jsonResponse({
          ok: true,
          data: applyLimit(listMessages({ telegramUserId: payload.telegramUserId }), payload.limit)
        });
      case "appendFollowUp":
        return jsonResponse({
          ok: true,
          data: appendObject("FollowUps", payload.followUp)
        });
      case "listFollowUps":
        return jsonResponse({ ok: true, data: applyLimit(listFollowUps(payload.status), payload.limit) });
      case "updateFollowUp":
        return jsonResponse({
          ok: true,
          data: updateFollowUp(payload.followUpId, payload.patch || {})
        });
      case "listSettings":
        return jsonResponse({ ok: true, data: listObjects("Settings") });
      case "upsertSetting":
        return jsonResponse({
          ok: true,
          data: upsertByKey("Settings", "key", {
            key: payload.key,
            value: payload.value
          })
        });
      case "appendReport":
        return jsonResponse({
          ok: true,
          data: appendObject("Reports", payload.report)
        });
      case "getReportSummary":
        return jsonResponse({ ok: true, data: getReportSummary() });
      case "getDashboardData":
        return jsonResponse({ ok: true, data: getDashboardData() });
      default:
        throw userError("Unsupported action: " + action, "UNSUPPORTED_ACTION");
    }
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: {
        message: error && error.message ? error.message : String(error),
        code: error && error.code ? error.code : "ERROR"
      }
    });
  }
}

function initSecret(secret) {
  var properties = PropertiesService.getScriptProperties();
  var existing = properties.getProperty(SECRET_PROPERTY_KEY);

  if (existing) {
    throw userError(
      "SMARTFLOW_SECRET is already set. Delete it from Script Properties before reinitializing.",
      "SECRET_ALREADY_SET"
    );
  }

  if (!secret || String(secret).trim().length < 12) {
    throw userError("Secret must be at least 12 characters.", "INVALID_SECRET");
  }

  properties.setProperty(SECRET_PROPERTY_KEY, String(secret));
  setupSpreadsheet();

  return {
    initialized: true,
    propertyKey: SECRET_PROPERTY_KEY,
    version: SMARTFLOW_VERSION
  };
}

function validateSecret(secret) {
  var expected = PropertiesService.getScriptProperties().getProperty(
    SECRET_PROPERTY_KEY
  );

  if (!expected) {
    throw userError(
      'SMARTFLOW_SECRET is not set. Send {"action":"initSecret","secret":"your-secret"} first.',
      "SECRET_NOT_INITIALIZED"
    );
  }

  if (String(secret) !== expected) {
    throw userError("Invalid secret.", "INVALID_SECRET");
  }
}

function diagnostics() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw userError(
      "No active spreadsheet found. Paste this script from Google Sheet -> Extensions -> Apps Script.",
      "NO_ACTIVE_SPREADSHEET"
    );
  }

  var tabNames = Object.keys(HEADERS);
  var tabs = {};
  var missingTabs = [];
  var missingHeaders = {};

  tabNames.forEach(function (sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      missingTabs.push(sheetName);
      missingHeaders[sheetName] = HEADERS[sheetName].slice();
      tabs[sheetName] = { exists: false, rowCount: 0, columnCount: 0 };
      return;
    }

    var existingHeaders = readExistingHeaders(sheet);
    var missing = HEADERS[sheetName].filter(function (header) {
      return existingHeaders.indexOf(header) === -1;
    });

    if (missing.length > 0) {
      missingHeaders[sheetName] = missing;
    }

    tabs[sheetName] = {
      exists: true,
      rowCount: sheet.getLastRow(),
      columnCount: sheet.getLastColumn(),
      missingHeaders: missing
    };
  });

  return {
    ok: true,
    version: SMARTFLOW_VERSION,
    spreadsheetName: spreadsheet.getName(),
    secretInitialized: Boolean(
      PropertiesService.getScriptProperties().getProperty(SECRET_PROPERTY_KEY)
    ),
    actions: ACTIONS,
    tabs: tabs,
    missingTabs: missingTabs,
    missingHeaders: missingHeaders,
    needsSetup:
      missingTabs.length > 0 || Object.keys(missingHeaders).length > 0,
    timestamp: new Date().toISOString()
  };
}

function setupSpreadsheet() {
  var tabNames = Object.keys(HEADERS);

  tabNames.forEach(function (sheetName) {
    var sheet = ensureSheet(sheetName);
    ensureHeaders(sheet, HEADERS[sheetName]);
  });

  seedSettings();

  return {
    tabs: tabNames,
    preservedExistingData: true,
    version: SMARTFLOW_VERSION
  };
}

function seedSettings() {
  var settings = [
    { key: "businessName", value: "MoveWell Physical Therapy Centers" },
    { key: "businessType", value: "physical therapy center" },
    { key: "branches", value: "Nasr City Branch, Maadi Branch, New Cairo Branch" },
    {
      key: "medicalSafety",
      value:
        "No diagnosis, no treatment advice, no exercises, no session-count promises, no appointment confirmation before staff review."
    }
  ];

  settings.forEach(function (setting) {
    upsertByKey("Settings", "key", setting);
  });
}

function appendObject(sheetName, objectValue) {
  if (!objectValue) {
    throw userError("Missing payload object for " + sheetName + ".", "MISSING_PAYLOAD");
  }

  var sheet = ensureSheet(sheetName);
  var headers = ensureHeaders(sheet, HEADERS[sheetName]);
  var row = objectToRow(headers, objectValue);

  sheet.appendRow(row);
  return rowToObject(headers, row);
}

function getObjectByKey(sheetName, keyField, keyValue) {
  if (!keyValue) {
    return null;
  }

  var sheet = ensureSheet(sheetName);
  var headers = ensureHeaders(sheet, HEADERS[sheetName]);
  var rowNumber = findRowByColumn(sheet, headers, keyField, keyValue);

  if (rowNumber < 1) {
    return null;
  }

  var values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  return rowToObject(headers, values);
}

function listObjects(sheetName) {
  var sheet = ensureSheet(sheetName);
  var headers = ensureHeaders(sheet, HEADERS[sheetName]);
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  var rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return rows.map(function (row) {
    return rowToObject(headers, row);
  });
}

function listLeadsByStatus(status) {
  return listObjects("Leads").filter(function (lead) {
    return String(lead.status) === status;
  });
}

function listMessages(filters) {
  var messages = listObjects("Messages");
  var leadId = filters && filters.leadId ? String(filters.leadId) : "";
  var telegramUserId =
    filters && filters.telegramUserId ? String(filters.telegramUserId) : "";

  return messages.filter(function (message) {
    if (leadId && String(message.leadId) !== leadId) {
      return false;
    }

    if (telegramUserId && String(message.telegramUserId) !== telegramUserId) {
      return false;
    }

    return true;
  });
}

function listFollowUps(status) {
  var followUps = listObjects("FollowUps");

  if (!status) {
    return followUps;
  }

  return followUps.filter(function (followUp) {
    return String(followUp.status) === String(status);
  });
}

function updateFollowUp(followUpId, patch) {
  var existing = getObjectByKey("FollowUps", "followUpId", followUpId);

  if (!existing) {
    throw userError("Follow-up not found: " + followUpId, "FOLLOW_UP_NOT_FOUND");
  }

  var updated = {};
  Object.keys(existing).forEach(function (key) {
    updated[key] = existing[key];
  });
  Object.keys(patch || {}).forEach(function (key) {
    updated[key] = patch[key];
  });

  return upsertByKey("FollowUps", "followUpId", updated);
}

function getReportSummary() {
  var leads = listObjects("Leads");
  var reports = listObjects("Reports");
  var summary = {
    totalLeads: leads.length,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0
  };

  leads.forEach(function (lead) {
    if (lead.status === "Hot") {
      summary.hotLeads += 1;
    } else if (lead.status === "Warm") {
      summary.warmLeads += 1;
    } else if (lead.status === "Cold") {
      summary.coldLeads += 1;
    }
  });

  if (reports.length > 0) {
    summary.latestReport = reports[reports.length - 1];
  }

  return summary;
}

function getDashboardData() {
  return {
    leads: listObjects("Leads"),
    messages: listObjects("Messages"),
    followUps: listObjects("FollowUps"),
    reports: listObjects("Reports"),
    settings: listObjects("Settings"),
    summary: getReportSummary()
  };
}

/* ── Core utilities ─────────────────────────────────────────────── */

function ensureSheet(sheetName) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw userError(
      "No active spreadsheet found. Paste this script from Google Sheet -> Extensions -> Apps Script.",
      "NO_ACTIVE_SPREADSHEET"
    );
  }

  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  return sheet;
}

function ensureHeaders(sheet, requiredHeaders) {
  if (!requiredHeaders || requiredHeaders.length === 0) {
    throw userError("Missing required headers.", "MISSING_HEADERS");
  }

  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return requiredHeaders.slice();
  }

  var headers = readExistingHeaders(sheet);

  requiredHeaders.forEach(function (header) {
    if (headers.indexOf(header) === -1) {
      headers.push(header);
    }
  });

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return headers;
}

function readExistingHeaders(sheet) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    return [];
  }

  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    })
    .filter(function (value) {
      return value;
    });
}

function rowToObject(headers, row) {
  var objectValue = {};

  headers.forEach(function (header, index) {
    objectValue[header] = normalizeCellValue(row[index]);
  });

  return objectValue;
}

function normalizeCellValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value === undefined || value === null ? "" : value;
}

function objectToRow(headers, objectValue) {
  return headers.map(function (header) {
    var value = objectValue[header];

    if (value === undefined || value === null) {
      return "";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return value;
  });
}

function findRowByColumn(sheet, headers, columnName, value) {
  var columnIndex = headers.indexOf(columnName);

  if (columnIndex === -1) {
    throw userError("Missing key column: " + columnName, "MISSING_KEY_COLUMN");
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return -1;
  }

  var values = sheet.getRange(2, columnIndex + 1, lastRow - 1, 1).getValues();
  var target = String(value);

  for (var index = 0; index < values.length; index += 1) {
    if (String(values[index][0]) === target) {
      return index + 2;
    }
  }

  return -1;
}

function upsertByKey(sheetName, keyField, objectValue) {
  if (!objectValue) {
    throw userError("Missing payload object for " + sheetName + ".", "MISSING_PAYLOAD");
  }

  if (!objectValue[keyField]) {
    throw userError("Missing key field: " + keyField, "MISSING_KEY_FIELD");
  }

  var sheet = ensureSheet(sheetName);
  var headers = ensureHeaders(sheet, HEADERS[sheetName]);
  var row = objectToRow(headers, objectValue);
  var existingRow = findRowByColumn(sheet, headers, keyField, objectValue[keyField]);

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, headers.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return rowToObject(headers, row);
}

function applyLimit(items, limit) {
  var parsed = Number(limit || 0);
  if (!parsed || parsed < 1) {
    return items;
  }

  return items.slice(0, Math.min(parsed, 500));
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function parseJsonBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw userError("Missing JSON request body.", "MISSING_BODY");
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw userError("Invalid JSON request body.", "INVALID_JSON");
  }
}

function userError(message, code) {
  var error = new Error(message);
  error.code = code || "ERROR";
  return error;
}
