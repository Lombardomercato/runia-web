/**
 * Agregar este bloque al Apps Script actual, sin modificar el doPost(e).
 *
 * Requisitos del script existente:
 * - Debe existir la constante SHEETS.brief.
 * - SHEETS.brief debe apuntar a la hoja "Briefs Postventa".
 *
 * El panel admin consume:
 *   WEB_APP_URL?action=listBriefs&token=TOKEN
 *   WEB_APP_URL?action=updateBriefStatus&token=TOKEN&id=BRIEF_ID&estado=NUEVO_ESTADO
 */

const ADMIN_API_TOKEN = "runia_admin_2026";
const CRM_SHEET_NAME = "CRM Leads";
const BUDGETS_SHEET_NAME = "Presupuestos";
const BUDGET_STATES = ["Borrador", "Enviado", "Aprobado", "Rechazado", "En produccion"];
const PROJECTS_SHEET_NAME = "Proyectos";
const PROJECT_STATES = ["Pendiente de inicio", "En produccion", "En revision", "Entregado", "Pausado"];
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || "";
    const token = params.token || "";

    if (token !== ADMIN_API_TOKEN) {
      return jsonResponse({
        success: false,
        error: "Unauthorized"
      });
    }

    if (action === "listBriefs" || action === "") {
      return jsonResponse({
        success: true,
        briefs: listBriefsForAdmin_()
      });
    }

    if (action === "listCrmLeads") {
      return jsonResponse({
        success: true,
        leads: listCrmLeadsForAdmin_()
      });
    }

    if (action === "createCrmLead") {
      return createCrmLeadForAdmin_(params);
    }

    if (action === "updateCrmLeadStatus") {
      return updateCrmLeadStatusForAdmin_(params);
    }

    if (action === "updateBriefStatus") {
      return updateBriefStatusForAdmin_(params);
    }

    if (action === "addCrmLeadNote") {
      return addCrmLeadNoteForAdmin_(params);
    }

    if (action === "createBudget") {
      return createBudgetForAdmin_(params);
    }

    if (action === "listBudgets") {
      return jsonResponse({
        success: true,
        budgets: listBudgetsForAdmin_()
      });
    }

    if (action === "listBudgetsByLead") {
      return jsonResponse({
        success: true,
        budgets: listBudgetsByLeadForAdmin_(params.lead_id || params.id || "")
      });
    }

    if (action === "updateBudgetStatus") {
      return updateBudgetStatusForAdmin_(params);
    }

    if (action === "getCrmLeadById") {
      return jsonResponse({
        success: true,
        lead: getCrmLeadByIdForAdmin_(params.id || params.lead_id || "")
      });
    }

    if (action === "getBudgetById") {
      return jsonResponse({
        success: true,
        budget: getBudgetByIdForAdmin_(params.budget_id || params.id || "")
      });
    }

    if (action === "updateCrmLeadBriefStatus") {
      return updateCrmLeadBriefStatusForAdmin_(params);
    }

    if (action === "createProjectFromBrief") {
      return createProjectFromBriefForAdmin_(params);
    }

    if (action === "listProjects") {
      return jsonResponse({
        success: true,
        projects: listProjectsForAdmin_()
      });
    }

    if (action === "updateProjectStatus") {
      return updateProjectStatusForAdmin_(params);
    }

    if (action === "updateProjectFields") {
      return updateProjectFieldsForAdmin_(params);
    }

    return jsonResponse({
      success: false,
      error: "Invalid action"
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

function updateBriefStatusForAdmin_(params) {
  const id = params.id || "";
  const estado = params.estado || "";

  if (!id) {
    return jsonResponse({
      success: false,
      error: "Falta id"
    });
  }

  if (!estado) {
    return jsonResponse({
      success: false,
      error: "Falta estado"
    });
  }

  const sheet = getBriefSheetForAdmin_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return jsonResponse({
      success: false,
      error: "Brief no encontrado"
    });
  }

  const headers = values[0].map(function(header) {
    return String(header || "").trim();
  });
  const idColumnIndex = findHeaderIndex_(headers, ["id", "ID", "uuid", "timestamp", "fecha"]);

  if (idColumnIndex < 0) {
    return jsonResponse({
      success: false,
      error: "No existe columna id/fecha para buscar brief"
    });
  }

  let rowIndex = findBriefRowIndex_(values, idColumnIndex, id);
  if (rowIndex < 0) {
    const fallbackMatch = String(id || "").match(/^brief-(\d+)$/);
    if (fallbackMatch) {
      const fallbackRowIndex = Number(fallbackMatch[1]);
      if (fallbackRowIndex > 0 && fallbackRowIndex < values.length) rowIndex = fallbackRowIndex;
    }
  }
  if (rowIndex < 0) {
    return jsonResponse({
      success: false,
      error: "Brief no encontrado"
    });
  }

  const statusColumnIndex = ensureHeaderColumn_(sheet, headers, "estado");
  const updatedAtColumnIndex = ensureHeaderColumn_(sheet, headers, "updated_at");

  sheet.getRange(rowIndex + 1, statusColumnIndex + 1).setValue(estado);
  sheet.getRange(rowIndex + 1, updatedAtColumnIndex + 1).setValue(new Date());

  return jsonResponse({
    success: true,
    message: "Estado actualizado"
  });
}

function listBriefsForAdmin_() {
  const sheet = getBriefSheetForAdmin_();
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  const headers = values[0].map(function(header) {
    return String(header || "").trim();
  });

  return values
    .map(function(row, rowIndex) {
      return { row: row, rowIndex: rowIndex };
    })
    .slice(1)
    .filter(function(item) {
      return item.row.some(function(cell) {
        return String(cell || "").trim() !== "";
      });
    })
    .map(function(item) {
      const brief = {};

      headers.forEach(function(header, columnIndex) {
        if (!header) return;
        brief[header] = normalizeAdminCell_(item.row[columnIndex]);
      });

      brief.id = getFirstAdminValue_(brief, ["id", "ID", "uuid", "timestamp", "fecha"]) || "brief-" + item.rowIndex;
      brief.fecha = getFirstAdminValue_(brief, ["fecha", "date", "createdAt", "timestamp"]) || "";
      brief.empresa = getFirstAdminValue_(brief, ["empresa", "business", "negocio", "Nombre del negocio"]) || "";
      brief.cliente = getFirstAdminValue_(brief, ["cliente", "nombre", "contactName", "name"]) || "";
      brief.rubro = getFirstAdminValue_(brief, ["rubro", "industry", "Rubro"]) || "";
      brief.whatsapp = getFirstAdminValue_(brief, ["whatsapp", "WhatsApp"]) || "";
      brief.email = getFirstAdminValue_(brief, ["email", "Email"]) || "";
      brief.estado = getFirstAdminValue_(brief, ["estado", "status", "Estado"]) || "Nuevo";

      return brief;
    });
}

function getBriefSheetForAdmin_() {
  if (typeof SHEETS === "undefined" || !SHEETS.brief) {
    throw new Error("No existe SHEETS.brief en el Apps Script actual");
  }

  const spreadsheet = getSpreadsheetForAdmin_();
  const sheet = spreadsheet.getSheetByName(SHEETS.brief);

  if (!sheet) {
    throw new Error('No existe la hoja "' + SHEETS.brief + '"');
  }

  return sheet;
}

function getCrmSheetForAdmin_() {
  const spreadsheet = getSpreadsheetForAdmin_();
  let sheet = spreadsheet.getSheetByName(CRM_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CRM_SHEET_NAME);
    sheet.appendRow(["id", "fecha", "nombre", "empresa", "whatsapp", "email", "origen", "valor_estimado", "notas", "estado", "created_at", "updated_at"]);
  }

  ensureCrmHeaders_(sheet);
  return sheet;
}

function ensureCrmHeaders_(sheet) {
  const required = ["id", "fecha", "nombre", "empresa", "whatsapp", "email", "origen", "valor_estimado", "notas", "estado", "created_at", "updated_at", "source_ids"];
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    return;
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(header) {
    return String(header || "").trim();
  });

  if (!headers.some(function(header) { return header !== ""; })) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    return;
  }

  required.forEach(function(header) {
    ensureHeaderColumn_(sheet, headers, header);
  });
}

function listCrmLeadsForAdmin_() {
  syncCotizadorLeadsToCrm_();

  const sheet = getCrmSheetForAdmin_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(function(header) {
    return String(header || "").trim();
  });

  return values.slice(1).filter(function(row) {
    return row.some(function(cell) {
      return String(cell || "").trim() !== "";
    });
  }).map(function(row) {
    const lead = {};
    headers.forEach(function(header, columnIndex) {
      if (!header) return;
      lead[header] = normalizeAdminCell_(row[columnIndex]);
    });
    if (!lead.estado) lead.estado = "Nuevo";
    return lead;
  });
}

function syncCotizadorLeadsToCrm_() {
  const spreadsheet = getSpreadsheetForAdmin_();
  const sourceSheet = spreadsheet.getSheetByName(getCotizadorSheetNameForAdmin_());
  if (!sourceSheet) return;

  const sourceValues = sourceSheet.getDataRange().getValues();
  if (sourceValues.length < 2) return;

  const sourceHeaders = sourceValues[0].map(function(header) {
    return String(header || "").trim();
  });

  sourceValues.slice(1).filter(function(row) {
    return row.some(function(cell) {
      return String(cell || "").trim() !== "";
    });
  }).forEach(function(row, index) {
    const lead = {};
    sourceHeaders.forEach(function(header, columnIndex) {
      if (!header) return;
      lead[header] = normalizeAdminCell_(row[columnIndex]);
    });

    const sourceId = getFirstAdminValue_(lead, ["id", "ID", "uuid", "timestamp", "fecha"]) || "row-" + (index + 2);
    const now = new Date();
    upsertCrmLeadForAdmin_({
      lead_id: getFirstAdminValue_(lead, ["lead_id", "leadId", "crm_lead_id", "crmLeadId"]) || "",
      fecha: getFirstAdminValue_(lead, ["fecha", "date", "createdAt", "timestamp"]) || now,
      nombre: getFirstAdminValue_(lead, ["nombre", "name", "cliente"]) || "",
      empresa: getFirstAdminValue_(lead, ["empresa", "business", "negocio"]) || "",
      whatsapp: getFirstAdminValue_(lead, ["whatsapp", "WhatsApp"]) || "",
      email: getFirstAdminValue_(lead, ["email", "Email"]) || "",
      origen: getFirstAdminValue_(lead, ["origen", "origin"]) || "Cotizador",
      valor_estimado: getFirstAdminValue_(lead, ["precio", "valor_estimado", "presupuesto_generado"]) || "",
      notas: getFirstAdminValue_(lead, ["mensaje", "seguimiento", "notas"]) || "",
      estado: "Nuevo",
      source_id: "cotizador-" + sourceId,
      trace_note: "[" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd") + "] Nueva cotizacion asociada desde cotizador."
    });
  });
}

function upsertCrmLeadForAdmin_(lead) {
  const sheet = getCrmSheetForAdmin_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(header) {
    return String(header || "").trim();
  });
  const now = new Date();
  const incomingId = getFirstAdminValue_(lead, ["lead_id", "leadId", "id", "ID"]);
  const incomingPhone = normalizePhone(lead.whatsapp || lead.WhatsApp || "");
  const incomingEmail = normalizeEmail(lead.email || lead.Email || "");
  const incomingCompany = normalizeCompany(lead.empresa || lead.company || lead.business || "");
  const sourceId = String(lead.source_id || "").trim();
  const match = findCrmLeadMatchForAdmin_(values, headers, {
    id: incomingId,
    phone: incomingPhone,
    email: incomingEmail,
    company: incomingCompany
  });

  if (match) {
    const rowIndex = match.rowIndex;
    const current = rowToObjectForAdmin_(headers, values[rowIndex]);
    const nextSourceIds = mergeSourceIdsForAdmin_(current.source_ids, sourceId);
    const sourceAlreadySynced = sourceId && String(current.source_ids || "").split(/[|,\n]/).map(function(item) {
      return String(item || "").trim();
    }).indexOf(sourceId) >= 0;

    updateCrmCellForAdmin_(sheet, headers, rowIndex, "id", current.id || incomingId || createLeadIdForAdmin_());
    updateMissingCrmCellForAdmin_(sheet, headers, values[rowIndex], rowIndex, "fecha", lead.fecha || now);
    updateMissingCrmCellForAdmin_(sheet, headers, values[rowIndex], rowIndex, "nombre", lead.nombre || lead.name || "");
    updateMissingCrmCellForAdmin_(sheet, headers, values[rowIndex], rowIndex, "empresa", lead.empresa || lead.company || lead.business || "");
    updateMissingCrmCellForAdmin_(sheet, headers, values[rowIndex], rowIndex, "whatsapp", lead.whatsapp || lead.WhatsApp || "");
    updateMissingCrmCellForAdmin_(sheet, headers, values[rowIndex], rowIndex, "email", lead.email || lead.Email || "");
    updateMissingCrmCellForAdmin_(sheet, headers, values[rowIndex], rowIndex, "origen", lead.origen || lead.origin || "Otro");

    if (String(lead.valor_estimado || "").trim()) {
      updateCrmCellForAdmin_(sheet, headers, rowIndex, "valor_estimado", lead.valor_estimado);
    }

    updateCrmCellForAdmin_(sheet, headers, rowIndex, "estado", mergeCrmStatusForAdmin_(current.estado, lead.estado));
    updateCrmCellForAdmin_(sheet, headers, rowIndex, "source_ids", nextSourceIds);
    updateCrmCellForAdmin_(sheet, headers, rowIndex, "updated_at", now);

    const nextNotes = mergeCrmNotesForAdmin_(current.notas, lead.notas, lead.trace_note, sourceAlreadySynced);
    if (nextNotes !== String(current.notas || "")) {
      updateCrmCellForAdmin_(sheet, headers, rowIndex, "notas", nextNotes);
    }

    return {
      success: true,
      created: false,
      lead_id: current.id || incomingId,
      message: "Lead actualizado"
    };
  }

  const leadId = incomingId || createLeadIdForAdmin_();
  const initialNotes = mergeCrmNotesForAdmin_("", lead.notas, lead.trace_note, false);
  const rowObject = {
    id: leadId,
    fecha: lead.fecha || now,
    nombre: lead.nombre || lead.name || "",
    empresa: lead.empresa || lead.company || lead.business || "",
    whatsapp: lead.whatsapp || lead.WhatsApp || "",
    email: lead.email || lead.Email || "",
    origen: lead.origen || lead.origin || "Otro",
    valor_estimado: lead.valor_estimado || "",
    notas: initialNotes,
    estado: lead.estado || "Nuevo",
    created_at: now,
    updated_at: now,
    source_ids: sourceId
  };

  sheet.appendRow(headers.map(function(header) {
    return rowObject[header] !== undefined ? rowObject[header] : "";
  }));

  return {
    success: true,
    created: true,
    lead_id: leadId,
    message: "Lead creado"
  };
}

function findCrmLeadMatchForAdmin_(values, headers, identity) {
  const idIndex = headers.indexOf("id");
  const phoneIndex = headers.indexOf("whatsapp");
  const emailIndex = headers.indexOf("email");
  const companyIndex = headers.indexOf("empresa");

  if (identity.id && idIndex >= 0) {
    for (var idRow = 1; idRow < values.length; idRow += 1) {
      if (String(values[idRow][idIndex] || "") === String(identity.id)) return { rowIndex: idRow, reason: "id" };
    }
  }

  if (identity.phone && phoneIndex >= 0) {
    for (var phoneRow = 1; phoneRow < values.length; phoneRow += 1) {
      if (normalizePhone(values[phoneRow][phoneIndex]) === identity.phone) return { rowIndex: phoneRow, reason: "whatsapp" };
    }
  }

  if (identity.email && emailIndex >= 0) {
    for (var emailRow = 1; emailRow < values.length; emailRow += 1) {
      if (normalizeEmail(values[emailRow][emailIndex]) === identity.email) return { rowIndex: emailRow, reason: "email" };
    }
  }

  if (identity.company && companyIndex >= 0) {
    for (var companyRow = 1; companyRow < values.length; companyRow += 1) {
      if (normalizeCompany(values[companyRow][companyIndex]) === identity.company) return { rowIndex: companyRow, reason: "empresa" };
    }
  }

  return null;
}

function normalizePhone(value) {
  var digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  digits = digits.replace(/^00/, "");
  if (digits.length > 10 && digits.indexOf("54") === 0) digits = digits.slice(2);
  if (digits.length > 10 && digits.charAt(0) === "9") digits = digits.slice(1);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCompany(value) {
  var text = String(value || "").trim().toLowerCase();
  try {
    text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch (error) {}
  return text
    .replace(/\b(s\.?a\.?|srl|s\.r\.l\.|sas|s\.a\.s\.)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function rowToObjectForAdmin_(headers, row) {
  const object = {};
  headers.forEach(function(header, index) {
    if (!header) return;
    object[header] = normalizeAdminCell_(row[index]);
  });
  return object;
}

function createLeadIdForAdmin_() {
  return "lead-" + new Date().getTime() + "-" + Math.floor(Math.random() * 100000);
}

function updateCrmCellForAdmin_(sheet, headers, rowIndex, header, value) {
  const columnIndex = ensureHeaderColumn_(sheet, headers, header);
  sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(value);
}

function updateMissingCrmCellForAdmin_(sheet, headers, row, rowIndex, header, value) {
  if (value === null || value === undefined || String(value).trim() === "") return;
  const columnIndex = ensureHeaderColumn_(sheet, headers, header);
  if (String(row[columnIndex] || "").trim() !== "") return;
  sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(value);
  row[columnIndex] = value;
}

function mergeCrmStatusForAdmin_(currentStatus, nextStatus) {
  const current = String(currentStatus || "").trim();
  const next = String(nextStatus || "").trim();
  if (!current) return next || "Nuevo";
  if (!next || next === "Nuevo") return current;
  if (current === "Nuevo") return next;
  return current;
}

function mergeSourceIdsForAdmin_(currentSourceIds, sourceId) {
  const list = String(currentSourceIds || "").split(/[|,\n]/).map(function(item) {
    return String(item || "").trim();
  }).filter(Boolean);
  if (sourceId && list.indexOf(sourceId) < 0) list.push(sourceId);
  return list.join("|");
}

function mergeCrmNotesForAdmin_(currentNotes, incomingNotes, traceNote, sourceAlreadySynced) {
  const notes = String(currentNotes || "");
  const additions = [];
  const incoming = String(incomingNotes || "").trim();
  const trace = String(traceNote || "").trim();

  if (!sourceAlreadySynced && incoming && notes.indexOf(incoming) < 0) additions.push(incoming);
  if (!sourceAlreadySynced && trace && notes.indexOf(trace) < 0) additions.push(trace);
  if (!additions.length) return notes;
  return notes ? notes + "\n" + additions.join("\n") : additions.join("\n");
}

function getCotizadorSheetNameForAdmin_() {
  try {
    if (typeof SHEETS !== "undefined" && SHEETS.cotizador) {
      return SHEETS.cotizador;
    }
  } catch (error) {
    return "Leads Cotizador";
  }

  return "Leads Cotizador";
}

function createCrmLeadForAdmin_(params) {
  const result = upsertCrmLeadForAdmin_({
    lead_id: params.lead_id || params.id || "",
    fecha: params.fecha || new Date(),
    nombre: params.nombre || "",
    empresa: params.empresa || "",
    whatsapp: params.whatsapp || "",
    email: params.email || "",
    origen: params.origen || "Otro",
    valor_estimado: params.valor_estimado || "",
    notas: params.notas || "",
    estado: params.estado || "Nuevo"
  });

  return jsonResponse({
    success: true,
    message: result.message,
    created: result.created,
    lead: {
      id: result.lead_id,
      estado: params.estado || "Nuevo"
    }
  });
}

function updateCrmLeadStatusForAdmin_(params) {
  const id = params.id || "";
  const estado = params.estado || "";
  if (!id || !estado) {
    return jsonResponse({ success: false, error: "Falta id o estado" });
  }

  const crm = findCrmLeadRow_(id);
  if (!crm) {
    return jsonResponse({ success: false, error: "Lead no encontrado" });
  }

  const statusColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "estado");
  const updatedAtColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "updated_at");
  crm.sheet.getRange(crm.rowIndex + 1, statusColumnIndex + 1).setValue(estado);
  crm.sheet.getRange(crm.rowIndex + 1, updatedAtColumnIndex + 1).setValue(new Date());

  return jsonResponse({
    success: true,
    message: "Estado actualizado"
  });
}

function addCrmLeadNoteForAdmin_(params) {
  const id = params.id || "";
  const nota = params.nota || "";
  if (!id || !nota) {
    return jsonResponse({ success: false, error: "Falta id o nota" });
  }

  const crm = findCrmLeadRow_(id);
  if (!crm) {
    return jsonResponse({ success: false, error: "Lead no encontrado" });
  }

  const notesColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "notas");
  const updatedAtColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "updated_at");
  const currentNotes = String(crm.values[crm.rowIndex][notesColumnIndex] || "");
  const nextNotes = currentNotes ? currentNotes + "\n" + new Date().toISOString() + " - " + nota : new Date().toISOString() + " - " + nota;
  crm.sheet.getRange(crm.rowIndex + 1, notesColumnIndex + 1).setValue(nextNotes);
  crm.sheet.getRange(crm.rowIndex + 1, updatedAtColumnIndex + 1).setValue(new Date());

  return jsonResponse({
    success: true,
    message: "Nota agregada"
  });
}

function findCrmLeadRow_(id) {
  const sheet = getCrmSheetForAdmin_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(header) {
    return String(header || "").trim();
  });
  const idColumnIndex = headers.indexOf("id");
  if (idColumnIndex < 0) return null;
  const rowIndex = findBriefRowIndex_(values, idColumnIndex, id);
  if (rowIndex < 0) return null;
  return { sheet: sheet, values: values, headers: headers, rowIndex: rowIndex };
}

function getCrmLeadByIdForAdmin_(id) {
  const leadId = String(id || "").trim();
  if (!leadId) return null;
  const crm = findCrmLeadRow_(leadId);
  if (!crm) return null;
  const lead = rowToObjectForAdmin_(crm.headers, crm.values[crm.rowIndex]);
  if (!lead.estado) lead.estado = "Nuevo";
  return lead;
}

function getBudgetByIdForAdmin_(id) {
  const budgetId = String(id || "").trim();
  if (!budgetId) return null;
  const budget = findBudgetByIdForAdmin_(budgetId);
  return budget ? budget.budget : null;
}

function updateCrmLeadBriefStatusForAdmin_(params) {
  const leadId = params.id || params.lead_id || "";
  const budgetId = params.budget_id || "";
  const status = params.brief_status || params.status || "enviado";
  const referencia = params.referencia || params.referencia_presupuesto || "";
  const note = params.nota || buildBriefTraceNoteForAdmin_(status, referencia, budgetId);

  if (!leadId) {
    return jsonResponse({ success: false, error: "Falta lead_id" });
  }

  const crm = findCrmLeadRow_(leadId);
  if (!crm) {
    return jsonResponse({ success: false, error: "Lead no encontrado" });
  }

  const briefStatusColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "brief_status");
  const briefBudgetColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "brief_budget_id");
  const briefUpdatedColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "brief_updated_at");
  const updatedAtColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "updated_at");
  const notesColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "notas");
  const currentNotes = String(crm.values[crm.rowIndex][notesColumnIndex] || "");
  const nextNotes = note && currentNotes.indexOf(note) < 0
    ? currentNotes ? currentNotes + "\n" + new Date().toISOString() + " - " + note : new Date().toISOString() + " - " + note
    : currentNotes;

  crm.sheet.getRange(crm.rowIndex + 1, briefStatusColumnIndex + 1).setValue(status);
  crm.sheet.getRange(crm.rowIndex + 1, briefBudgetColumnIndex + 1).setValue(budgetId);
  crm.sheet.getRange(crm.rowIndex + 1, briefUpdatedColumnIndex + 1).setValue(new Date());
  crm.sheet.getRange(crm.rowIndex + 1, updatedAtColumnIndex + 1).setValue(new Date());
  if (nextNotes !== currentNotes) {
    crm.sheet.getRange(crm.rowIndex + 1, notesColumnIndex + 1).setValue(nextNotes);
  }

  return jsonResponse({
    success: true,
    message: "Estado de brief actualizado"
  });
}

function buildBriefTraceNoteForAdmin_(status, referencia, budgetId) {
  if (status === "recibido") {
    return "Brief recibido" + (referencia ? " para presupuesto " + referencia : budgetId ? " para presupuesto " + budgetId : "") + ".";
  }
  return "Brief enviado al cliente" + (referencia ? " con presupuesto " + referencia : budgetId ? " con presupuesto " + budgetId : "") + ".";
}

function getBudgetSheetForAdmin_() {
  const spreadsheet = getSpreadsheetForAdmin_();
  let sheet = spreadsheet.getSheetByName(BUDGETS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(BUDGETS_SHEET_NAME);
    sheet.appendRow(getBudgetHeadersForAdmin_());
  }

  ensureBudgetHeaders_(sheet);
  return sheet;
}

function getBudgetHeadersForAdmin_() {
  return [
    "budget_id",
    "lead_id",
    "referencia",
    "created_at",
    "updated_at",
    "modo",
    "cliente",
    "empresa",
    "rubro",
    "vendedor_partner",
    "partner_name",
    "partner_code",
    "marca_pdf",
    "plan",
    "total_inicial",
    "total_mensual",
    "precio_partner",
    "margen_partner",
    "estado",
    "share_url",
    "payload_json"
  ];
}

function ensureBudgetHeaders_(sheet) {
  const required = getBudgetHeadersForAdmin_();
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    return;
  }

  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(function(header) {
    return String(header || "").trim();
  });

  if (!headers.some(function(header) { return header !== ""; })) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    return;
  }

  required.forEach(function(header) {
    ensureHeaderColumn_(sheet, headers, header);
  });
}

function createBudgetForAdmin_(params) {
  const payload = parseBudgetPayloadForAdmin_(params);
  const now = new Date();
  const budgetId = getFirstAdminValue_(payload, ["budget_id", "budgetId"]) || createBudgetIdForAdmin_();
  const totalInicial = getFirstAdminValue_(payload, ["total_inicial", "inversion_inicial_usd", "total", "precio_base_usd"]);
  const traceNote = "[" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd") + "] Presupuesto asociado: " + budgetId + ".";

  const leadResult = upsertCrmLeadForAdmin_({
    lead_id: getFirstAdminValue_(payload, ["lead_id", "leadId", "crm_lead_id"]),
    fecha: getFirstAdminValue_(payload, ["timestamp", "created_at", "fecha_presupuesto"]) || now,
    nombre: getFirstAdminValue_(payload, ["cliente", "nombre", "client"]),
    empresa: getFirstAdminValue_(payload, ["empresa", "company"]),
    whatsapp: getFirstAdminValue_(payload, ["whatsapp", "WhatsApp"]),
    email: getFirstAdminValue_(payload, ["email", "Email"]),
    origen: getFirstAdminValue_(payload, ["origen"]) || "Presupuestador",
    valor_estimado: totalInicial,
    notas: getFirstAdminValue_(payload, ["notas", "observaciones"]),
    estado: "Nuevo",
    source_id: "budget-" + budgetId,
    trace_note: traceNote
  });

  const leadId = leadResult.lead_id || getFirstAdminValue_(payload, ["lead_id", "leadId"]);
  payload.budget_id = budgetId;
  payload.lead_id = leadId;

  const sheet = getBudgetSheetForAdmin_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(header) {
    return String(header || "").trim();
  });
  const rowIndex = findBudgetRowIndex_(values, headers, budgetId);
  const rowObject = buildBudgetRowForAdmin_(payload, budgetId, leadId, now, rowIndex >= 0 ? values[rowIndex] : null, headers);

  if (rowIndex >= 0) {
    headers.forEach(function(header, index) {
      if (!header) return;
      const value = rowObject[header] !== undefined ? rowObject[header] : "";
      sheet.getRange(rowIndex + 1, index + 1).setValue(value);
    });
  } else {
    sheet.appendRow(headers.map(function(header) {
      return rowObject[header] !== undefined ? rowObject[header] : "";
    }));
  }

  return jsonResponse({
    success: true,
    message: rowIndex >= 0 ? "Presupuesto actualizado" : "Presupuesto creado",
    budget_id: budgetId,
    lead_id: leadId,
    updated: rowIndex >= 0
  });
}

function listBudgetsForAdmin_() {
  const sheet = getBudgetSheetForAdmin_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(function(header) {
    return String(header || "").trim();
  });

  return values.slice(1).filter(function(row) {
    return row.some(function(cell) {
      return String(cell || "").trim() !== "";
    });
  }).map(function(row) {
    const budget = rowToObjectForAdmin_(headers, row);
    if (!budget.estado) budget.estado = "Borrador";
    return budget;
  });
}

function listBudgetsByLeadForAdmin_(leadId) {
  const id = String(leadId || "").trim();
  if (!id) return [];
  return listBudgetsForAdmin_().filter(function(budget) {
    return String(budget.lead_id || "") === id;
  });
}

function updateBudgetStatusForAdmin_(params) {
  const budgetId = params.budget_id || params.id || "";
  const estado = params.estado || "";
  if (!budgetId || !estado) {
    return jsonResponse({ success: false, error: "Falta budget_id o estado" });
  }

  const sheet = getBudgetSheetForAdmin_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(header) {
    return String(header || "").trim();
  });
  const rowIndex = findBudgetRowIndex_(values, headers, budgetId);
  if (rowIndex < 0) {
    return jsonResponse({ success: false, error: "Presupuesto no encontrado" });
  }

  const statusColumnIndex = ensureHeaderColumn_(sheet, headers, "estado");
  const updatedAtColumnIndex = ensureHeaderColumn_(sheet, headers, "updated_at");
  sheet.getRange(rowIndex + 1, statusColumnIndex + 1).setValue(estado);
  sheet.getRange(rowIndex + 1, updatedAtColumnIndex + 1).setValue(new Date());

  return jsonResponse({ success: true, message: "Estado de presupuesto actualizado" });
}

function parseBudgetPayloadForAdmin_(params) {
  let payload = {};
  const rawPayload = params.payload_json || params.payload || "";
  if (rawPayload) {
    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      payload = {};
    }
  }

  Object.keys(params || {}).forEach(function(key) {
    if (key === "token" || key === "action" || key === "payload_json" || key === "payload") return;
    payload[key] = params[key];
  });

  return payload;
}

function buildBudgetRowForAdmin_(payload, budgetId, leadId, now, currentRow, headers) {
  const current = currentRow ? rowToObjectForAdmin_(headers, currentRow) : {};
  const createdAt = current.created_at || getFirstAdminValue_(payload, ["created_at", "timestamp"]) || now;
  const estado = getFirstAdminValue_(payload, ["estado", "budget_status", "estado_budget"]) || current.estado || "Borrador";
  const safePayloadJson = JSON.stringify(payload);

  return {
    budget_id: budgetId,
    lead_id: leadId,
    referencia: getFirstAdminValue_(payload, ["referencia", "reference"]),
    created_at: createdAt,
    updated_at: now,
    modo: getFirstAdminValue_(payload, ["modo", "budgetMode"]),
    cliente: getFirstAdminValue_(payload, ["cliente", "client", "nombre"]),
    empresa: getFirstAdminValue_(payload, ["empresa", "company"]),
    rubro: getFirstAdminValue_(payload, ["rubro", "industry"]),
    vendedor_partner: getFirstAdminValue_(payload, ["vendedor_partner", "seller"]),
    partner_name: getFirstAdminValue_(payload, ["partner_name", "partnerName"]),
    partner_code: getFirstAdminValue_(payload, ["partner_code", "partnerCode"]),
    marca_pdf: getFirstAdminValue_(payload, ["marca_pdf", "brandName"]),
    plan: getFirstAdminValue_(payload, ["plan", "webType"]),
    total_inicial: getFirstAdminValue_(payload, ["total_inicial", "inversion_inicial_usd", "total"]),
    total_mensual: getFirstAdminValue_(payload, ["total_mensual", "mensual_usd", "monthlyTotal"]),
    precio_partner: getFirstAdminValue_(payload, ["precio_partner", "precio_partner_usd", "internalCost"]),
    margen_partner: getFirstAdminValue_(payload, ["margen_partner", "margen_partner_usd", "margin"]),
    estado: estado,
    share_url: getFirstAdminValue_(payload, ["share_url", "shareUrl"]),
    payload_json: safePayloadJson
  };
}

function findBudgetByIdForAdmin_(budgetId) {
  const sheet = getBudgetSheetForAdmin_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0].map(function(header) {
    return String(header || "").trim();
  });
  const rowIndex = findBudgetRowIndex_(values, headers, budgetId);
  if (rowIndex < 0) return null;
  return {
    sheet: sheet,
    values: values,
    headers: headers,
    rowIndex: rowIndex,
    budget: rowToObjectForAdmin_(headers, values[rowIndex])
  };
}

function findBudgetRowIndex_(values, headers, budgetId) {
  const idColumnIndex = headers.indexOf("budget_id");
  if (idColumnIndex < 0) return -1;
  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][idColumnIndex] || "") === String(budgetId)) return rowIndex;
  }
  return -1;
}

function createBudgetIdForAdmin_() {
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  return "budget-" + date + "-" + Math.floor(Math.random() * 1000000).toString(36);
}

function getProjectSheetForAdmin_() {
  const spreadsheet = getSpreadsheetForAdmin_();
  let sheet = spreadsheet.getSheetByName(PROJECTS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(PROJECTS_SHEET_NAME);
    sheet.appendRow(getProjectHeadersForAdmin_());
  }

  ensureProjectHeaders_(sheet);
  return sheet;
}

function getProjectHeadersForAdmin_() {
  return [
    "project_id",
    "lead_id",
    "budget_id",
    "brief_id",
    "referencia_presupuesto",
    "cliente",
    "empresa",
    "rubro",
    "tipo_proyecto",
    "estado_produccion",
    "responsable",
    "prioridad",
    "fecha_inicio",
    "fecha_entrega_estimada",
    "created_at",
    "updated_at",
    "payload_json"
  ];
}

function ensureProjectHeaders_(sheet) {
  const required = getProjectHeadersForAdmin_();
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    return;
  }

  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(function(header) {
    return String(header || "").trim();
  });

  if (!headers.some(function(header) { return header !== ""; })) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    return;
  }

  required.forEach(function(header) {
    ensureHeaderColumn_(sheet, headers, header);
  });
}

function createProjectFromBriefForAdmin_(params) {
  const requestedBriefId = params.brief_id || params.id || "";
  const found = findBriefForProject_(requestedBriefId);
  if (!found) {
    return jsonResponse({ success: false, error: "Brief no encontrado" });
  }

  const briefData = buildProjectDataFromBrief_(found.brief, found.briefId);
  const projectSheet = getProjectSheetForAdmin_();
  const values = projectSheet.getDataRange().getValues();
  const headers = values[0].map(function(header) { return String(header || "").trim(); });
  const existing = findProjectByBriefId_(values, headers, briefData.brief_id);

  if (existing) {
    const project = rowToObjectForAdmin_(headers, values[existing.rowIndex]);
    return jsonResponse({
      success: true,
      message: "Proyecto existente",
      created: false,
      project: project,
      project_id: project.project_id
    });
  }

  const now = new Date();
  const projectId = createProjectIdForAdmin_();
  const project = {
    project_id: projectId,
    lead_id: briefData.lead_id,
    budget_id: briefData.budget_id,
    brief_id: briefData.brief_id,
    referencia_presupuesto: briefData.referencia_presupuesto,
    cliente: briefData.cliente,
    empresa: briefData.empresa,
    rubro: briefData.rubro,
    tipo_proyecto: briefData.tipo_proyecto,
    estado_produccion: "Pendiente de inicio",
    responsable: params.responsable || "",
    prioridad: params.prioridad || "Normal",
    fecha_inicio: params.fecha_inicio || "",
    fecha_entrega_estimada: params.fecha_entrega_estimada || "",
    created_at: now,
    updated_at: now,
    payload_json: JSON.stringify(briefData.payload)
  };

  projectSheet.appendRow(headers.map(function(header) {
    return project[header] !== undefined ? project[header] : "";
  }));

  if (project.lead_id) {
    updateCrmLeadProductionStatusForAdmin_(project.lead_id, project.estado_produccion, project.project_id);
  }

  return jsonResponse({
    success: true,
    message: "Proyecto creado",
    created: true,
    project: project,
    project_id: projectId
  });
}

function listProjectsForAdmin_() {
  const sheet = getProjectSheetForAdmin_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(function(header) { return String(header || "").trim(); });
  return values.slice(1).filter(function(row) {
    return row.some(function(cell) { return String(cell || "").trim() !== ""; });
  }).map(function(row) {
    const project = rowToObjectForAdmin_(headers, row);
    if (!project.estado_produccion) project.estado_produccion = "Pendiente de inicio";
    return project;
  });
}

function updateProjectStatusForAdmin_(params) {
  const projectId = params.project_id || params.id || "";
  const estado = params.estado_produccion || params.estado || "";
  if (!projectId || !estado) return jsonResponse({ success: false, error: "Falta project_id o estado" });

  const found = findProjectByIdForAdmin_(projectId);
  if (!found) return jsonResponse({ success: false, error: "Proyecto no encontrado" });

  const statusColumnIndex = ensureHeaderColumn_(found.sheet, found.headers, "estado_produccion");
  const updatedAtColumnIndex = ensureHeaderColumn_(found.sheet, found.headers, "updated_at");
  found.sheet.getRange(found.rowIndex + 1, statusColumnIndex + 1).setValue(estado);
  found.sheet.getRange(found.rowIndex + 1, updatedAtColumnIndex + 1).setValue(new Date());

  const project = rowToObjectForAdmin_(found.headers, found.values[found.rowIndex]);
  if (project.lead_id) updateCrmLeadProductionStatusForAdmin_(project.lead_id, estado, projectId);

  return jsonResponse({ success: true, message: "Estado de proyecto actualizado" });
}

function updateProjectFieldsForAdmin_(params) {
  const projectId = params.project_id || params.id || "";
  if (!projectId) return jsonResponse({ success: false, error: "Falta project_id" });

  const found = findProjectByIdForAdmin_(projectId);
  if (!found) return jsonResponse({ success: false, error: "Proyecto no encontrado" });

  const allowed = ["responsable", "prioridad", "fecha_entrega_estimada", "notas"];
  allowed.forEach(function(field) {
    if (params[field] === undefined) return;
    const columnIndex = ensureHeaderColumn_(found.sheet, found.headers, field);
    found.sheet.getRange(found.rowIndex + 1, columnIndex + 1).setValue(params[field]);
  });
  const updatedAtColumnIndex = ensureHeaderColumn_(found.sheet, found.headers, "updated_at");
  found.sheet.getRange(found.rowIndex + 1, updatedAtColumnIndex + 1).setValue(new Date());

  return jsonResponse({ success: true, message: "Proyecto actualizado" });
}

function findBriefForProject_(briefId) {
  const sheet = getBriefSheetForAdmin_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0].map(function(header) { return String(header || "").trim(); });
  const candidates = ["id", "ID", "uuid", "timestamp", "fecha"];
  const idColumnIndex = findHeaderIndex_(headers, candidates);
  const requestedId = String(briefId || "").trim();

  if (requestedId && idColumnIndex >= 0) {
    const rowIndex = findBriefRowIndex_(values, idColumnIndex, requestedId);
    if (rowIndex >= 0) return { sheet: sheet, values: values, headers: headers, rowIndex: rowIndex, briefId: requestedId, brief: rowToObjectForAdmin_(headers, values[rowIndex]) };
  }

  const fallbackMatch = requestedId.match(/^brief-(\d+)$/);
  if (fallbackMatch) {
    const rowIndex = Number(fallbackMatch[1]);
    if (rowIndex > 0 && rowIndex < values.length) {
      return { sheet: sheet, values: values, headers: headers, rowIndex: rowIndex, briefId: requestedId, brief: rowToObjectForAdmin_(headers, values[rowIndex]) };
    }
  }

  return null;
}

function buildProjectDataFromBrief_(brief, fallbackBriefId) {
  const nested = parseAdminJson_(getFirstAdminValue_(brief, ["datos_completos", "datosCompletos", "data", "brief"])) || {};
  const source = mergeAdminObjects_(brief, nested);
  const budgetId = getFirstAdminValue_(source, ["budget_id", "budgetId"]);
  const budget = budgetId ? getBudgetByIdForAdmin_(budgetId) || {} : {};
  const briefId = getFirstAdminValue_(source, ["id", "ID", "uuid", "timestamp", "fecha"]) || fallbackBriefId || createProjectIdForAdmin_();

  return {
    brief_id: briefId,
    lead_id: getFirstAdminValue_(source, ["lead_id", "leadId"]) || getFirstAdminValue_(budget, ["lead_id", "leadId"]),
    budget_id: budgetId,
    referencia_presupuesto: getFirstAdminValue_(source, ["referencia_presupuesto", "referencia", "reference"]) || getFirstAdminValue_(budget, ["referencia", "reference"]),
    cliente: getFirstAdminValue_(source, ["cliente", "nombre", "name", "clientName", "contactName"]) || getFirstAdminValue_(budget, ["cliente"]),
    empresa: getFirstAdminValue_(source, ["empresa", "business", "negocio", "Nombre del negocio"]) || getFirstAdminValue_(budget, ["empresa"]),
    rubro: getFirstAdminValue_(source, ["rubro", "industry", "Rubro"]) || getFirstAdminValue_(budget, ["rubro"]),
    tipo_proyecto: getFirstAdminValue_(source, ["projectType", "tipo_proyecto", "plan", "presupuesto_generado"]) || getFirstAdminValue_(budget, ["plan"]),
    payload: {
      brief: brief,
      datos_completos: nested,
      budget: budget
    }
  };
}

function findProjectByBriefId_(values, headers, briefId) {
  const briefColumnIndex = headers.indexOf("brief_id");
  if (briefColumnIndex < 0 || !briefId) return null;
  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][briefColumnIndex] || "") === String(briefId)) return { rowIndex: rowIndex };
  }
  return null;
}

function findProjectByIdForAdmin_(projectId) {
  const sheet = getProjectSheetForAdmin_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0].map(function(header) { return String(header || "").trim(); });
  const idColumnIndex = headers.indexOf("project_id");
  if (idColumnIndex < 0) return null;
  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][idColumnIndex] || "") === String(projectId)) return { sheet: sheet, values: values, headers: headers, rowIndex: rowIndex };
  }
  return null;
}

function updateCrmLeadProductionStatusForAdmin_(leadId, status, projectId) {
  const crm = findCrmLeadRow_(leadId);
  if (!crm) return;
  const productionStatusColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "production_status");
  const projectIdColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "project_id");
  const updatedAtColumnIndex = ensureHeaderColumn_(crm.sheet, crm.headers, "updated_at");
  crm.sheet.getRange(crm.rowIndex + 1, productionStatusColumnIndex + 1).setValue(status);
  crm.sheet.getRange(crm.rowIndex + 1, projectIdColumnIndex + 1).setValue(projectId);
  crm.sheet.getRange(crm.rowIndex + 1, updatedAtColumnIndex + 1).setValue(new Date());
}

function createProjectIdForAdmin_() {
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  return "project-" + date + "-" + Math.floor(Math.random() * 1000000).toString(36);
}

function parseAdminJson_(value) {
  if (!value || typeof value !== "string") return value && typeof value === "object" ? value : null;
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return null;
  }
}

function mergeAdminObjects_(base, extra) {
  const output = {};
  Object.keys(base || {}).forEach(function(key) { output[key] = base[key]; });
  Object.keys(extra || {}).forEach(function(key) { if (output[key] === undefined || output[key] === "") output[key] = extra[key]; });
  return output;
}

function getSpreadsheetForAdmin_() {
  if (typeof SHEET_ID !== "undefined" && SHEET_ID) {
    return SpreadsheetApp.openById(SHEET_ID);
  }

  if (typeof SPREADSHEET_ID !== "undefined" && SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!activeSpreadsheet) {
    throw new Error("No se pudo obtener el spreadsheet. Defini SHEET_ID o SPREADSHEET_ID en el script existente.");
  }

  return activeSpreadsheet;
}

function normalizeAdminCell_(cell) {
  if (cell instanceof Date) {
    return cell.toISOString();
  }
  return cell === null || cell === undefined ? "" : cell;
}

function findHeaderIndex_(headers, candidates) {
  for (var i = 0; i < candidates.length; i += 1) {
    var index = headers.indexOf(candidates[i]);
    if (index >= 0) return index;
  }
  return -1;
}

function ensureHeaderColumn_(sheet, headers, headerName) {
  var index = headers.indexOf(headerName);
  if (index >= 0) return index;

  index = headers.length;
  headers.push(headerName);
  sheet.getRange(1, index + 1).setValue(headerName);
  return index;
}

function findBriefRowIndex_(values, idColumnIndex, id) {
  const expectedId = String(id || "");
  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const cellId = normalizeAdminCell_(values[rowIndex][idColumnIndex]);
    if (String(cellId || "") === expectedId) {
      return rowIndex;
    }
  }
  return -1;
}

function getFirstAdminValue_(object, keys) {
  for (var i = 0; i < keys.length; i += 1) {
    var value = object[keys[i]];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
