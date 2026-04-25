/*
 * SmartFlow AI Telegram Sales Agent - Google Apps Script Web App
 *
 * Deployment steps:
 * 1. Create or open a Google Sheet.
 * 2. Go to Extensions -> Apps Script.
 * 3. Delete any starter code, paste this entire Code.gs file, and save.
 * 4. Deploy -> New deployment -> Web app.
 * 5. Set "Execute as" to "Me".
 * 6. Set "Who has access" to "Anyone".
 * 7. Copy the Web App URL into GOOGLE_SHEETS_WEBAPP_URL in your .env file.
 * 8. Initialize the shared secret once with action "initSecret".
 * 9. Run action "setup" to create missing tabs and headers.
 *
 * This script uses the active spreadsheet only:
 * SpreadsheetApp.getActiveSpreadsheet()
 *
 * Do not use Google Cloud, service accounts, Sheets API credentials, or
 * credentials JSON for this integration.
 */

var SECRET_PROPERTY_KEY = "SMARTFLOW_SECRET";

var HEADERS = {
  Leads: [
    "leadId",
    "telegramUserId",
    "telegramUsername",
    "fullName",
    "phone",
    "serviceRequested",
    "budget",
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
    "nextFollowUpAt",
    "isDemo"
  ],
  Sessions: [
    "telegramUserId",
    "currentStep",
    "collectedFieldsJson",
    "lastQuestionAsked",
    "lastMessageAt",
    "createdAt",
    "updatedAt",
    "isDemo"
  ],
  Messages: [
    "messageId",
    "leadId",
    "telegramUserId",
    "direction",
    "text",
    "createdAt",
    "isDemo"
  ],
  FollowUps: [
    "followUpId",
    "leadId",
    "telegramUserId",
    "status",
    "scheduledAt",
    "sentAt",
    "message",
    "attemptNumber",
    "isDemo"
  ],
  Reports: [
    "reportId",
    "reportDate",
    "totalLeads",
    "hotLeads",
    "warmLeads",
    "coldLeads",
    "conversionSummaryJson",
    "createdAt",
    "isDemo"
  ],
  Settings: ["key", "value"]
};

function doGet(e) {
  return jsonResponse({
    ok: true,
    data: {
      name: "SmartFlow AI Telegram Sales Agent",
      status: "healthy",
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
        return jsonResponse({ ok: true, data: listObjects("Leads") });
      case "listHotLeads":
        return jsonResponse({ ok: true, data: listLeadsByStatus("Hot") });
      case "listWarmLeads":
        return jsonResponse({ ok: true, data: listLeadsByStatus("Warm") });
      case "listColdLeads":
        return jsonResponse({ ok: true, data: listLeadsByStatus("Cold") });
      case "listMessages":
        return jsonResponse({ ok: true, data: listMessages(payload || {}) });
      case "listMessagesByLead":
        return jsonResponse({
          ok: true,
          data: listMessages({ leadId: payload.leadId })
        });
      case "listMessagesByTelegramUser":
        return jsonResponse({
          ok: true,
          data: listMessages({ telegramUserId: payload.telegramUserId })
        });
      case "appendFollowUp":
        return jsonResponse({
          ok: true,
          data: appendObject("FollowUps", payload.followUp)
        });
      case "listFollowUps":
        return jsonResponse({ ok: true, data: listFollowUps(payload.status) });
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
      case "getDashboardData":
        return jsonResponse({ ok: true, data: getDashboardData() });
      case "updateFollowUp":
        return jsonResponse({
          ok: true,
          data: updateFollowUp(payload.followUpId, payload.patch || {})
        });
      case "appendReport":
        return jsonResponse({
          ok: true,
          data: appendObject("Reports", payload.report)
        });
      case "getReportSummary":
        return jsonResponse({ ok: true, data: getReportSummary() });
      case "seedDemoData":
        return jsonResponse({ ok: true, data: seedDemoData(payload.preset) });
      case "clearDemoData":
        return jsonResponse({ ok: true, data: clearDemoData() });
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
    throw userError(
      "Secret must be at least 12 characters.",
      "INVALID_SECRET"
    );
  }

  properties.setProperty(SECRET_PROPERTY_KEY, String(secret));
  setupSpreadsheet();

  return {
    initialized: true,
    propertyKey: SECRET_PROPERTY_KEY
  };
}

function validateSecret(secret) {
  var expected = PropertiesService.getScriptProperties().getProperty(
    SECRET_PROPERTY_KEY
  );

  if (!expected) {
    throw userError(
      "SMARTFLOW_SECRET is not set. Send {\"action\":\"initSecret\",\"secret\":\"your-secret\"} first.",
      "SECRET_NOT_INITIALIZED"
    );
  }

  if (String(secret) !== expected) {
    throw userError("Invalid secret.", "INVALID_SECRET");
  }
}

function setupSpreadsheet() {
  var tabNames = Object.keys(HEADERS);

  tabNames.forEach(function (sheetName) {
    var sheet = ensureSheet(sheetName);
    ensureHeaders(sheet, HEADERS[sheetName]);
  });

  return {
    tabs: tabNames,
    preservedExistingData: true
  };
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

    if (
      telegramUserId &&
      String(message.telegramUserId) !== telegramUserId
    ) {
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
    coldLeads: 0,
    demoLeads: 0
  };

  leads.forEach(function (lead) {
    if (lead.status === "Hot") {
      summary.hotLeads += 1;
    } else if (lead.status === "Warm") {
      summary.warmLeads += 1;
    } else if (lead.status === "Cold") {
      summary.coldLeads += 1;
    }

    if (isDemoRow(lead)) {
      summary.demoLeads += 1;
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

function seedDemoData(preset) {
  var normalizedPreset = normalizeDemoPreset(preset);

  if (normalizedPreset === "custom") {
    var customResult = seedLegacyDemoData();
    customResult.preset = normalizedPreset;
    return customResult;
  }

  return seedPresetDemoData(
    normalizedPreset,
    getDemoLeadsForPreset(normalizedPreset)
  );
}

function seedLegacyDemoData() {
  clearDemoData();

  var now = new Date().toISOString();

  var demoLeads = [
    {
      id: "001",
      telegramUserId: "demo_1001",
      telegramUsername: "@demo_mona",
      fullName: "Mona Hassan",
      phone: "+201000000001",
      serviceRequested: "Telegram sales bot",
      budget: "35000 EGP",
      timeline: "this week",
      location: "Cairo",
      status: "Hot",
      leadScore: 94,
      notes: "Asked for a quote and a call today.",
      messages: [
        { direction: "inbound", text: "مساء الخير، محتاجة بوت تليجرام يرد على العملاء ويسجل الطلبات في شيت." },
        { direction: "outbound", text: "أهلا أستاذة منى، ما الموعد المناسب لبدء التنفيذ؟" },
        { direction: "inbound", text: "يفضل الأسبوع ده، والميزانية حوالي ٣٥ ألف جنيه. ممكن مكالمة النهارده؟" }
      ]
    },
    {
      id: "002",
      telegramUserId: "demo_1002",
      telegramUsername: "@demo_karim",
      fullName: "Karim Adel",
      phone: "+201000000002",
      serviceRequested: "AI lead qualification",
      budget: "20000 EGP",
      timeline: "within 10 days",
      location: "Alexandria",
      status: "Hot",
      leadScore: 88,
      notes: "Wants pricing and implementation plan.",
      messages: [
        { direction: "inbound", text: "عندي أكاديمية وعايز مساعد ذكي يفلتر الليدز قبل ما فريق المبيعات يكلمهم." },
        { direction: "outbound", text: "تمام، هل عندك ميزانية أو موعد مستهدف للتشغيل؟" },
        { direction: "inbound", text: "حوالي ٢٠ ألف، ومحتاجه خلال ١٠ أيام لو ينفع." }
      ]
    },
    {
      id: "003",
      telegramUserId: "demo_1003",
      telegramUsername: "@demo_sara",
      fullName: "Sara Nabil",
      phone: "+201000000003",
      serviceRequested: "Google Sheets CRM automation",
      budget: "15000 EGP",
      timeline: "next week",
      location: "Giza",
      status: "Hot",
      leadScore: 86,
      notes: "Needs CRM automation for a clinic.",
      messages: [
        { direction: "inbound", text: "ممكن نظام بسيط للعيادة يجمع بيانات المرضى من تليجرام في Google Sheets؟" },
        { direction: "outbound", text: "أكيد، ما الموعد المطلوب وهل يوجد رقم للتواصل؟" },
        { direction: "inbound", text: "الأسبوع الجاي، رقمي 01000000003 والميزانية ١٥ ألف." }
      ]
    },
    {
      id: "004",
      telegramUserId: "demo_1004",
      telegramUsername: "@demo_hany",
      fullName: "Hany Samir",
      phone: "+201000000004",
      serviceRequested: "WhatsApp and Telegram automation",
      budget: "50000 EGP",
      timeline: "urgent",
      location: "Mansoura",
      status: "Hot",
      leadScore: 92,
      notes: "Urgent omnichannel automation inquiry.",
      messages: [
        { direction: "inbound", text: "عايز أوتوميشن للواتساب والتليجرام لمتجر ملابس، والموضوع مستعجل." },
        { direction: "outbound", text: "تمام، هل لديك ميزانية تقريبية أو عدد الرسائل اليومي؟" },
        { direction: "inbound", text: "ميزانية ٥٠ ألف، ومحتاج عرض سعر ومكالمة مع المسؤول." }
      ]
    },
    {
      id: "005",
      telegramUserId: "demo_1005",
      telegramUsername: "@demo_ahmed",
      fullName: "Ahmed Maher",
      phone: "",
      serviceRequested: "Landing page and sales bot",
      budget: "",
      timeline: "next month",
      location: "Cairo",
      status: "Warm",
      leadScore: 68,
      notes: "Interested but no budget yet.",
      messages: [
        { direction: "inbound", text: "أنا بجهز إطلاق كورس جديد وعايز صفحة بيع مع بوت يرد على الاستفسارات." },
        { direction: "outbound", text: "ممتاز، هل عندك ميزانية مبدئية أو رقم للتواصل؟" },
        { direction: "inbound", text: "لسه بحدد الميزانية، غالبا الشهر الجاي." }
      ]
    },
    {
      id: "006",
      telegramUserId: "demo_1006",
      telegramUsername: "@demo_laila",
      fullName: "Laila Fouad",
      phone: "+201000000006",
      serviceRequested: "Marketing automation",
      budget: "",
      timeline: "this quarter",
      location: "Remote",
      status: "Warm",
      leadScore: 61,
      notes: "General automation exploration.",
      messages: [
        { direction: "inbound", text: "ممكن أعرف إزاي الأتمتة تساعد شركة تسويق صغيرة؟" },
        { direction: "outbound", text: "أكيد، ما أهم عملية تريدين تحسينها حاليا؟" },
        { direction: "inbound", text: "متابعة العملاء المحتملين خلال الربع الحالي، ولسه الميزانية مش واضحة." }
      ]
    },
    {
      id: "007",
      telegramUserId: "demo_1007",
      telegramUsername: "@demo_omar",
      fullName: "Omar Reda",
      phone: "",
      serviceRequested: "Telegram bot",
      budget: "8000 EGP",
      timeline: "",
      location: "Tanta",
      status: "Warm",
      leadScore: 57,
      notes: "Has budget but timeline missing.",
      messages: [
        { direction: "inbound", text: "عايز بوت تليجرام بسيط يرد على الأسئلة المتكررة." },
        { direction: "outbound", text: "تمام، ما الموعد المطلوب للتنفيذ؟" },
        { direction: "inbound", text: "الميزانية حوالي ٨ آلاف، ولسه مش محدد الموعد." }
      ]
    },
    {
      id: "008",
      telegramUserId: "demo_1008",
      telegramUsername: "@demo_nour",
      fullName: "Nour Ashraf",
      phone: "+201000000008",
      serviceRequested: "CRM setup",
      budget: "",
      timeline: "soon",
      location: "Cairo",
      status: "Warm",
      leadScore: 64,
      notes: "Needs CRM advice before quote.",
      messages: [
        { direction: "inbound", text: "عندنا فريق مبيعات صغير ومحتاجين CRM بسيط على Google Sheets." },
        { direction: "outbound", text: "ممتاز، هل تريدون البدء قريبا وهل توجد ميزانية محددة؟" },
        { direction: "inbound", text: "عايزين نبدأ قريب، بس محتاجين نفهم الاختيارات الأول." }
      ]
    },
    {
      id: "009",
      telegramUserId: "demo_1009",
      telegramUsername: "@demo_random",
      fullName: "",
      phone: "",
      serviceRequested: "",
      budget: "",
      timeline: "",
      location: "",
      status: "Cold",
      leadScore: 18,
      notes: "Vague message with no clear need.",
      messages: [
        { direction: "inbound", text: "السلام عليكم" },
        { direction: "outbound", text: "وعليكم السلام، ما الخدمة التي تحتاجها بالتحديد؟" },
        { direction: "inbound", text: "مش عارف، كنت بس بسأل." }
      ]
    },
    {
      id: "010",
      telegramUserId: "demo_1010",
      telegramUsername: "@demo_support",
      fullName: "Youssef Ali",
      phone: "",
      serviceRequested: "support request",
      budget: "",
      timeline: "",
      location: "Cairo",
      status: "Cold",
      leadScore: 25,
      notes: "Support-style request, not a sales lead.",
      messages: [
        { direction: "inbound", text: "أنا عندي مشكلة في بوت قديم حد تاني عامله، ممكن تصلحوه مجانا؟" },
        { direction: "outbound", text: "نقدر نراجع المشكلة بعد معرفة التفاصيل، هل ترغب في خدمة مدفوعة للدعم الفني؟" },
        { direction: "inbound", text: "لا، كنت بدور على حل سريع فقط." }
      ]
    }
  ];

  var createdMessages = 0;

  demoLeads.forEach(function (demoLead) {
    var leadId = "lead_demo_" + demoLead.id;
    var rawMessages = demoLead.messages
      .filter(function (message) {
        return message.direction === "inbound";
      })
      .map(function (message) {
        return message.text;
      });
    var nextFollowUpAt =
      demoLead.status === "Warm"
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : "";

    upsertByKey("Leads", "leadId", {
      leadId: leadId,
      telegramUserId: demoLead.telegramUserId,
      telegramUsername: demoLead.telegramUsername,
      fullName: demoLead.fullName,
      phone: demoLead.phone,
      serviceRequested: demoLead.serviceRequested,
      budget: demoLead.budget,
      timeline: demoLead.timeline,
      location: demoLead.location,
      status: demoLead.status,
      leadScore: demoLead.leadScore,
      stage: demoLead.status === "Cold" ? "qualifying" : "qualified",
      lastQuestionAsked: "",
      notes: demoLead.notes,
      rawMessages: JSON.stringify(rawMessages),
      createdAt: now,
      updatedAt: now,
      followUpCount: 0,
      nextFollowUpAt: nextFollowUpAt,
      isDemo: true
    });

    upsertByKey("Sessions", "telegramUserId", {
      telegramUserId: demoLead.telegramUserId,
      currentStep: demoLead.status === "Cold" ? "qualifying" : "qualified",
      collectedFieldsJson: JSON.stringify({
        fullName: demoLead.fullName,
        phone: demoLead.phone,
        serviceRequested: demoLead.serviceRequested,
        budget: demoLead.budget,
        timeline: demoLead.timeline,
        location: demoLead.location,
        notes: demoLead.notes
      }),
      lastQuestionAsked: "",
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
      isDemo: true
    });

    demoLead.messages.forEach(function (message, messageIndex) {
      createdMessages += 1;
      upsertByKey("Messages", "messageId", {
        messageId: "demo_msg_" + demoLead.id + "_" + String(messageIndex + 1),
        leadId: leadId,
        telegramUserId: demoLead.telegramUserId,
        direction: message.direction,
        text: message.text,
        createdAt: now,
        isDemo: true
      });
    });
  });

  upsertByKey("Reports", "reportId", {
    reportId: "demo_report_001",
    reportDate: now.slice(0, 10),
    totalLeads: 10,
    hotLeads: 4,
    warmLeads: 4,
    coldLeads: 2,
    conversionSummaryJson: JSON.stringify({
      source: "demo",
      hotRate: "40%",
      warmRate: "40%",
      coldRate: "20%",
      note: "Portfolio-safe fake Arabic sales conversations."
    }),
    createdAt: now,
    isDemo: true
  });

  return {
    seeded: true,
    createdLeads: demoLeads.length,
    createdMessages: createdMessages
  };
}

function normalizeDemoPreset(preset) {
  var value = String(preset || "custom").toLowerCase();

  if (value === "dental" || value === "dental-clinic") {
    return "dental-clinic";
  }

  if (value === "course" || value === "online-course") {
    return "online-course";
  }

  if (value === "physio" || value === "physical-therapy") {
    return "physical-therapy";
  }

  return "custom";
}

function getDemoLeadsForPreset(preset) {
  if (preset === "dental-clinic") {
    return getDentalClinicDemoLeads();
  }

  if (preset === "online-course") {
    return getOnlineCourseDemoLeads();
  }

  if (preset === "physical-therapy") {
    return getPhysicalTherapyDemoLeads();
  }

  return [];
}

function seedPresetDemoData(preset, demoLeads) {
  clearDemoData();

  var now = new Date().toISOString();
  var prefix = preset.replace(/-/g, "_");
  var createdMessages = 0;

  demoLeads.forEach(function (demoLead) {
    var leadId = "lead_demo_" + prefix + "_" + demoLead.id;
    var createdAt =
      demoLead.createdAt ||
      new Date(
        Date.now() - Number(demoLead.createdAtOffsetDays || 0) * 24 * 60 * 60 * 1000
      ).toISOString();
    var updatedAt = demoLead.updatedAt || now;
    var rawMessages = demoLead.messages
      .filter(function (message) {
        return message.direction === "inbound";
      })
      .map(function (message) {
        return message.text;
      });
    var nextFollowUpAt =
      demoLead.status === "Warm"
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : "";

    upsertByKey("Leads", "leadId", {
      leadId: leadId,
      telegramUserId: demoLead.telegramUserId,
      telegramUsername: demoLead.telegramUsername,
      fullName: demoLead.fullName,
      phone: demoLead.phone,
      serviceRequested: demoLead.serviceRequested,
      budget: demoLead.budget,
      timeline: demoLead.timeline,
      location: demoLead.location,
      status: demoLead.status,
      leadScore: demoLead.leadScore,
      stage: demoLead.status === "Cold" ? "qualifying" : "qualified",
      lastQuestionAsked: "",
      notes: demoLead.notes,
      rawMessages: JSON.stringify(rawMessages),
      createdAt: createdAt,
      updatedAt: updatedAt,
      followUpCount: 0,
      nextFollowUpAt: nextFollowUpAt,
      isDemo: true
    });

    upsertByKey("Sessions", "telegramUserId", {
      telegramUserId: demoLead.telegramUserId,
      currentStep: demoLead.status === "Cold" ? "qualifying" : "qualified",
      collectedFieldsJson: JSON.stringify({
        fullName: demoLead.fullName,
        phone: demoLead.phone,
        serviceRequested: demoLead.serviceRequested,
        budget: demoLead.budget,
        timeline: demoLead.timeline,
        location: demoLead.location,
        notes: demoLead.notes
      }),
      lastQuestionAsked: "",
      lastMessageAt: updatedAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      isDemo: true
    });

    demoLead.messages.forEach(function (message, messageIndex) {
      createdMessages += 1;
      upsertByKey("Messages", "messageId", {
        messageId:
          "demo_msg_" + prefix + "_" + demoLead.id + "_" + String(messageIndex + 1),
        leadId: leadId,
        telegramUserId: demoLead.telegramUserId,
        direction: message.direction,
        text: message.text,
        createdAt:
          message.createdAt ||
          new Date(new Date(createdAt).getTime() + messageIndex * 4 * 60 * 1000).toISOString(),
        isDemo: true
      });
    });

    if (demoLead.status === "Warm") {
      upsertByKey("FollowUps", "followUpId", {
        followUpId: "demo_fu_" + prefix + "_" + demoLead.id,
        leadId: leadId,
        telegramUserId: demoLead.telegramUserId,
        status: "pending",
        scheduledAt: nextFollowUpAt,
        sentAt: "",
        message: demoLead.followUpMessage,
        attemptNumber: 1,
        isDemo: true
      });
    }
  });

  var counts = countDemoLeadStatuses(demoLeads);

  upsertByKey("Reports", "reportId", {
    reportId: "demo_report_" + prefix,
    reportDate: now.slice(0, 10),
    totalLeads: demoLeads.length,
    hotLeads: counts.hot,
    warmLeads: counts.warm,
    coldLeads: counts.cold,
    conversionSummaryJson: JSON.stringify({
      source: "demo",
      preset: preset,
      hotRate: Math.round((counts.hot / demoLeads.length) * 100) + "%",
      warmRate: Math.round((counts.warm / demoLeads.length) * 100) + "%",
      coldRate: Math.round((counts.cold / demoLeads.length) * 100) + "%",
      note: "Portfolio-safe fake Arabic sales conversations for " + preset + "."
    }),
    createdAt: now,
    isDemo: true
  });

  return {
    seeded: true,
    preset: preset,
    createdLeads: demoLeads.length,
    createdMessages: createdMessages
  };
}

function countDemoLeadStatuses(demoLeads) {
  return demoLeads.reduce(
    function (counts, lead) {
      if (lead.status === "Hot") {
        counts.hot += 1;
      } else if (lead.status === "Warm") {
        counts.warm += 1;
      } else if (lead.status === "Cold") {
        counts.cold += 1;
      }

      return counts;
    },
    { hot: 0, warm: 0, cold: 0 }
  );
}

function getDentalClinicDemoLeads() {
  return [
    {
      id: "001",
      telegramUserId: "demo_dental_1001",
      telegramUsername: "@dental_ahmed",
      fullName: "Ahmed Fathy",
      phone: "+201011110001",
      serviceRequested: "زراعة الأسنان",
      budget: "25000 EGP تقريبيا",
      timeline: "this week",
      location: "Nasr City",
      status: "Hot",
      leadScore: 93,
      notes: "Asked for implant consultation and a call this week. No diagnosis was requested.",
      messages: [
        { direction: "inbound", text: "مساء الخير، محتاج استشارة زراعة ضروري وعندي أشعة بانوراما جاهزة." },
        { direction: "outbound", text: "أهلا أستاذ أحمد، هل يناسبك زيارة قريبة وهل يوجد رقم للتواصل مع الاستقبال؟" },
        { direction: "inbound", text: "يناسبني الأسبوع ده، وميزانيتي حوالي ٢٥ ألف. رقمي 01011110001." }
      ]
    },
    {
      id: "002",
      telegramUserId: "demo_dental_1002",
      telegramUsername: "@dental_mona",
      fullName: "Mona Samir",
      phone: "+201011110002",
      serviceRequested: "تبييض الأسنان",
      budget: "4000-6000 EGP",
      timeline: "next Saturday",
      location: "New Cairo",
      status: "Hot",
      leadScore: 88,
      notes: "Wants whitening before an event and asked for reception follow-up.",
      messages: [
        { direction: "inbound", text: "عايزة أعرف تفاصيل تبييض الأسنان قبل خطوبتي، محتاجة أخلص الموضوع بسرعة." },
        { direction: "outbound", text: "مبروك مقدما. هل لديك موعد مناسب أو ميزانية تقريبية؟" },
        { direction: "inbound", text: "السبت الجاي مناسب، والميزانية بين ٤ و٦ آلاف. ممكن حد يكلمني؟" }
      ]
    },
    {
      id: "003",
      telegramUserId: "demo_dental_1003",
      telegramUsername: "@dental_karim",
      fullName: "Karim Adel",
      phone: "+201011110003",
      serviceRequested: "استفسار طوارئ الأسنان",
      budget: "",
      timeline: "today",
      location: "Heliopolis",
      status: "Hot",
      leadScore: 86,
      notes: "Emergency inquiry. Needs reception call, no medical advice promised.",
      messages: [
        { direction: "inbound", text: "عندي ألم في ضرس ومحتاج أعرف لو ممكن كشف قريب النهارده." },
        { direction: "outbound", text: "سلامتك. أقدر أنقل طلبك للاستقبال بدون تأكيد موعد الآن. ما رقم التواصل؟" },
        { direction: "inbound", text: "01011110003، لو في أي ميعاد النهارده أو بكرة بدري كلمني." }
      ]
    },
    {
      id: "004",
      telegramUserId: "demo_dental_1004",
      telegramUsername: "@dental_sara",
      fullName: "Sara Nabil",
      phone: "+201011110004",
      serviceRequested: "تقويم الأسنان",
      budget: "installment preference",
      timeline: "this month",
      location: "Maadi",
      status: "Hot",
      leadScore: 84,
      notes: "Interested in orthodontics consultation and installments discussion.",
      messages: [
        { direction: "inbound", text: "محتاجة أبدأ تقويم ومهتمة أعرف نظام الكشف والمتابعة." },
        { direction: "outbound", text: "تمام، هل تفضلين البدء قريبا وهل يوجد رقم للتواصل؟" },
        { direction: "inbound", text: "عايزة أبدأ الشهر ده، ويفضل لو فيه نظام أقساط. رقمي 01011110004." }
      ]
    },
    {
      id: "005",
      telegramUserId: "demo_dental_1005",
      telegramUsername: "@dental_laila",
      fullName: "Laila Fouad",
      phone: "+201011110005",
      serviceRequested: "تنظيف وتلميع الأسنان",
      budget: "",
      timeline: "next week",
      location: "Cairo",
      status: "Warm",
      leadScore: 66,
      notes: "Interested in cleaning next week but did not ask for booking yet.",
      followUpMessage: "أهلا أستاذة ليلى، هل ما زلت مهتمة بتنظيف وتلميع الأسنان الأسبوع القادم؟ يسعدنا أن ينقل فريق الاستقبال طلبك.",
      messages: [
        { direction: "inbound", text: "ممكن أعرف تفاصيل تنظيف وتلميع الأسنان؟" },
        { direction: "outbound", text: "أكيد. هل تفكرين في زيارة قريبة أم تريدين معرفة التفاصيل أولا؟" },
        { direction: "inbound", text: "غالبا الأسبوع الجاي، بس محتاجة أعرف النظام الأول." }
      ]
    },
    {
      id: "006",
      telegramUserId: "demo_dental_1006",
      telegramUsername: "@dental_omar",
      fullName: "Omar Reda",
      phone: "",
      serviceRequested: "زراعة الأسنان",
      budget: "",
      timeline: "within two months",
      location: "Giza",
      status: "Warm",
      leadScore: 62,
      notes: "Asking general implant questions, phone missing.",
      followUpMessage: "أهلا أستاذ عمر، هل تحب أن يتواصل معك الاستقبال بخصوص استشارة زراعة الأسنان؟ يمكنك إرسال رقمك في أي وقت.",
      messages: [
        { direction: "inbound", text: "بسأل عن زراعة الأسنان، هل لازم كشف الأول؟" },
        { direction: "outbound", text: "غالبا يتم تقييم الحالة في العيادة، بدون تشخيص هنا. متى تفكر في الزيارة؟" },
        { direction: "inbound", text: "خلال شهر أو شهرين، ولسه بحسب التكلفة." }
      ]
    },
    {
      id: "007",
      telegramUserId: "demo_dental_1007",
      telegramUsername: "@dental_dina",
      fullName: "Dina Mostafa",
      phone: "",
      serviceRequested: "تبييض الأسنان",
      budget: "",
      timeline: "",
      location: "Alexandria",
      status: "Warm",
      leadScore: 58,
      notes: "Interested in whitening price range but missing contact and timeline.",
      followUpMessage: "أهلا أستاذة دينا، هل يناسبك إرسال رقم للتواصل حتى يوضح لك الاستقبال تفاصيل تبييض الأسنان؟",
      messages: [
        { direction: "inbound", text: "تبييض الأسنان عندكم بيكون جلسة واحدة ولا أكتر؟" },
        { direction: "outbound", text: "يتحدد الأنسب بعد مراجعة الفريق المختص. هل لديك موعد مستهدف؟" },
        { direction: "inbound", text: "مش محددة لسه، كنت بجمع معلومات." }
      ]
    },
    {
      id: "008",
      telegramUserId: "demo_dental_1008",
      telegramUsername: "@dental_hany",
      fullName: "Hany Samir",
      phone: "+201011110008",
      serviceRequested: "كشف واستشارة أسنان",
      budget: "",
      timeline: "after exams",
      location: "Mansoura",
      status: "Warm",
      leadScore: 55,
      notes: "Parent asking for child consultation after exams.",
      followUpMessage: "أهلا أستاذ هاني، هل تحب أن يسجل الاستقبال طلب كشف واستشارة بعد فترة الامتحانات؟",
      messages: [
        { direction: "inbound", text: "ابني محتاج كشف أسنان بس هنستنى بعد الامتحانات." },
        { direction: "outbound", text: "تمام، هل تريد أن يتواصل معك الاستقبال لتسجيل البيانات والمتابعة؟" },
        { direction: "inbound", text: "ممكن بعد الامتحانات، رقمي 01011110008." }
      ]
    },
    {
      id: "009",
      telegramUserId: "demo_dental_1009",
      telegramUsername: "@dental_random",
      fullName: "",
      phone: "",
      serviceRequested: "",
      budget: "",
      timeline: "",
      location: "",
      status: "Cold",
      leadScore: 18,
      notes: "Vague greeting without service need.",
      messages: [
        { direction: "inbound", text: "السلام عليكم" },
        { direction: "outbound", text: "وعليكم السلام، ما خدمة الأسنان التي تحتاجها؟" },
        { direction: "inbound", text: "مش عارف، كنت بس بسأل." }
      ]
    },
    {
      id: "010",
      telegramUserId: "demo_dental_1010",
      telegramUsername: "@dental_free",
      fullName: "Youssef Ali",
      phone: "",
      serviceRequested: "كشف واستشارة أسنان",
      budget: "free only",
      timeline: "",
      location: "Cairo",
      status: "Cold",
      leadScore: 24,
      notes: "Only looking for free service, no clear intent.",
      messages: [
        { direction: "inbound", text: "عندكم كشف مجاني أو علاج مجاني؟" },
        { direction: "outbound", text: "أقدر أنقل استفسارك للاستقبال لمعرفة المتاح، هل لديك رقم للتواصل؟" },
        { direction: "inbound", text: "لا، لو مجاني بس ابعتولي." }
      ]
    }
  ];
}

function getOnlineCourseDemoLeads() {
  return [
    {
      id: "001",
      telegramUserId: "demo_course_1001",
      telegramUsername: "@course_youssef",
      fullName: "Youssef Mahmoud",
      phone: "+201033330001",
      serviceRequested: "الاشتراك في كورس فردي",
      budget: "5000 EGP",
      timeline: "this week",
      location: "Online",
      status: "Hot",
      leadScore: 91,
      notes: "Wants to enroll in a data analysis course this week.",
      messages: [
        { direction: "inbound", text: "عايز أشترك في كورس Data Analysis وأبدأ الأسبوع ده لو متاح." },
        { direction: "outbound", text: "ممتاز. هل لديك ميزانية تقريبية أو رقم تواصل لفريق القبول؟" },
        { direction: "inbound", text: "ميزانيتي حوالي ٥ آلاف ورقمي 01033330001. محتاج أعرف الخطوات." }
      ]
    },
    {
      id: "002",
      telegramUserId: "demo_course_1002",
      telegramUsername: "@course_rana",
      fullName: "Rana Magdy",
      phone: "+201033330002",
      serviceRequested: "جلسات تدريب خاصة",
      budget: "8000 EGP",
      timeline: "next week",
      location: "Online",
      status: "Hot",
      leadScore: 87,
      notes: "Asked for private coaching and a call with admissions.",
      messages: [
        { direction: "inbound", text: "محتاجة جلسات تدريب خاصة في UX Portfolio عشان أجهز للتقديم." },
        { direction: "outbound", text: "تمام، متى تفضلين البدء وهل يوجد رقم للتواصل؟" },
        { direction: "inbound", text: "الأسبوع الجاي مناسب، والميزانية ٨ آلاف. ممكن مكالمة؟" }
      ]
    },
    {
      id: "003",
      telegramUserId: "demo_course_1003",
      telegramUsername: "@course_mahmoud",
      fullName: "Mahmoud Hassan",
      phone: "+201033330003",
      serviceRequested: "تدريب فرق الشركات",
      budget: "40000 EGP",
      timeline: "next month",
      location: "Cairo",
      status: "Hot",
      leadScore: 89,
      notes: "Corporate training inquiry for a sales team.",
      messages: [
        { direction: "inbound", text: "عندنا فريق مبيعات ١٢ شخص وعايزين تدريب عملي على استخدام AI في المتابعة." },
        { direction: "outbound", text: "ممتاز. هل لديكم موعد مستهدف وميزانية تقريبية؟" },
        { direction: "inbound", text: "الشهر الجاي، والميزانية حوالي ٤٠ ألف. ابعتولي عرض مبدئي وكلموني." }
      ]
    },
    {
      id: "004",
      telegramUserId: "demo_course_1004",
      telegramUsername: "@course_salma",
      fullName: "Salma Tarek",
      phone: "+201033330004",
      serviceRequested: "باقة كورسات",
      budget: "12000 EGP",
      timeline: "within 10 days",
      location: "Online",
      status: "Hot",
      leadScore: 84,
      notes: "Interested in bundle and asked for admissions follow-up.",
      messages: [
        { direction: "inbound", text: "مهتمة بباقة كورسات Digital Marketing وContent، وعايزة أعرف أنسب اختيار." },
        { direction: "outbound", text: "جميل. هل لديك موعد للبدء أو ميزانية تقريبية؟" },
        { direction: "inbound", text: "عايزة أبدأ خلال ١٠ أيام، وميزانيتي ١٢ ألف. رقمي 01033330004." }
      ]
    },
    {
      id: "005",
      telegramUserId: "demo_course_1005",
      telegramUsername: "@course_ahmed",
      fullName: "Ahmed Nader",
      phone: "",
      serviceRequested: "استشارة اختيار مسار التعلم",
      budget: "",
      timeline: "this month",
      location: "Online",
      status: "Warm",
      leadScore: 66,
      notes: "Needs help choosing a learning path, phone missing.",
      followUpMessage: "أهلا أستاذ أحمد، هل ما زلت ترغب في استشارة اختيار مسار التعلم؟ يمكنك إرسال رقمك ليتابع معك فريق القبول.",
      messages: [
        { direction: "inbound", text: "أنا محتار أبدأ Data ولا Marketing ومحتاج حد يوجهني." },
        { direction: "outbound", text: "أكيد. هل ترغب في البدء هذا الشهر أم تجمع معلومات حاليا؟" },
        { direction: "inbound", text: "غالبا هذا الشهر، بس لسه مش محدد الميزانية." }
      ]
    },
    {
      id: "006",
      telegramUserId: "demo_course_1006",
      telegramUsername: "@course_nada",
      fullName: "Nada Adel",
      phone: "+201033330006",
      serviceRequested: "الاشتراك في كورس فردي",
      budget: "",
      timeline: "next quarter",
      location: "Online",
      status: "Warm",
      leadScore: 60,
      notes: "Interested but timeline is later and budget is missing.",
      followUpMessage: "أهلا أستاذة ندى، هل تودين الاحتفاظ ببياناتك للمتابعة عند فتح دفعات الربع القادم؟",
      messages: [
        { direction: "inbound", text: "عايزة تفاصيل كورس Business English بس هبدأ بعد فترة." },
        { direction: "outbound", text: "تمام، هل لديك موعد تقريبي أو ميزانية للتدريب؟" },
        { direction: "inbound", text: "غالبا الربع الجاي، ورقمي 01033330006." }
      ]
    },
    {
      id: "007",
      telegramUserId: "demo_course_1007",
      telegramUsername: "@course_farah",
      fullName: "Farah Mostafa",
      phone: "",
      serviceRequested: "جلسات تدريب خاصة",
      budget: "",
      timeline: "",
      location: "Online",
      status: "Warm",
      leadScore: 57,
      notes: "Asked about syllabus, not ready to buy yet.",
      followUpMessage: "أهلا أستاذة فرح، هل تحبين أن يرسل لك فريق القبول تفاصيل جلسات التدريب الخاصة؟",
      messages: [
        { direction: "inbound", text: "ممكن أعرف محتوى جلسات التدريب الخاصة؟" },
        { direction: "outbound", text: "أكيد. هل تبحثين عن تدريب في مجال محدد ومتى ترغبين في البدء؟" },
        { direction: "inbound", text: "لسه بقرأ التفاصيل، مش محددة وقت البدء." }
      ]
    },
    {
      id: "008",
      telegramUserId: "demo_course_1008",
      telegramUsername: "@course_company",
      fullName: "Hany Samir",
      phone: "+201033330008",
      serviceRequested: "تدريب فرق الشركات",
      budget: "",
      timeline: "soon",
      location: "Alexandria",
      status: "Warm",
      leadScore: 64,
      notes: "Company training inquiry, budget missing.",
      followUpMessage: "أهلا أستاذ هاني، هل ما زلتم مهتمين بتدريب فريق الشركة؟ يمكن لفريق القبول ترتيب مكالمة تعريفية.",
      messages: [
        { direction: "inbound", text: "محتاجين تدريب لفريق خدمة العملاء على مهارات التواصل." },
        { direction: "outbound", text: "ممتاز، كم عدد المتدربين وهل يوجد موعد مستهدف أو ميزانية؟" },
        { direction: "inbound", text: "حوالي ٨ أفراد، وعايزين نبدأ قريب بس الميزانية لسه مش محددة." }
      ]
    },
    {
      id: "009",
      telegramUserId: "demo_course_1009",
      telegramUsername: "@course_free",
      fullName: "",
      phone: "",
      serviceRequested: "",
      budget: "free only",
      timeline: "",
      location: "",
      status: "Cold",
      leadScore: 20,
      notes: "Only asking for free links, no buying intent.",
      messages: [
        { direction: "inbound", text: "ابعتولي لينك كورسات مجانية." },
        { direction: "outbound", text: "يمكنك توضيح المجال الذي تبحث عنه؟ لدينا برامج مدفوعة ويمكن لفريق القبول شرح الخيارات." },
        { direction: "inbound", text: "لا، أنا عايز مجاني فقط." }
      ]
    },
    {
      id: "010",
      telegramUserId: "demo_course_1010",
      telegramUsername: "@course_irrelevant",
      fullName: "Mostafa Ali",
      phone: "",
      serviceRequested: "",
      budget: "",
      timeline: "",
      location: "Cairo",
      status: "Cold",
      leadScore: 15,
      notes: "Irrelevant request.",
      messages: [
        { direction: "inbound", text: "بتبيعوا لابتوبات أو سماعات؟" },
        { direction: "outbound", text: "نحن أكاديمية تدريب أونلاين. هل تبحث عن كورس أو استشارة تعليمية؟" },
        { direction: "inbound", text: "لا خلاص شكرا." }
      ]
    }
  ];
}

function getPhysicalTherapyDemoLeads() {
  return [
    {
      id: "001",
      createdAtOffsetDays: 1,
      telegramUserId: "demo_physio_1001",
      telegramUsername: "@movewell_ahmed",
      fullName: "Ahmed Fathy",
      phone: "+201044440001",
      serviceRequested: "Back pain physiotherapy",
      budget: "800-1200 EGP",
      timeline: "tomorrow",
      location: "Nasr City Branch",
      status: "Hot",
      leadScore: 92,
      notes: "Lower back pain inquiry for Nasr City. Staff should handle medical intake; no diagnosis requested or provided.",
      messages: [
        { direction: "inbound", text: "مساء الخير، محتاج جلسة علاج طبيعي لأسفل الظهر في فرع مدينة نصر بكرة لو ينفع." },
        { direction: "outbound", text: "أهلا أستاذ أحمد، سلامتك. أقدر أسجل طلبك للاستقبال بدون تشخيص داخل المحادثة. هل يوجد رقم للتواصل؟" },
        { direction: "inbound", text: "رقمي 01044440001، وميزانيتي حوالي ٨٠٠ إلى ١٢٠٠ جنيه." }
      ]
    },
    {
      id: "002",
      createdAtOffsetDays: 3,
      telegramUserId: "demo_physio_1002",
      telegramUsername: "@movewell_menna",
      fullName: "Menna Adel",
      phone: "+201044440002",
      serviceRequested: "Post-surgery rehabilitation",
      budget: "",
      timeline: "this week",
      location: "Maadi Branch",
      status: "Hot",
      leadScore: 88,
      notes: "Post-ACL surgery rehabilitation inquiry. Needs staff call before any plan or session estimate.",
      messages: [
        { direction: "inbound", text: "أنا عاملة عملية رباط صليبي ومحتاجة متابعة علاج طبيعي في المعادي الأسبوع ده." },
        { direction: "outbound", text: "سلامتك يا أستاذة منة. سننقل التفاصيل للفريق المختص بدون تحديد خطة علاج هنا. ما رقم التواصل المناسب؟" },
        { direction: "inbound", text: "01044440002، ياريت حد يكلمني النهارده." }
      ]
    },
    {
      id: "003",
      createdAtOffsetDays: 5,
      telegramUserId: "demo_physio_1003",
      telegramUsername: "@movewell_karim",
      fullName: "Karim Hassan",
      phone: "+201044440003",
      serviceRequested: "Sports injury rehabilitation",
      budget: "1000 EGP per visit if suitable",
      timeline: "today",
      location: "New Cairo Branch",
      status: "Hot",
      leadScore: 86,
      notes: "Football sports injury rehab inquiry. Asked for appointment/call; no treatment advice provided.",
      messages: [
        { direction: "inbound", text: "اتصبت في ماتش كورة وعايز أعرف أقدر أحجز كشف علاج طبيعي في التجمع النهارده؟" },
        { direction: "outbound", text: "سلامتك. أقدر أسجل طلبك للفريق للتواصل وتأكيد المتاح، بدون تأكيد موعد الآن. ما رقمك؟" },
        { direction: "inbound", text: "01044440003، والميزانية حوالي ألف جنيه للزيارة لو مناسب." }
      ]
    },
    {
      id: "004",
      createdAtOffsetDays: 7,
      telegramUserId: "demo_physio_1004",
      telegramUsername: "@movewell_sara",
      fullName: "Sara Nabil",
      phone: "+201044440004",
      serviceRequested: "Home physiotherapy session",
      budget: "1500 EGP",
      timeline: "within two days",
      location: "Heliopolis",
      status: "Hot",
      leadScore: 84,
      notes: "Home physiotherapy request for Heliopolis. Staff must confirm coverage and availability.",
      messages: [
        { direction: "inbound", text: "ممكن جلسة علاج طبيعي في البيت لوالدتي في مصر الجديدة خلال يومين؟" },
        { direction: "outbound", text: "أهلا أستاذة سارة. ممكن أسجل طلب زيارة منزلية للفريق لتأكيد التغطية والمتاح. ما رقم التواصل؟" },
        { direction: "inbound", text: "01044440004، الميزانية حوالي ١٥٠٠ جنيه." }
      ]
    },
    {
      id: "005",
      createdAtOffsetDays: 9,
      telegramUserId: "demo_physio_1005",
      telegramUsername: "@movewell_nour",
      fullName: "Nour Samir",
      phone: "+201044440005",
      serviceRequested: "Neck pain physiotherapy",
      budget: "",
      timeline: "next week",
      location: "Nasr City Branch",
      status: "Warm",
      leadScore: 67,
      notes: "Neck pain inquiry, interested but budget not shared.",
      followUpMessage: "أهلا أستاذة نور، هل ما زلت ترغبين في أن يتواصل معك فريق MoveWell بخصوص استشارة الرقبة في فرع مدينة نصر؟",
      messages: [
        { direction: "inbound", text: "عندي وجع في الرقبة من الشغل وعايزة أعرف تفاصيل الجلسات في مدينة نصر." },
        { direction: "outbound", text: "سلامتك. أقدر أسجل استفسارك للفريق بدون تشخيص أو نصيحة علاجية هنا. متى يناسبك التواصل؟" },
        { direction: "inbound", text: "الأسبوع الجاي مناسب، رقمي 01044440005." }
      ]
    },
    {
      id: "006",
      createdAtOffsetDays: 10,
      telegramUserId: "demo_physio_1006",
      telegramUsername: "@movewell_price",
      fullName: "",
      phone: "",
      serviceRequested: "Manual therapy inquiry",
      budget: "",
      timeline: "",
      location: "",
      status: "Warm",
      leadScore: 54,
      notes: "Price-only manual therapy inquiry. Needs service and branch clarification.",
      followUpMessage: "أهلا، هل تحب توضح الفرع أو نوع الاستشارة المطلوبة حتى يراجع فريق MoveWell التفاصيل معك؟",
      messages: [
        { direction: "inbound", text: "كام سعر جلسة المانيوال؟" },
        { direction: "outbound", text: "الأسعار النهائية يراجعها فريق الاستقبال حسب الخدمة والفرع. هل تبحث عن فرع مدينة نصر، المعادي، أم التجمع؟" },
        { direction: "inbound", text: "لسه بشوف الأسعار بس." }
      ]
    },
    {
      id: "007",
      createdAtOffsetDays: 11,
      telegramUserId: "demo_physio_1007",
      telegramUsername: "@movewell_mahmoud",
      fullName: "Mahmoud Tarek",
      phone: "+201044440007",
      serviceRequested: "Knee pain treatment",
      budget: "",
      timeline: "soon",
      location: "nearest branch",
      status: "Warm",
      leadScore: 63,
      notes: "Asked for nearest branch and knee pain intake. Branch preference still needs confirmation.",
      followUpMessage: "أهلا أستاذ محمود، هل تفضل فرع مدينة نصر، المعادي، أم التجمع حتى يوجه فريق MoveWell طلبك؟",
      messages: [
        { direction: "inbound", text: "عندي مشكلة في الركبة وعايز أعرف أقرب فرع ليكم." },
        { direction: "outbound", text: "سلامتك. لدينا فروع مدينة نصر والمعادي والتجمع. ما المنطقة الأقرب لك ورقم التواصل؟" },
        { direction: "inbound", text: "أنا قريب من التجمع، ورقمي 01044440007." }
      ]
    },
    {
      id: "008",
      createdAtOffsetDays: 13,
      telegramUserId: "demo_physio_1008",
      telegramUsername: "@movewell_laila",
      fullName: "Laila Mostafa",
      phone: "+201044440008",
      serviceRequested: "Shoulder rehabilitation",
      budget: "not sure yet",
      timeline: "tomorrow",
      location: "Maadi Branch",
      status: "Hot",
      leadScore: 82,
      notes: "Urgent shoulder rehab inquiry for tomorrow. Staff should confirm availability.",
      messages: [
        { direction: "inbound", text: "محتاجة أروح بكرة لكتفي في فرع المعادي، ينفع حد يكلمني؟" },
        { direction: "outbound", text: "سلامتك أستاذة ليلى. أقدر أنقل طلبك للفريق لتأكيد المتاح بدون تأكيد موعد الآن. ما رقمك؟" },
        { direction: "inbound", text: "01044440008، الميزانية لسه مش محددة." }
      ]
    },
    {
      id: "009",
      createdAtOffsetDays: 14,
      telegramUserId: "demo_physio_1009",
      telegramUsername: "@movewell_peds",
      fullName: "Dina Ashraf",
      phone: "+201044440009",
      serviceRequested: "Pediatric physiotherapy consultation",
      budget: "",
      timeline: "this month",
      location: "New Cairo Branch",
      status: "Warm",
      leadScore: 61,
      notes: "Pediatric consultation inquiry. Needs careful staff intake before any advice.",
      followUpMessage: "أهلا أستاذة دينا، هل ترغبين في أن يتواصل معك فريق MoveWell لتسجيل استشارة الأطفال في فرع التجمع؟",
      messages: [
        { direction: "inbound", text: "بسأل عن استشارة علاج طبيعي لطفل في فرع التجمع، ممكن التفاصيل؟" },
        { direction: "outbound", text: "أهلا أستاذة دينا. يمكن للفريق تسجيل بيانات الحالة وتوجيهك بدون تقديم نصيحة علاجية في المحادثة. ما رقم التواصل؟" },
        { direction: "inbound", text: "01044440009، غالبا هذا الشهر." }
      ]
    },
    {
      id: "010",
      createdAtOffsetDays: 6,
      telegramUserId: "demo_physio_1010",
      telegramUsername: "@movewell_vague",
      fullName: "",
      phone: "",
      serviceRequested: "",
      budget: "",
      timeline: "",
      location: "",
      status: "Cold",
      leadScore: 22,
      notes: "Vague inquiry without service, branch, timing, or contact details.",
      messages: [
        { direction: "inbound", text: "عايز اعرف التفاصيل" },
        { direction: "outbound", text: "أكيد. ما نوع استشارة العلاج الطبيعي التي تحتاجها، وأي فرع يناسبك: مدينة نصر، المعادي، أم التجمع؟" },
        { direction: "inbound", text: "لسه مش محدد." }
      ]
    }
  ];
}

function clearDemoData() {
  var clearedRows = 0;

  Object.keys(HEADERS).forEach(function (sheetName) {
    if (sheetName === "Settings") {
      return;
    }

    clearedRows += deleteDemoRows(sheetName);
  });

  return {
    cleared: true,
    deletedRows: clearedRows
  };
}

function deleteDemoRows(sheetName) {
  var sheet = ensureSheet(sheetName);
  var headers = ensureHeaders(sheet, HEADERS[sheetName]);
  var lastRow = sheet.getLastRow();
  var deletedRows = 0;

  if (lastRow < 2) {
    return 0;
  }

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  for (var index = values.length - 1; index >= 0; index -= 1) {
    var rowObject = rowToObject(headers, values[index]);
    if (isDemoRow(rowObject)) {
      sheet.deleteRow(index + 2);
      deletedRows += 1;
    }
  }

  return deletedRows;
}

function isDemoRow(rowObject) {
  return rowObject.isDemo === true || String(rowObject.isDemo).toLowerCase() === "true";
}

function getSheet(sheetName) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw userError(
      "No active spreadsheet found. Paste this script from Google Sheet -> Extensions -> Apps Script.",
      "NO_ACTIVE_SPREADSHEET"
    );
  }

  return spreadsheet.getSheetByName(sheetName);
}

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

  var lastColumn = Math.max(sheet.getLastColumn(), requiredHeaders.length);
  var headerValues = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });
  var headers = headerValues.filter(function (value) {
    return value;
  });

  requiredHeaders.forEach(function (header) {
    if (headers.indexOf(header) === -1) {
      headers.push(header);
    }
  });

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return headers;
}

function rowToObject(headers, row) {
  var objectValue = {};

  headers.forEach(function (header, index) {
    objectValue[header] = deserializeValue(row[index]);
  });

  return objectValue;
}

function objectToRow(headers, objectValue) {
  return headers.map(function (header) {
    return serializeValue(objectValue[header]);
  });
}

function findRowByColumn(sheet, headers, columnName, value) {
  var columnIndex = headers.indexOf(columnName);

  if (columnIndex === -1) {
    throw userError(
      "Missing column " + columnName + " in sheet " + sheet.getName() + ".",
      "MISSING_COLUMN"
    );
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return -1;
  }

  var values = sheet.getRange(2, columnIndex + 1, lastRow - 1, 1).getValues();

  for (var rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][0]) === String(value)) {
      return rowIndex + 2;
    }
  }

  return -1;
}

function upsertByKey(sheetName, keyField, objectValue) {
  if (!objectValue) {
    throw userError("Missing payload object for " + sheetName + ".", "MISSING_PAYLOAD");
  }

  if (!objectValue[keyField]) {
    throw userError(
      "Missing required key " + keyField + " for " + sheetName + ".",
      "MISSING_KEY"
    );
  }

  var sheet = ensureSheet(sheetName);
  var headers = ensureHeaders(sheet, HEADERS[sheetName]);
  var row = objectToRow(headers, objectValue);
  var rowNumber = findRowByColumn(sheet, headers, keyField, objectValue[keyField]);

  if (rowNumber > 0) {
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return rowToObject(headers, row);
}

function parseJsonBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw userError("Missing JSON request body.", "MISSING_BODY");
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw userError("Request body must be valid JSON.", "INVALID_JSON");
  }
}

function serializeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

function deserializeValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function userError(message, code) {
  var error = new Error(message);
  error.code = code || "ERROR";
  return error;
}
