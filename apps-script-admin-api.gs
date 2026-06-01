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

const ADMIN_API_TOKEN = "CAMBIAR_TOKEN";
const CRM_SHEET_NAME = "CRM Leads";

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

  const rowIndex = findBriefRowIndex_(values, idColumnIndex, id);
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
    .slice(1)
    .filter(function(row) {
      return row.some(function(cell) {
        return String(cell || "").trim() !== "";
      });
    })
    .map(function(row, index) {
      const brief = {};

      headers.forEach(function(header, columnIndex) {
        if (!header) return;
        brief[header] = normalizeAdminCell_(row[columnIndex]);
      });

      brief.id = getFirstAdminValue_(brief, ["id", "ID", "uuid", "timestamp", "fecha"]) || "brief-" + (index + 1);
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
  if (!SHEETS || !SHEETS.brief) {
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
  const required = ["id", "fecha", "nombre", "empresa", "whatsapp", "email", "origen", "valor_estimado", "notas", "estado", "created_at", "updated_at"];
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
  const crmSheet = getCrmSheetForAdmin_();
  const crmHeaders = crmSheet.getRange(1, 1, 1, crmSheet.getLastColumn()).getValues()[0].map(function(header) {
    return String(header || "").trim();
  });
  const crmValues = crmSheet.getDataRange().getValues();
  const existingIds = {};
  const crmIdIndex = crmHeaders.indexOf("id");

  if (crmIdIndex >= 0) {
    crmValues.slice(1).forEach(function(row) {
      const id = String(row[crmIdIndex] || "");
      if (id) existingIds[id] = true;
    });
  }

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
    const crmId = "cotizador-" + sourceId;
    if (existingIds[crmId]) return;

    const now = new Date();
    const crmLead = {
      id: crmId,
      fecha: getFirstAdminValue_(lead, ["fecha", "date", "createdAt", "timestamp"]) || now,
      nombre: getFirstAdminValue_(lead, ["nombre", "name", "cliente"]) || "",
      empresa: getFirstAdminValue_(lead, ["empresa", "business", "negocio"]) || "",
      whatsapp: getFirstAdminValue_(lead, ["whatsapp", "WhatsApp"]) || "",
      email: getFirstAdminValue_(lead, ["email", "Email"]) || "",
      origen: getFirstAdminValue_(lead, ["origen", "origin"]) || "Cotizador",
      valor_estimado: getFirstAdminValue_(lead, ["precio", "valor_estimado", "presupuesto_generado"]) || "",
      notas: getFirstAdminValue_(lead, ["mensaje", "seguimiento", "notas"]) || "",
      estado: "Nuevo",
      created_at: now,
      updated_at: now
    };

    crmSheet.appendRow(crmHeaders.map(function(header) {
      return crmLead[header] !== undefined ? crmLead[header] : "";
    }));
    existingIds[crmId] = true;
  });
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
  const sheet = getCrmSheetForAdmin_();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(header) {
    return String(header || "").trim();
  });
  const now = new Date();
  const id = "crm-" + now.getTime();
  const lead = {
    id: id,
    fecha: now,
    nombre: params.nombre || "",
    empresa: params.empresa || "",
    whatsapp: params.whatsapp || "",
    email: params.email || "",
    origen: params.origen || "Otro",
    valor_estimado: params.valor_estimado || "",
    notas: params.notas || "",
    estado: params.estado || "Nuevo",
    created_at: now,
    updated_at: now
  };
  const row = headers.map(function(header) {
    return lead[header] !== undefined ? lead[header] : "";
  });
  sheet.appendRow(row);

  return jsonResponse({
    success: true,
    message: "Lead creado",
    lead: lead
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
  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][idColumnIndex] || "") === String(id)) {
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
