const MONEY_USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const MONEY_ARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const GOOGLE_SHEETS_ENDPOINT = window.RUNIA_SHEETS_ENDPOINT || "https://script.google.com/macros/s/AKfycbxWpk3LuXbrUkfIeBnWh_4mB03Rq7OhKciFsl5bsf_iG5JTlv8q9QijpdU959e77McCSA/exec";

const PACKS = {
  "48hs": {
    name: "Web 48hs",
    price: 450,
    priceLabel: "USD 450",
    description: "Ideal para empresas que necesitan salir online rápido con una landing clara, moderna y profesional.",
    bullets: ["Landing one page", "Diseño responsive", "WhatsApp integrado", "Formulario simple", "CTA principal", "Estructura comercial base", "Entrega express 48hs"]
  },
  comercial: {
    name: "Web Comercial",
    price: 850,
    priceLabel: "USD 850",
    description: "Ideal para empresas que quieren captar más consultas y comunicar mejor sus servicios.",
    bullets: ["Web con estructura comercial", "Secciones estratégicas", "Copy base", "WhatsApp y formularios", "Optimización mobile", "Base lista para campañas", "Mejor jerarquía visual y recorrido comercial"]
  },
  sistema: {
    name: "Web + Sistema",
    price: 1500,
    priceLabel: "desde USD 1.500",
    description: "Ideal para empresas que quieren conectar su web con seguimiento, CRM o automatización.",
    bullets: ["Web comercial", "CRM o pipeline simple", "Automatización inicial", "Seguimiento de consultas", "Dashboards básicos", "Integración futura con Runia"]
  }
};

const ADDONS = {
  whatsapp: { name: "WhatsApp integrado" },
  formulario: { name: "Formulario de contacto" },
  mapa: { name: "Mapa / ubicación" },
  catalogo: { name: "Catálogo de servicios o productos" },
  secciones: { name: "Secciones comerciales" },
  automatizacion: { name: "Automatización futura" }
};

const QUOTE_EXTRAS = {
  brandingBasic: { name: "Branding básico", detail: "USD 250 · Logo simple, paleta de colores, tipografías y guía visual básica." },
  brandingPro: { name: "Branding pro", detail: "USD 650 · Logo, variantes, paleta, tipografías, mini manual de marca y aplicaciones básicas." },
  copywriting: { name: "Copywriting avanzado", detail: "USD 250" },
  productsLoad: { name: "Carga de productos/servicios", detail: "desde USD 150" },
  maintenance: { name: "Mantenimiento mensual", detail: "desde USD 80/mes" },
  automationExtra: { name: "Automatización / IA", detail: "a cotizar" }
};

const getCheckedValues = (form, name) => Array.from(form.querySelectorAll(`[name="${name}"]:checked`)).map((input) => input.value);
const getFormObject = (form) => Object.fromEntries(new FormData(form).entries());
const priceText = (price) => `desde USD ${Number(price || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const usdLabel = (price) => `USD ${Number(price || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);

const sendToGoogleSheets = async (payload, context = "Runia Web") => {
  console.log(`Enviando ${context} a Google Sheets`);
  console.log("payload completo", payload);

  try {
    const response = await fetch(GOOGLE_SHEETS_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      body: JSON.stringify(payload)
    });
    console.log("respuesta del endpoint", response);
    return true;
  } catch (error) {
    console.error(`Error enviando ${context} a Google Sheets`, error);
    return false;
  }
};

const recommendPack = (values, features = []) => {
  const need = values.need || "rapido";

  if (need === "sistema" || features.includes("automatizacion")) return "sistema";
  if (need === "consultas" || need === "productos" || need === "imagen" || features.includes("catalogo") || features.includes("secciones")) return "comercial";
  return "48hs";
};

const estimatePrice = (packKey, features = []) => {
  const base = PACKS[packKey].price;
  const extras = features.reduce((sum, key) => sum + (ADDONS[key]?.price || 0), 0);
  return base + extras;
};

const renderResultList = (node, items) => {
  if (!node) return;
  node.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
};

const renderQuoteExtras = (node, items) => {
  if (!node) return;
  if (!items.length) {
    node.innerHTML = "";
    return;
  }
  node.innerHTML = `
    <p class="tool-label">Extras opcionales</p>
    <ul class="tool-result-list">
      ${items.map((item) => `<li><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.detail)}</span></li>`).join("")}
    </ul>
  `;
};

const initQuote = () => {
  const form = document.querySelector("[data-quote-form]");
  if (!form) return;

  const resultName = document.querySelector("[data-quote-name]");
  const resultRange = document.querySelector("[data-quote-range]");
  const resultTime = document.querySelector("[data-quote-time]");
  const resultText = document.querySelector("[data-quote-text]");
  const resultList = document.querySelector("[data-quote-list]");
  const resultExtras = document.querySelector("[data-quote-extras]");
  const whatsappLinks = document.querySelectorAll("[data-quote-whatsapp]");
  const agendaLinks = document.querySelectorAll("[data-quote-agenda]");
  const leadStatus = document.querySelector("[data-quote-lead-status]");
  let currentQuote = null;

  const update = () => {
    const values = getFormObject(form);
    const features = getCheckedValues(form, "features");
    const assets = getCheckedValues(form, "assets");
    const extrasKeys = getCheckedValues(form, "extras");
    const packKey = recommendPack(values, features);
    const pack = PACKS[packKey];
    const featuresText = features.map((key) => ADDONS[key]?.name).filter(Boolean);
    const extras = extrasKeys.map((key) => QUOTE_EXTRAS[key]).filter(Boolean);

    resultName.textContent = pack.name;
    resultRange.textContent = `Precio: ${pack.priceLabel}`;
    if (resultTime) resultTime.textContent = "";
    resultText.textContent = pack.description;
    renderResultList(resultList, pack.bullets);
    renderQuoteExtras(resultExtras, extras);

    const params = new URLSearchParams({
      pack: pack.name,
      precio: pack.priceLabel,
      objetivo: values.need || "",
      negocio: values.business || "",
      nombre: values.name || "",
      whatsapp: values.whatsapp || "",
      email: values.email || ""
    });

    const message = `Hola Runia Web. Quiero cotizar mi web.
Nombre: ${values.name || "-"}
Empresa: ${values.business || "-"}
Rubro: ${values.industry || "-"}
WhatsApp: ${values.whatsapp || "-"}
Email: ${values.email || "-"}
Plan recomendado: ${pack.name}
Precio: ${pack.priceLabel}
Necesito: ${values.need || "-"}
Funcionalidades: ${featuresText.join(", ") || "-"}
Materiales: ${assets.join(", ") || "-"}
Extras: ${extras.map((extra) => `${extra.name} (${extra.detail})`).join(", ") || "-"}`;
    currentQuote = {
      values,
      pack,
      packKey,
      featuresText,
      assets,
      extras,
      message
    };
    whatsappLinks.forEach((link) => {
      link.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    });
    agendaLinks.forEach((link) => {
      const agendaMessage = `${message}

Quiero agendar una llamada para avanzar.`;
      link.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(agendaMessage)}`;
    });
    if (leadStatus) {
      leadStatus.textContent = "Listo para enviar. Al tocar WhatsApp guardamos el lead y abrimos la conversación.";
    }
  };

  const saveQuoteLead = (action = "CTA") => {
    if (!currentQuote) update();
    if (!currentQuote) return;
    const { values, pack, featuresText, assets, extras, message } = currentQuote;
    if (leadStatus) leadStatus.textContent = "Guardando lead y abriendo WhatsApp...";
    sendToGoogleSheets({
      type: "cotizador",
      fecha: new Date().toISOString(),
      nombre: values.name || "",
      empresa: values.business || "",
      rubro: values.industry || "",
      whatsapp: values.whatsapp || "",
      email: values.email || "",
      plan: pack.name,
      precio: pack.priceLabel,
      extras: extras.map((extra) => `${extra.name}: ${extra.detail}`).join(" | "),
      funcionalidades: featuresText.join(", "),
      materiales: assets.join(", "),
      mensaje: message,
      estado_lead: "Nuevo cotizador",
      origen: "Cotizador Runia Web",
      presupuesto_generado: `${pack.name} · ${pack.priceLabel}`,
      accion_comercial: action,
      seguimiento: "Contactar por WhatsApp y enviar propuesta si corresponde",
      email_automatico: "pendiente",
      confirmacion_recepcion: "pendiente"
    }, "cotizador").then((saved) => {
      if (leadStatus) {
        leadStatus.textContent = saved ? "Lead guardado. Ya podés continuar por WhatsApp." : "No pudimos confirmar el guardado, pero podés continuar por WhatsApp.";
      }
    });
  };

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  whatsappLinks.forEach((link) => {
    link.addEventListener("click", () => saveQuoteLead(link.dataset.quoteAction || "WhatsApp"));
  });
  agendaLinks.forEach((link) => {
    link.addEventListener("click", () => saveQuoteLead(link.dataset.quoteAction || "Agendar reunión"));
  });
  update();
};

const initBudgetLegacy = () => {
  const form = document.querySelector("[data-budget-form]");
  if (!form) return;

  const totalUsd = document.querySelector("[data-total-usd]");
  const totalArs = document.querySelector("[data-total-ars]");
  const summary = document.querySelector("[data-budget-summary]");
  const preview = document.querySelector("[data-proposal-preview]");
  const exportButtons = document.querySelectorAll("[data-export-pdf]");
  const budgetWhatsapp = document.querySelector("[data-budget-whatsapp]");

  const webTypes = {
    web48: { name: "Web 48hs", price: 450, detail: "Para empresas que necesitan salir online rápido. Incluye landing one page, diseño responsive, WhatsApp integrado, formulario simple, CTA principal, estructura comercial base y entrega express 48hs." },
    comercial: { name: "Web Comercial", price: 850, detail: "Para empresas que quieren captar más consultas y vender mejor. Incluye web con estructura comercial, secciones estratégicas, copy base, WhatsApp y formularios, optimización mobile, base lista para campañas y mejor jerarquía visual y recorrido comercial." },
    sistema: { name: "Web + Sistema", price: 1500, detail: "Web comercial, CRM o pipeline simple, automatización inicial, seguimiento de consultas, dashboards básicos e integración futura con Runia." }
  };

  const budgetExtras = {
    brandingBasic: { name: "Branding básico", price: 250 },
    brandingPro: { name: "Branding pro", price: 650 },
    copywriting: { name: "Copywriting avanzado", price: 250 },
    productsLoad: { name: "Carga de productos o servicios", price: 150 },
    maintenance: { name: "Mantenimiento mensual", price: 80, displayPrice: "desde USD 80/mes", recurring: true },
    automationAI: { name: "Automatización / IA", price: 0, displayPrice: "a cotizar" }
  };

  const getBudget = () => {
    const values = getFormObject(form);
    const selectedType = webTypes[values.webType] || webTypes.comercial;
    const extras = getCheckedValues(form, "budgetExtras").map((key) => budgetExtras[key]).filter(Boolean);
    const oneTimeExtras = extras.filter((item) => !item.recurring);
    const recurringExtras = extras.filter((item) => item.recurring);
    const base = Number(values.basePrice || selectedType.price || 0);
    const extrasTotal = oneTimeExtras.reduce((sum, item) => sum + item.price, 0);
    const monthlyTotal = recurringExtras.reduce((sum, item) => sum + item.price, 0);
    const subtotal = base + extrasTotal;
    const discount = Math.min(Number(values.discount || 0), subtotal);
    const total = Math.max(subtotal - discount, 0);
    const commissionPercent = Number(values.commission || 0);
    const commissionAmount = total * (commissionPercent / 100);
    const rate = Number(values.rate || 1300);
    return { values, selectedType, extras, oneTimeExtras, recurringExtras, base, extrasTotal, monthlyTotal, subtotal, discount, total, commissionPercent, commissionAmount, rate };
  };

  const renderBudget = () => {
    const data = getBudget();
    const { values, selectedType, oneTimeExtras, recurringExtras, base, extrasTotal, monthlyTotal, discount, total, commissionPercent, commissionAmount, rate } = data;
    const proposalDate = values.date || new Date().toISOString().slice(0, 10);
    const validity = values.validity || "7 días";
    const terms = values.terms || "50% para comenzar. Entrega según alcance acordado.";
    const itemRows = [
      {
        name: selectedType.name,
        detail: selectedType.detail,
        amount: usdLabel(base)
      },
      ...oneTimeExtras.map((item) => ({
        name: item.name,
        detail: "Extra solicitado",
        amount: item.displayPrice ? item.displayPrice : usdLabel(item.price)
      }))
    ];
    const recurringRows = recurringExtras.map((item) => ({
      name: item.name,
      detail: "Fee mensual opcional. No incluido en el total inicial.",
      amount: item.displayPrice ? item.displayPrice : `${usdLabel(item.price)}/mes`
    }));
    const scopeBulletsByType = {
      web48: ["Landing responsive", "WhatsApp integrado", "Formulario simple", "CTA comercial", "Base optimizada para conversión", "Entrega express 48hs"],
      comercial: ["Estructura comercial", "Secciones estratégicas", "Copy base", "WhatsApp y formularios", "Optimización mobile", "Base lista para campañas"],
      sistema: ["Web comercial", "CRM o pipeline simple", "Automatización inicial", "Seguimiento de consultas", "Dashboards básicos", "Integración futura con Runia"]
    };
    const scopeBullets = scopeBulletsByType[values.webType] || scopeBulletsByType.comercial;
    const oneTimeExtrasLabel = oneTimeExtras.map((item) => item.name).join(" - ");
    const monthlyLabel = recurringRows.map((item) => `${item.name}: ${item.amount}`).join(" - ");
    const highlightedScope = new Set(["Landing responsive", "WhatsApp integrado", "CTA comercial"]);
    totalUsd.textContent = MONEY_USD.format(total);
    totalArs.textContent = MONEY_ARS.format(total * rate);
    const clientLabel = values.company || values.client || "Cliente sin empresa";
    const budgetMessageForClient = `Hola Runia Web. Te comparto la propuesta generada.
Cliente: ${values.client || "-"}
Empresa: ${values.company || "-"}
Rubro: ${values.industry || "-"}
Plan: ${selectedType.name}
Inversion inicial: ${usdLabel(total)}
Referencia ARS: ${MONEY_ARS.format(total * rate)}
Dolar tomado: ${MONEY_ARS.format(rate)} ARS
Extras iniciales: ${oneTimeExtrasLabel || "-"}
Mensual opcional: ${monthlyLabel || "-"}
Validez: ${validity}
Tiempo estimado: ${values.time || "Segun alcance"}`;
    summary.innerHTML = `
      <div class="budget-client-card">
        <span>Propuesta comercial</span>
        <strong>${escapeHtml(selectedType.name)}</strong>
        <p>${escapeHtml(clientLabel)} - ${escapeHtml(values.industry || "Rubro pendiente")}</p>
      </div>
      <div class="budget-summary-grid">
        <div><span>Precio base</span><strong>${MONEY_USD.format(base)}</strong></div>
        <div><span>Extras</span><strong>${MONEY_USD.format(extrasTotal)}</strong></div>
        <div><span>Descuento</span><strong>${MONEY_USD.format(discount)}</strong></div>
        <div><span>Mensual</span><strong>${monthlyTotal ? `${MONEY_USD.format(monthlyTotal)}/mes` : "No aplica"}</strong></div>
      </div>
      <div class="lead-management-strip">
        <div><span>Estado lead</span><strong>Propuesta generada</strong></div>
        <div><span>Origen</span><strong>Presupuestador interno</strong></div>
        <div><span>Presupuesto</span><strong>${escapeHtml(selectedType.name)} - ${usdLabel(total)}</strong></div>
      </div>
      <p class="budget-helper">Descarga la propuesta en PDF o compartila por WhatsApp cuando el alcance este listo.</p>
    `;
    if (budgetWhatsapp) {
      budgetWhatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(budgetMessageForClient)}`;
    }
    preview.innerHTML = `
      <style data-proposal-deck-style>
        #proposalDocument.proposal-deck {
          width: 920px;
          min-height: 1180px;
          position: relative;
          padding: 3.55rem 4.05rem;
          color: #1b1916;
          background: #fffdf9;
          border: 1px solid rgba(27,25,22,0.04);
          box-shadow: 0 30px 72px rgba(27,25,22,0.05);
          font-family: "Instrument Sans", Inter, "Helvetica Neue", Arial, sans-serif;
          overflow: hidden;
        }
        #proposalDocument.proposal-deck::before {
          content: "";
          position: absolute;
          inset: 1.05rem;
          display: none;
          border: 0;
          pointer-events: none;
        }
        #proposalDocument .deck-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }
        #proposalDocument .proposal-brand img { width: 7.55rem; filter: none; }
        #proposalDocument .deck-meta {
          display: grid;
          gap: 0.5rem;
          color: rgba(27,25,22,0.46);
          font-family: "JetBrains Mono", monospace;
          font-size: 0.65rem;
          letter-spacing: 0.12em;
          line-height: 1.35;
          text-align: right;
          text-transform: uppercase;
        }
        #proposalDocument .deck-cover {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 275px;
          gap: 2.75rem;
          align-items: stretch;
          margin-top: 3.25rem;
          padding: 2.45rem 2.75rem;
          background: #fffdf9;
          border: 1px solid rgba(27,25,22,0.065);
          border-left: 5px solid rgba(237,154,38,0.68);
        }
        #proposalDocument .deck-mark {
          display: none;
        }
        #proposalDocument .deck-cover > :not(.deck-mark) { position: relative; z-index: 1; }
        #proposalDocument .deck-label,
        #proposalDocument .story-label,
        #proposalDocument .investment-panel span,
        #proposalDocument .commercial-value span,
        #proposalDocument .deck-pill span,
        #proposalDocument .deck-line span,
        #proposalDocument .proposal-investment span {
          color: #ed9a26;
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          width: fit-content;
          padding: 0;
          background: transparent;
          border: 0;
          font-family: "JetBrains Mono", monospace;
          font-size: 0.64rem;
          letter-spacing: 0.14em;
          line-height: 1;
          text-transform: uppercase;
        }
        #proposalDocument .deck-label::before,
        #proposalDocument .proposal-investment span::before {
          content: "";
          display: inline-block;
          width: 1.65rem;
          height: 1px;
          background: rgba(237,154,38,0.62);
        }
        #proposalDocument .deck-title {
          max-width: 535px;
          margin-top: 1.55rem;
          font-family: "Instrument Sans", Inter, "Helvetica Neue", Arial, sans-serif;
          font-size: 4rem;
          line-height: 0.93;
          font-weight: 260;
          letter-spacing: 0;
        }
        #proposalDocument .deck-title strong {
          color: #ed9a26;
          font-weight: 310;
        }
        #proposalDocument .deck-title em {
          color: rgba(27,25,22,0.46);
          font-size: 0.68em;
          font-style: normal;
          font-weight: 245;
        }
        #proposalDocument .deck-lead {
          max-width: 455px;
          margin-top: 1.8rem;
          color: rgba(27,25,22,0.72);
          font-size: 1.08rem;
          line-height: 1.62;
        }
        #proposalDocument .proposal-client {
          margin-top: 1.7rem;
          color: rgba(27,25,22,0.5);
          font-family: "JetBrains Mono", monospace;
          font-size: 0.68rem;
          letter-spacing: 0.12em;
          line-height: 1.5;
          text-transform: uppercase;
        }
        #proposalDocument .investment-panel {
          display: none;
        }
        #proposalDocument .proposal-investment {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 0 0 2rem;
          background: transparent;
          border: 0;
          border-left: 1px solid rgba(27,25,22,0.09);
        }
        #proposalDocument .proposal-investment strong {
          display: block;
          margin-top: 1.35rem;
          font-family: "Instrument Sans", Inter, "Helvetica Neue", Arial, sans-serif;
          font-size: 4.3rem;
          line-height: 0.86;
          font-weight: 255;
        }
        #proposalDocument .proposal-investment p {
          margin-top: 1.35rem;
          color: rgba(27,25,22,0.5);
          font-size: 0.76rem;
          line-height: 1.62;
        }
        #proposalDocument .proposal-microline {
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem 1.35rem;
          margin-top: 0;
          padding: 0.95rem 2.75rem;
          color: rgba(27,25,22,0.54);
          background: #f6f1e8;
          border: 1px solid rgba(27,25,22,0.055);
          border-top: 0;
          font-size: 0.82rem;
          line-height: 1.4;
        }
        #proposalDocument .proposal-microline span::before {
          content: "";
          display: inline-block;
          width: 0.28rem;
          height: 0.28rem;
          margin-right: 0.55rem;
          background: #ed9a26;
          vertical-align: 0.12rem;
        }
        #proposalDocument .deck-split {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 245px;
          gap: 3.25rem;
          margin-top: 2rem;
          padding: 2rem 2.35rem;
          border: 1px solid rgba(27,25,22,0.06);
          background: #fffdf9;
        }
        #proposalDocument .deck-split > div,
        #proposalDocument .proposal-details {
          padding: 0;
        }
        #proposalDocument .deck-heading {
          max-width: 430px;
          margin-bottom: 1.55rem;
        }
        #proposalDocument .deck-heading h3 {
          margin-top: 1rem;
          font-size: 2.35rem;
          line-height: 0.96;
          font-weight: 265;
        }
        #proposalDocument .scope-list {
          display: grid;
          gap: 0.82rem;
          max-width: 520px;
        }
        #proposalDocument .scope-list li {
          display: flex;
          align-items: baseline;
          gap: 0.7rem;
          color: rgba(27,25,22,0.76);
          font-size: 1.02rem;
          line-height: 1.42;
          list-style: none;
        }
        #proposalDocument .scope-list li.scope-feature {
          color: #1b1916;
          font-weight: 470;
        }
        #proposalDocument .scope-list li::before {
          content: "";
          flex: 0 0 0.36rem;
          width: 0.36rem;
          height: 0.36rem;
          background: #ed9a26;
        }
        #proposalDocument .scope-list li.scope-feature::before {
          flex-basis: 0.48rem;
          width: 0.48rem;
          height: 0.48rem;
        }
        #proposalDocument .investment-breakdown {
          display: none;
        }
        #proposalDocument .proposal-details {
          align-self: start;
          min-height: 100%;
          background: transparent;
          border-left: 1px solid rgba(27,25,22,0.065);
          padding-left: 2rem;
        }
        #proposalDocument .proposal-detail-list {
          display: grid;
          gap: 1.05rem;
          margin-top: 1.65rem;
        }
        #proposalDocument .proposal-detail-list div {
          padding-top: 0.82rem;
          border-top: 1px solid rgba(27,25,22,0.055);
        }
        #proposalDocument .proposal-detail-list span {
          display: block;
          color: rgba(27,25,22,0.42);
          font-family: "JetBrains Mono", monospace;
          font-size: 0.62rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        #proposalDocument .proposal-detail-list strong {
          display: block;
          margin-top: 0.5rem;
          font-size: 0.93rem;
          line-height: 1.3;
          font-weight: 390;
        }
        #proposalDocument .breakdown-note,
        #proposalDocument .scope-note {
          margin-top: 1rem;
          color: rgba(27,25,22,0.5);
          font-size: 0.76rem;
          line-height: 1.52;
        }
        #proposalDocument .scope-note span,
        #proposalDocument .breakdown-note span { color: #1b1916; }
        #proposalDocument .deck-onboarding {
          margin-top: 1.15rem;
          padding: 1.75rem 2.35rem;
          background: #f7f1e7;
          border: 1px solid rgba(27,25,22,0.055);
        }
        #proposalDocument .onboarding-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.85rem;
          margin-top: 1.55rem;
          border-top: 0;
        }
        #proposalDocument .onboarding-row div {
          min-height: 4.65rem;
          padding: 1rem 0 0;
          background: transparent;
          border: 0;
          border-top: 1px solid rgba(27,25,22,0.075);
        }
        #proposalDocument .onboarding-row span {
          display: block;
          color: #ed9a26;
          font-family: "JetBrains Mono", monospace;
          font-size: 0.94rem;
          letter-spacing: 0.08em;
        }
        #proposalDocument .onboarding-row p {
          margin-top: 0.95rem;
          color: rgba(27,25,22,0.72);
          font-size: 0.9rem;
          line-height: 1.45;
        }
        #proposalDocument .proposal-terms {
          max-width: 560px;
          margin-top: 1.75rem;
          color: rgba(27,25,22,0.52);
          font-size: 0.78rem;
          line-height: 1.58;
        }
        #proposalDocument .proposal-close {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 2rem;
          margin-top: 1.15rem;
          padding: 1.45rem 2.35rem;
          background: #1b1916;
          border: 0;
          color: #fffdf9;
        }
        #proposalDocument .proposal-close strong {
          display: block;
          max-width: 520px;
          font-family: "Instrument Sans", Inter, "Helvetica Neue", Arial, sans-serif;
          font-size: 2.28rem;
          line-height: 0.98;
          font-weight: 265;
        }
        #proposalDocument .proposal-close span {
          color: #ed9a26;
        }
        #proposalDocument .proposal-close p {
          color: rgba(255,253,249,0.58);
          font-family: "JetBrains Mono", monospace;
          font-size: 0.62rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        #proposalDocument .proposal-footer {
          display: none;
        }
        #proposalDocument .proposal-footer span { color: #1b1916; font-weight: 470; }
      </style>
      <div class="proposal-preview proposal-deck" id="proposalDocument">
        <div class="deck-top">
          <a class="proposal-brand" href="../" aria-label="Runia Web"><img src="../runialogo-black.png" alt="Runia" /><span>Web</span></a>
          <div class="deck-meta">
            <span>${escapeHtml(values.company || values.client || "Propuesta")}</span>
            <span>${escapeHtml(proposalDate)} · ${escapeHtml(validity)}</span>
          </div>
        </div>

        <header class="deck-cover">
          <div>
            <p class="deck-label">Propuesta comercial</p>
            <h2 class="deck-title">Una web clara <em>para</em> <strong>vender mejor.</strong></h2>
            <p class="deck-lead">Presencia profesional, contacto ordenado y una base lista para crecer.</p>
            <p class="proposal-client">${escapeHtml(values.company || values.client || "Tu empresa")} · ${escapeHtml(selectedType.name)}</p>
          </div>
          <section class="proposal-investment">
            <span>Inversión inicial</span>
            <strong>${usdLabel(total)}</strong>
            <p>Referencia ARS: ${MONEY_ARS.format(total * rate)} · Dólar tomado: ${MONEY_ARS.format(rate)} ARS.</p>
          </section>
        </header>

        <div class="proposal-microline">
          <span>Diseño responsive</span>
          <span>Contacto directo</span>
          <span>Base comercial lista para crecer</span>
        </div>

        <section class="deck-split">
          <div>
            <div class="deck-heading">
              <span class="deck-label">Solución propuesta</span>
              <h3>Alcance incluido.</h3>
            </div>
            <ul class="scope-list">
              ${scopeBullets.map((item) => `<li class="${highlightedScope.has(item) || /Landing|WhatsApp|CTA|Estructura comercial|Base lista|CRM|Seguimiento|Dashboards/.test(item) ? "scope-feature" : ""}">${escapeHtml(item)}</li>`).join("")}
            </ul>
            ${oneTimeExtrasLabel ? `<p class="scope-note"><span>Extras incluidos:</span> ${escapeHtml(oneTimeExtrasLabel)}</p>` : ""}
          </div>
          <aside class="proposal-details">
            <span class="deck-label">Datos para aprobar</span>
            <div class="proposal-detail-list">
              <div><span>Plan</span><strong>${escapeHtml(selectedType.name)}</strong></div>
              <div><span>Validez</span><strong>${escapeHtml(validity)}</strong></div>
              <div><span>Tiempo</span><strong>${escapeHtml(values.time || "Según alcance")}</strong></div>
              ${monthlyLabel ? `<div><span>Mensual opcional</span><strong>${escapeHtml(monthlyLabel)}</strong></div>` : ""}
            </div>
          </aside>
        </section>

        <section class="deck-onboarding">
          <span class="deck-label">Cómo avanzamos</span>
          <div class="onboarding-row">
            <div><span>01</span><p>Confirmamos alcance</p></div>
            <div><span>02</span><p>Reservamos producción</p></div>
            <div><span>03</span><p>Iniciamos implementación</p></div>
          </div>
          <p class="proposal-terms">${escapeHtml(terms)}</p>
        </section>

        <section class="proposal-close">
          <strong>Lista para aprobar y empezar <span>producción.</span></strong>
          <p>Runia Web</p>
        </section>
      </div>
    `;
    preview.innerHTML = `
      <div class="proposal-master" id="proposalDocument">
        <section class="proposal-page proposal-page-cover">
          <div class="proposal-page-top">
            <a class="proposal-brand" href="../" aria-label="Runia Web"><img src="../runialogo-black.png" alt="Runia" /><span>Web</span></a>
            <span>Propuesta comercial</span>
          </div>
          <div class="proposal-cover-grid">
            <div>
              <p class="proposal-page-kicker">Runia Web</p>
              <h2>Una web clara para <span>vender mejor.</span></h2>
              <p class="proposal-page-lead">Presencia profesional, contacto ordenado y una base preparada para crecer.</p>
            </div>
            <aside class="proposal-investment-master">
              <span>Inversion inicial</span>
              <strong>${usdLabel(total)}</strong>
              <p>${escapeHtml(values.company || values.client || "Tu empresa")} · ${escapeHtml(selectedType.name)}</p>
            </aside>
          </div>
          <div class="proposal-page-footer">
            <span>${escapeHtml(proposalDate)}</span>
            <span>Validez: ${escapeHtml(validity)}</span>
          </div>
        </section>

        <section class="proposal-page">
          <div class="proposal-page-top">
            <a class="proposal-brand" href="../" aria-label="Runia Web"><img src="../runialogo-black.png" alt="Runia" /><span>Web</span></a>
            <span>02 / Alcance</span>
          </div>
          <div class="proposal-section-title">
            <p>Alcance incluido</p>
            <h2>Lo esencial para salir con una presencia clara y comercial.</h2>
          </div>
          <div class="proposal-bullet-grid">
            ${scopeBullets.map((item) => `<div><span></span><strong>${escapeHtml(item)}</strong></div>`).join("")}
          </div>
          <div class="proposal-benefits-row">
            <div><span>01</span><strong>Mensaje claro</strong><p>El cliente entiende rapido que ofreces y como avanzar.</p></div>
            <div><span>02</span><strong>Contacto directo</strong><p>WhatsApp, formularios y CTA visibles para generar consultas.</p></div>
            <div><span>03</span><strong>Base escalable</strong><p>La web queda lista para campanas, seguimiento o automatizacion.</p></div>
          </div>
        </section>

        <section class="proposal-page">
          <div class="proposal-page-top">
            <a class="proposal-brand" href="../" aria-label="Runia Web"><img src="../runialogo-black.png" alt="Runia" /><span>Web</span></a>
            <span>03 / Proceso</span>
          </div>
          <div class="proposal-section-title">
            <p>Como trabajamos</p>
            <h2>Un proceso simple para avanzar sin friccion.</h2>
          </div>
          <div class="proposal-timeline-master">
            <div><span>01</span><strong>Confirmamos alcance</strong><p>Validamos plan, materiales disponibles y condiciones de inicio.</p></div>
            <div><span>02</span><strong>Reservamos produccion</strong><p>Se agenda el trabajo y se ordena la informacion necesaria.</p></div>
            <div><span>03</span><strong>Implementamos</strong><p>Disenamos, armamos y dejamos la web lista para revisar.</p></div>
            <div><span>04</span><strong>Publicamos</strong><p>Ajustes finales, conexion de contacto y salida online.</p></div>
          </div>
        </section>

        <section class="proposal-page">
          <div class="proposal-page-top">
            <a class="proposal-brand" href="../" aria-label="Runia Web"><img src="../runialogo-black.png" alt="Runia" /><span>Web</span></a>
            <span>04 / Inversion</span>
          </div>
          <div class="proposal-section-title proposal-money-title">
            <p>Resumen economico</p>
            <h2>${usdLabel(total)}</h2>
            <span>Inversion inicial</span>
          </div>
          <div class="proposal-money-grid">
            <div><span>Precio base</span><strong>${MONEY_USD.format(base)}</strong></div>
            <div><span>Extras iniciales</span><strong>${MONEY_USD.format(extrasTotal)}</strong></div>
            <div><span>Descuento</span><strong>${MONEY_USD.format(discount)}</strong></div>
            <div><span>Mantenimiento opcional</span><strong>${monthlyTotal ? `${MONEY_USD.format(monthlyTotal)}/mes` : "No aplica"}</strong></div>
            <div><span>Referencia ARS</span><strong>${MONEY_ARS.format(total * rate)}</strong></div>
            <div><span>Dolar tomado</span><strong>${MONEY_ARS.format(rate)} ARS</strong></div>
          </div>
          ${oneTimeExtrasLabel ? `<p class="proposal-note"><span>Extras incluidos:</span> ${escapeHtml(oneTimeExtrasLabel)}</p>` : ""}
          ${monthlyLabel ? `<p class="proposal-note"><span>Servicio mensual opcional:</span> ${escapeHtml(monthlyLabel)}</p>` : ""}
        </section>

        <section class="proposal-page proposal-page-close">
          <div class="proposal-page-top">
            <a class="proposal-brand" href="../" aria-label="Runia Web"><img src="../runialogo-black.png" alt="Runia" /><span>Web</span></a>
            <span>05 / Cierre</span>
          </div>
          <div class="proposal-section-title">
            <p>Condiciones simples</p>
            <h2>Lista para aprobar y empezar produccion.</h2>
          </div>
          <div class="proposal-conditions">
            <p>${escapeHtml(terms)}</p>
            <p>Tiempo estimado: ${escapeHtml(values.time || "Segun alcance")}.</p>
            <p>Validez de la propuesta: ${escapeHtml(validity)}.</p>
          </div>
          <div class="proposal-contact-block">
            <strong>Runia Web</strong>
            <span>Webs claras, modernas y preparadas para captar mejores consultas.</span>
            <p>Contacto: WhatsApp / Runia Web</p>
          </div>
        </section>
      </div>
    `;
  };

  const syncBasePrice = () => {
    const type = form.elements.webType?.value;
    const priceInput = form.elements.basePrice;
    if (priceInput && webTypes[type]) priceInput.value = webTypes[type].price;
  };

  form.addEventListener("input", () => {
    renderBudget();
  });

  form.elements.webType?.addEventListener("change", () => {
    syncBasePrice();
    renderBudget();
  });

  const exportProposal = async () => {
    if (!window.html2canvas || !window.jspdf) {
      window.print();
      return;
    }
    const docNode = document.getElementById("proposalDocument");
    if (!docNode) return;
    const exportHost = document.createElement("div");
    exportHost.className = "proposal-export-host";
    exportHost.innerHTML = docNode.outerHTML;
    document.body.appendChild(exportHost);
    try {
      const { jsPDF } = window.jspdf;
      const pages = Array.from(exportHost.querySelectorAll(".proposal-page"));
      let pdf = null;

      for (const page of pages) {
        const canvas = await window.html2canvas(page, { backgroundColor: "#fffdf9", scale: 2, useCORS: true });
        const image = canvas.toDataURL("image/png", 1);
        if (!pdf) {
          pdf = new jsPDF({ unit: "px", format: [canvas.width, canvas.height] });
        } else {
          pdf.addPage([canvas.width, canvas.height], canvas.width > canvas.height ? "landscape" : "portrait");
        }
        pdf.addImage(image, "PNG", 0, 0, canvas.width, canvas.height);
      }

      if (!pdf) return;
      pdf.save(`Runia_Web_${(getFormObject(form).client || "Presupuesto").replace(/\s+/g, "_")}.pdf`);
    } finally {
      exportHost.remove();
    }
  };

  exportButtons.forEach((button) => {
    button.addEventListener("click", exportProposal);
  });

  if (form.elements.date) form.elements.date.value = new Date().toISOString().slice(0, 10);
  syncBasePrice();
  renderBudget();
};

const initBudget = () => {
  const form = document.querySelector("[data-budget-form]");
  if (!form) return;

  const totalUsd = document.querySelector("[data-total-usd]");
  const totalArs = document.querySelector("[data-total-ars]");
  const summary = document.querySelector("[data-budget-summary]");
  const preview = document.querySelector("[data-proposal-preview]");
  const exportButtons = document.querySelectorAll("[data-export-pdf]");
  const budgetWhatsapp = document.querySelector("[data-budget-whatsapp]");
  const partnerFields = document.querySelector("[data-partner-fields]");
  const pricingWarning = document.querySelector("[data-pricing-warning]");
  let partnerLogoData = "";

  const webTypes = {
    web48: {
      name: "Web 48hs",
      price: 450,
      min: 450,
      detail: "Landing one page clara, moderna y profesional para salir online rápido.",
      scope: ["Landing one page", "Diseño responsive", "WhatsApp integrado", "Formulario simple", "CTA principal", "Estructura comercial base", "Entrega express 48hs"]
    },
    comercial: {
      name: "Web Comercial",
      price: 850,
      min: 850,
      detail: "Web con estructura comercial para captar más consultas y comunicar mejor los servicios.",
      scope: ["Web con estructura comercial", "Secciones estratégicas", "Copy base", "WhatsApp y formularios", "Optimización mobile", "Base lista para campañas", "Mejor recorrido comercial"]
    },
    sistema: {
      name: "Web + Sistema",
      price: 1500,
      min: 1500,
      detail: "Web comercial preparada para conectar seguimiento, CRM o automatización.",
      scope: ["Web comercial", "CRM o pipeline simple", "Automatización inicial", "Seguimiento de consultas", "Dashboards básicos", "Integración futura con Runia"]
    }
  };

  const budgetExtras = {
    brandingBasic: { name: "Branding básico", price: 250, detail: "Logo simple, paleta, tipografías sugeridas y guía visual básica." },
    brandingPro: { name: "Branding pro", price: 650, detail: "Logo, variantes, paleta, tipografías, sistema visual básico y mini manual de marca." },
    copywriting: { name: "Copywriting avanzado", price: 250, detail: "Textos comerciales más trabajados para explicar mejor la propuesta." },
    productsLoad: { name: "Carga de productos o servicios", price: 150, detail: "Organización y carga inicial de contenido." },
    maintenance: { name: "Mantenimiento mensual", price: 80, displayPrice: "desde USD 80/mes", recurring: true, detail: "Acompañamiento mensual para ajustes y continuidad." },
    automationAI: { name: "Automatización / IA", price: 0, displayPrice: "a cotizar", detail: "Conexión futura con herramientas comerciales, seguimiento o atención automatizada." }
  };

  const getMode = () => form.elements.budgetMode?.value || "runia";
  const isPartnerMode = () => getMode() === "partner";

  const getBudget = () => {
    const values = getFormObject(form);
    const selectedType = webTypes[values.webType] || webTypes.comercial;
    const extras = getCheckedValues(form, "budgetExtras").map((key) => budgetExtras[key]).filter(Boolean);
    const oneTimeExtras = extras.filter((item) => !item.recurring);
    const recurringExtras = extras.filter((item) => item.recurring);
    const mode = getMode();
    const clientPrice = mode === "partner"
      ? Number(values.finalClientPrice || values.basePrice || selectedType.price || 0)
      : Number(values.basePrice || selectedType.price || 0);
    const internalCost = mode === "partner"
      ? Number(values.internalCost || selectedType.price || 0)
      : Number(values.basePrice || selectedType.price || 0);
    const base = clientPrice;
    const extrasTotal = oneTimeExtras.reduce((sum, item) => sum + item.price, 0);
    const monthlyTotal = recurringExtras.reduce((sum, item) => sum + item.price, 0);
    const subtotal = base + extrasTotal;
    const discount = Math.min(Number(values.discount || 0), subtotal);
    const total = Math.max(subtotal - discount, 0);
    const commissionPercent = Number(values.commission || 0);
    const commissionAmount = total * (commissionPercent / 100);
    const margin = mode === "partner" ? Math.max(total - internalCost, 0) : 0;
    const rate = Number(values.rate || 1300);
    const belowMin = base < selectedType.min;
    const proposalDate = values.date || new Date().toISOString().slice(0, 10);
    const validity = values.validity || "7 días";
    const terms = values.terms || "50% para comenzar. Entrega según alcance acordado.";
    const monthlyLabel = recurringExtras.map((item) => `${item.name}: ${item.displayPrice || `${usdLabel(item.price)}/mes`}`).join(" - ");
    const oneTimeExtrasLabel = oneTimeExtras.map((item) => item.name).join(" - ");
    const brandName = mode === "partner" && values.partnerName ? values.partnerName : "Runia Web";
    const logoSrc = mode === "partner" && partnerLogoData ? partnerLogoData : "../runialogo-black.png";
    const reference = `RW-${proposalDate.replaceAll("-", "")}-${(values.company || values.client || "CLIENTE").slice(0, 4).toUpperCase()}`;
    return {
      values,
      selectedType,
      extras,
      oneTimeExtras,
      recurringExtras,
      mode,
      base,
      internalCost,
      extrasTotal,
      monthlyTotal,
      subtotal,
      discount,
      total,
      commissionPercent,
      commissionAmount,
      margin,
      rate,
      belowMin,
      proposalDate,
      validity,
      terms,
      monthlyLabel,
      oneTimeExtrasLabel,
      brandName,
      logoSrc,
      reference
    };
  };

  const renderBudget = () => {
    const data = getBudget();
    const {
      values,
      selectedType,
      oneTimeExtras,
      recurringExtras,
      mode,
      base,
      internalCost,
      extrasTotal,
      monthlyTotal,
      discount,
      total,
      commissionPercent,
      commissionAmount,
      margin,
      rate,
      belowMin,
      proposalDate,
      validity,
      terms,
      monthlyLabel,
      oneTimeExtrasLabel,
      brandName,
      logoSrc,
      reference
    } = data;

    const clientLabel = values.company || values.client || "Cliente sin empresa";
    const isPartner = mode === "partner";
    const nextSteps = ["Confirmación del proyecto", "Envío del brief", "Producción", "Entrega inicial"];
    const contactLabel = isPartner && values.partnerName ? values.partnerName : "Runia Web";
    const whatsappMessage = `Hola ${contactLabel}. Te comparto la propuesta generada.
Cliente: ${values.client || "-"}
Empresa: ${values.company || "-"}
Rubro: ${values.industry || "-"}
Plan: ${selectedType.name}
Inversión inicial: ${usdLabel(total)}
Referencia ARS: ${MONEY_ARS.format(total * rate)}
Dólar tomado: ${MONEY_ARS.format(rate)} ARS
Extras iniciales: ${oneTimeExtrasLabel || "-"}
Mensual opcional: ${monthlyLabel || "-"}
Validez: ${validity}
Tiempo estimado: ${values.time || "Según alcance"}`;

    partnerFields.hidden = !isPartner;
    if (pricingWarning) {
      pricingWarning.hidden = !belowMin;
      pricingWarning.textContent = `El precio ingresado está por debajo del mínimo recomendado Runia: ${usdLabel(selectedType.min)}.`;
    }
    form.classList.toggle("is-partner-mode", isPartner);
    totalUsd.textContent = MONEY_USD.format(total);
    totalArs.textContent = MONEY_ARS.format(total * rate);
    if (budgetWhatsapp) budgetWhatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

    summary.innerHTML = `
      <div class="budget-client-card">
        <span>${isPartner ? "Modo Partner" : "Modo Runia Web"}</span>
        <strong>${escapeHtml(selectedType.name)}</strong>
        <p>${escapeHtml(clientLabel)} - ${escapeHtml(values.industry || "Rubro pendiente")}</p>
      </div>
      ${belowMin ? `<div class="pricing-warning is-visible">Precio por debajo del mínimo protegido: ${usdLabel(selectedType.min)}</div>` : ""}
      <div class="budget-summary-grid">
        <div><span>Precio cliente</span><strong>${MONEY_USD.format(base)}</strong></div>
        <div><span>Extras</span><strong>${MONEY_USD.format(extrasTotal)}</strong></div>
        <div><span>Descuento</span><strong>${MONEY_USD.format(discount)}</strong></div>
        <div><span>Mensual</span><strong>${monthlyTotal ? `${MONEY_USD.format(monthlyTotal)}/mes` : "No aplica"}</strong></div>
      </div>
      <div class="lead-management-strip">
        <div><span>Estado</span><strong>Propuesta generada</strong></div>
        <div><span>Referencia</span><strong>${escapeHtml(reference)}</strong></div>
        <div><span>PDF</span><strong>${escapeHtml(brandName)}</strong></div>
      </div>
      ${isPartner ? `
        <div class="partner-internal-summary">
          <div><span>Costo Runia</span><strong>${MONEY_USD.format(internalCost)}</strong></div>
          <div><span>Margen estimado</span><strong>${MONEY_USD.format(margin)}</strong></div>
          <div><span>Comisión partner</span><strong>${commissionPercent}% - ${MONEY_USD.format(commissionAmount)}</strong></div>
        </div>
      ` : ""}
      <p class="budget-helper">El PDF no muestra costo Runia, margen, comisión ni precio mínimo. Solo muestra la propuesta comercial para el cliente.</p>
    `;

    const brandText = isPartner && values.partnerName ? values.partnerName : "Web";
    const brandMarkup = `<a class="proposal-brand" href="../" aria-label="${escapeHtml(brandName)}"><span class="proposal-logo-frame"><img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(brandName)}" /></span><span class="proposal-brand-name">${escapeHtml(brandText)}</span></a>`;
    const headerMeta = (sectionLabel) => `<div class="proposal-pdf-meta"><span>${escapeHtml(sectionLabel)}</span><span>${escapeHtml(reference)}</span><span>${escapeHtml(proposalDate)}</span></div>`;
    const hasExtras = Boolean(oneTimeExtras.length || recurringExtras.length);

    preview.innerHTML = `
      <div class="proposal-master proposal-master-commercial" id="proposalDocument">
        <section class="proposal-page proposal-page-cover">
          <div class="proposal-page-top proposal-pdf-header">
            ${brandMarkup}
            ${headerMeta("01 / Propuesta")}
          </div>
          <div class="proposal-cover-grid proposal-cover-commercial">
            <div>
              <p class="proposal-page-kicker">Propuesta comercial</p>
              <h2>Desarrollo de <span>${escapeHtml(selectedType.name)}</span> para ${escapeHtml(values.company || values.client || "tu empresa")}.</h2>
              <p class="proposal-page-lead">${escapeHtml(selectedType.detail)}</p>
              <div class="proposal-ref-line">
                <strong>Cliente</strong><span>${escapeHtml(values.client || "-")}</span>
                <strong>Rubro</strong><span>${escapeHtml(values.industry || "-")}</span>
              </div>
            </div>
            <aside class="proposal-investment-master">
              <span>Inversión inicial</span>
              <strong>${usdLabel(total)}</strong>
              <p>Referencia ARS: ${MONEY_ARS.format(total * rate)}. Dólar tomado: ${MONEY_ARS.format(rate)} ARS.</p>
            </aside>
          </div>
          <div class="proposal-page-footer">
            <span>${escapeHtml(brandName)}</span>
            <span>Validez: ${escapeHtml(validity)}</span>
          </div>
        </section>

        <section class="proposal-page">
          <div class="proposal-page-top proposal-pdf-header">
            ${brandMarkup}
            ${headerMeta("02 / Alcance")}
          </div>
          <div class="proposal-section-title">
            <p>Resumen del proyecto</p>
            <h2>Desarrollo de ${escapeHtml(selectedType.name)} para ${escapeHtml(values.company || values.client || "tu empresa")}.</h2>
          </div>
          <div class="proposal-scope-list">
            ${selectedType.scope.map((item) => `<div><span></span><strong>${escapeHtml(item)}</strong></div>`).join("")}
          </div>
          <div class="proposal-benefits-row">
            <div><span>01</span><strong>Claridad comercial</strong><p>Una estructura pensada para explicar rápido qué hace la empresa.</p></div>
            <div><span>02</span><strong>Contacto directo</strong><p>CTA, WhatsApp y formularios listos para recibir consultas.</p></div>
            <div><span>03</span><strong>Base escalable</strong><p>Preparada para campañas, seguimiento o automatización futura.</p></div>
          </div>
        </section>

        <section class="proposal-page">
          <div class="proposal-page-top proposal-pdf-header">
            ${brandMarkup}
            ${headerMeta("03 / Extras")}
          </div>
          <div class="proposal-section-title">
            <p>Extras seleccionados</p>
            <h2>${hasExtras ? "Complementos para dejar la propuesta lista." : "Sin extras adicionales por ahora."}</h2>
          </div>
          <div class="proposal-extra-list ${hasExtras ? "" : "is-empty"}">
            ${hasExtras ? [...oneTimeExtras, ...recurringExtras].map((item) => `<div><span>${escapeHtml(item.displayPrice || usdLabel(item.price))}</span><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.detail)}</p></div>`).join("") : `
              <div class="proposal-empty-main"><span>Sin extras</span><strong>Sin extras adicionales por ahora.</strong><p>La propuesta avanza con el plan seleccionado y sus funcionalidades incluidas.</p></div>
              <div><span>Base incluida</span><strong>Alcance comercial completo</strong><p>La web mantiene estructura, contacto y recorrido comercial sin sumar módulos extra.</p></div>
              <div><span>Flexible</span><strong>Se puede ampliar luego</strong><p>Branding, automatización o mantenimiento pueden agregarse cuando el proyecto lo necesite.</p></div>
            `}
          </div>
        </section>

        <section class="proposal-page">
          <div class="proposal-page-top proposal-pdf-header">
            ${brandMarkup}
            ${headerMeta("04 / Inversión")}
          </div>
          <div class="proposal-section-title proposal-money-title">
            <p>Inversión</p>
            <span>Total final</span>
            <h2>${usdLabel(total)}</h2>
          </div>
          <div class="proposal-money-grid proposal-invest-grid">
            <div><span>Subtotal</span><strong>${MONEY_USD.format(base)}</strong></div>
            <div><span>Extras</span><strong>${MONEY_USD.format(extrasTotal)}</strong></div>
            <div><span>Descuento</span><strong>${MONEY_USD.format(discount)}</strong></div>
            <div><span>Total final</span><strong>${MONEY_USD.format(total)}</strong></div>
            <div><span>Mantenimiento opcional</span><strong>${monthlyTotal ? `${MONEY_USD.format(monthlyTotal)}/mes` : "No aplica"}</strong></div>
            <div><span>Tiempo estimado</span><strong>${escapeHtml(values.time || "Según alcance")}</strong></div>
          </div>
          <p class="proposal-note">Referencia en pesos: ${MONEY_ARS.format(total * rate)}. Dólar tomado: ${MONEY_ARS.format(rate)} ARS.</p>
        </section>

        <section class="proposal-page proposal-page-close">
          <div class="proposal-page-top proposal-pdf-header">
            ${brandMarkup}
            ${headerMeta("05 / Cierre")}
          </div>
          <div class="proposal-section-title">
            <p>Próximos pasos</p>
            <h2>Avanzamos con un proceso simple y ordenado.</h2>
          </div>
          <div class="proposal-timeline-master proposal-next-steps">
            ${nextSteps.map((item, index) => `<div><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(item)}</strong></div>`).join("")}
          </div>
          <div class="proposal-conditions">
            <p>${escapeHtml(terms)}</p>
            <p>Validez de la propuesta: ${escapeHtml(validity)}.</p>
          </div>
          <div class="proposal-contact-block">
            <strong>Gracias por confiar en ${escapeHtml(brandName)}.</strong>
            <span>Webs claras, modernas y preparadas para captar mejores consultas.</span>
            <p>Contacto: WhatsApp / ${escapeHtml(contactLabel)}</p>
          </div>
        </section>
      </div>
    `;
  };

  const syncBasePrice = (force = false) => {
    const type = form.elements.webType?.value;
    const selectedType = webTypes[type] || webTypes.comercial;
    if (form.elements.basePrice && (force || !form.elements.basePrice.value)) form.elements.basePrice.value = selectedType.price;
    if (form.elements.internalCost && (force || !form.elements.internalCost.value)) form.elements.internalCost.value = selectedType.price;
    if (form.elements.finalClientPrice && (force || !form.elements.finalClientPrice.value)) form.elements.finalClientPrice.value = selectedType.price;
  };

  form.addEventListener("input", renderBudget);
  form.addEventListener("change", (event) => {
    if (event.target?.name === "partnerLogo" && event.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        partnerLogoData = String(reader.result || "");
        renderBudget();
      };
      reader.readAsDataURL(event.target.files[0]);
      return;
    }
    if (event.target?.name === "webType") syncBasePrice(true);
    renderBudget();
  });

  const exportProposal = async () => {
    if (!window.html2canvas || !window.jspdf) {
      window.print();
      return;
    }
    const docNode = document.getElementById("proposalDocument");
    if (!docNode) return;
    const exportHost = document.createElement("div");
    exportHost.className = "proposal-export-host";
    exportHost.innerHTML = docNode.outerHTML;
    document.body.appendChild(exportHost);
    try {
      const { jsPDF } = window.jspdf;
      const pages = Array.from(exportHost.querySelectorAll(".proposal-page"));
      let pdf = null;
      for (const page of pages) {
        const canvas = await window.html2canvas(page, { backgroundColor: "#fffdf9", scale: 2, useCORS: true });
        const image = canvas.toDataURL("image/png", 1);
        if (!pdf) {
          pdf = new jsPDF({ unit: "px", format: [canvas.width, canvas.height] });
        } else {
          pdf.addPage([canvas.width, canvas.height], canvas.width > canvas.height ? "landscape" : "portrait");
        }
        pdf.addImage(image, "PNG", 0, 0, canvas.width, canvas.height);
      }
      if (!pdf) return;
      pdf.save(`Runia_Web_${(getFormObject(form).client || "Presupuesto").replace(/\s+/g, "_")}.pdf`);
    } finally {
      exportHost.remove();
    }
  };

  exportButtons.forEach((button) => button.addEventListener("click", exportProposal));

  if (form.elements.date) form.elements.date.value = new Date().toISOString().slice(0, 10);
  syncBasePrice();
  renderBudget();
};

const initBrief = () => {
  const form = document.querySelector("[data-brief-form]");
  if (!form) return;

  const confirmation = document.querySelector("[data-brief-confirmation]");
  const briefGrid = form.closest(".tool-grid");
  const submitButton = form.querySelector('[type="submit"]');
  const adminPanel = document.querySelector("[data-brief-admin]");
  const adminSummary = document.querySelector("[data-brief-admin-summary]");
  const adminStructure = document.querySelector("[data-brief-admin-structure]");
  const adminChecklist = document.querySelector("[data-brief-admin-checklist]");
  const promptOutput = document.querySelector("[data-brief-prompt-output]");
  const copyPromptButton = document.querySelector("[data-copy-brief-prompt]");
  const params = new URLSearchParams(window.location.search);
  const adminParam = params.get("admin");
  const isAdmin = adminParam === "true";

  if (!isAdmin && adminPanel) {
    adminPanel.remove();
  }

  if (params.get("negocio") && form.querySelector('[name="business"]')) form.querySelector('[name="business"]').value = params.get("negocio");
  if (params.get("whatsapp") && form.querySelector('[name="whatsapp"]')) form.querySelector('[name="whatsapp"]').value = params.get("whatsapp");

  const listText = (items) => items.length ? items.join(", ") : "-";
  const hasAnyText = (...items) => items.some((item) => String(item || "").trim().length > 0);

  const getBriefData = () => {
    const v = getFormObject(form);
    const objectives = getCheckedValues(form, "objective");
    const brandAssets = getCheckedValues(form, "brandAssets");
    const features = getCheckedValues(form, "features");
    return { v, objectives, brandAssets, features };
  };

  const buildInternalSummary = () => {
    const { v, objectives, brandAssets, features } = getBriefData();
    return [
      "BRIEF DE ARMADO - RUNIA WEB",
      "",
      "DATOS DEL NEGOCIO",
      "Nombre: " + (v.business || "-"),
      "Rubro: " + (v.industry || "-"),
      "Ubicación: " + (v.location || "-"),
      "WhatsApp: " + (v.whatsapp || "-"),
      "Email: " + (v.email || "-"),
      "Instagram: " + (v.instagram || "-"),
      "Web actual: " + (v.currentWebsite || "-"),
      "Dominio: " + (v.domain || "-"),
      "",
      "OBJETIVO DE LA WEB",
      listText(objectives),
      "",
      "SERVICIOS / PRODUCTOS",
      "Qué ofrece la empresa: " + (v.offer || "-"),
      "Servicios principales: " + (v.services || "-"),
      "Productos principales: " + (v.products || "-"),
      "Diferencial del negocio: " + (v.differential || "-"),
      "Cliente ideal: " + (v.audience || "-"),
      "CTA principal: " + (v.primaryCta || "-"),
      "Tono: " + (v.tone || "-"),
      "",
      "ESTÉTICA",
      "Colores actuales: " + (v.colors || "-"),
      "Marca disponible: " + listText(brandAssets),
      "Referencias visuales: " + (v.references || "-"),
      "Estilos que NO quiere: " + (v.donts || "-"),
      "",
      "MATERIALES",
      "Links a fotos: " + (v.photoLinks || "-"),
      "Links a logo: " + (v.logoLinks || "-"),
      "Textos existentes: " + (v.currentTexts || "-"),
      "Videos: " + (v.videos || "-"),
      "Redes sociales: " + (v.socials || "-"),
      "Otros archivos: " + (v.otherFiles || "-"),
      "",
      "FUNCIONALIDADES",
      listText(features)
    ].join("\n");
  };

  const buildChecklist = () => {
    const { v, brandAssets, features } = getBriefData();
    const hasLogo = brandAssets.includes("tiene logo") || hasAnyText(v.logoLinks);
    const hasBranding = hasLogo || brandAssets.includes("tiene manual de marca") || hasAnyText(v.colors);
    const hasTexts = hasAnyText(v.currentTexts, v.offer, v.services, v.products);
    const hasPhotos = hasAnyText(v.photoLinks);
    const wantsAutomation = features.includes("automatización futura") || features.includes("IA futura");
    return [
      { text: hasLogo ? "Tiene logo" : "Falta logo", status: hasLogo ? "ok" : "missing" },
      { text: v.domain ? "Tiene dominio" : "Falta dominio", status: v.domain ? "ok" : "missing" },
      { text: hasPhotos ? "Tiene fotos o links visuales" : "Falta fotos/material visual", status: hasPhotos ? "ok" : "missing" },
      { text: v.whatsapp || features.includes("WhatsApp") ? "Tiene WhatsApp" : "Falta WhatsApp", status: v.whatsapp || features.includes("WhatsApp") ? "ok" : "missing" },
      { text: hasBranding ? "Tiene base de branding" : "Necesita definir branding", status: hasBranding ? "ok" : "warn" },
      { text: hasTexts ? "Tiene contenido base" : "Necesita copy base", status: hasTexts ? "ok" : "warn" },
      { text: wantsAutomation ? "Necesita automatización futura" : "Sin automatización futura declarada", status: wantsAutomation ? "warn" : "ok" }
    ];
  };

  const buildStructure = () => {
    const { objectives, features } = getBriefData();
    const sections = ["Hero comercial", "Servicios / propuesta", "Diferenciales", "Contacto"];
    if (objectives.includes("mostrar productos") || features.includes("catálogo")) sections.splice(2, 0, "Catálogo / productos");
    if (objectives.includes("vender")) sections.splice(2, 0, "Bloque de conversión");
    if (features.includes("mapa")) sections.push("Ubicación / mapa");
    if (features.includes("agenda")) sections.push("Agenda / reserva");
    return sections;
  };

  const buildPrompt = () => {
    const { v, objectives, brandAssets, features } = getBriefData();
    return [
      "Crear una web para " + (v.business || "[empresa]") + ", rubro " + (v.industry || "[rubro]") + ", usando la plantilla base Runia Web.",
      "",
      "Mantener:",
      "",
      "* estética actual Runia Web,",
      "* dark premium,",
      "* tipografías,",
      "* spacing,",
      "* componentes,",
      "* estructura modular,",
      "* navegación,",
      "* hero estilo Runia.",
      "",
      "Personalizar:",
      "",
      "* copy,",
      "* imágenes,",
      "* servicios,",
      "* CTA,",
      "* branding,",
      "* colores secundarios,",
      "* módulos necesarios,",
      "* WhatsApp,",
      "* formularios.",
      "",
      "OBJETIVO:",
      "La web debe ayudar a " + listText(objectives) + ".",
      "",
      "SERVICIOS PRINCIPALES:",
      v.services || v.offer || "[servicios]",
      "",
      "CTA PRINCIPAL:",
      v.primaryCta || "Consultar por WhatsApp",
      "",
      "TONO:",
      v.tone || "[tono]",
      "",
      "ESTILO VISUAL:",
      "Colores: " + (v.colors || "-"),
      "Branding disponible: " + listText(brandAssets),
      "Referencias: " + (v.references || "-"),
      "Evitar: " + (v.donts || "-"),
      "",
      "FUNCIONALIDADES:",
      listText(features),
      "",
      "MATERIALES:",
      "Logo: " + (v.logoLinks || "-"),
      "Fotos: " + (v.photoLinks || "-"),
      "Textos: " + (v.currentTexts || "-"),
      "Redes: " + (v.socials || "-"),
      "",
      "IMPORTANTE:",
      "NO reinterpretar el sistema visual.",
      "NO crear una web experimental.",
      "Trabajar sobre la estructura modular Runia Web."
    ].join("\n");
  };

  const renderAdminOutput = () => {
    if (!isAdmin || !adminPanel) return;
    const { v, objectives, brandAssets, features } = getBriefData();
    const checklist = buildChecklist();
    const structure = buildStructure();
    adminPanel.hidden = false;
    document.body.classList.add("is-brief-admin");

    if (adminSummary) {
      const rows = [
        ["Nombre", v.business || "-"],
        ["Rubro", v.industry || "-"],
        ["Objetivo", listText(objectives)],
        ["Servicios", v.services || v.offer || "-"],
        ["CTA principal", v.primaryCta || "Consultar por WhatsApp"],
        ["Tono", v.tone || "-"],
        ["Branding", listText(brandAssets)],
        ["Funcionalidades", listText(features)],
        ["Assets faltantes", checklist.filter((item) => item.status === "missing").map((item) => item.text).join(", ") || "Sin faltantes críticos"]
      ];
      adminSummary.innerHTML = rows.map(([label, value]) => "<div><span>" + escapeHtml(label) + "</span><strong>" + escapeHtml(value) + "</strong></div>").join("");
    }

    if (adminStructure) {
      adminStructure.innerHTML = structure.map((item, index) => "<div><span>" + String(index + 1).padStart(2, "0") + "</span><strong>" + escapeHtml(item) + "</strong></div>").join("");
    }

    if (adminChecklist) {
      adminChecklist.innerHTML = checklist.map((item) => "<li class=\"is-" + item.status + "\">" + escapeHtml(item.text) + "</li>").join("");
    }

    if (promptOutput) promptOutput.textContent = buildPrompt();
  };

  if (isAdmin) {
    renderAdminOutput();
    form.addEventListener("input", renderAdminOutput);
    form.addEventListener("change", renderAdminOutput);
  }

  copyPromptButton?.addEventListener("click", async () => {
    const prompt = buildPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      copyPromptButton.textContent = "Prompt copiado";
      window.setTimeout(() => {
        copyPromptButton.textContent = "Copiar prompt";
      }, 1800);
    } catch (error) {
      console.warn("No se pudo copiar el prompt", error);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitButton?.disabled) return;

    const summary = buildInternalSummary();
    const { v: values, objectives, brandAssets, features } = getBriefData();
    const payload = {
      type: "brief",
      fecha: new Date().toISOString(),
      nombre: values.contactName || values.name || values.business || "",
      empresa: values.business || "",
      whatsapp: values.whatsapp || "",
      email: values.email || "",
      datos_completos: {
        ...values,
        objetivos: objectives,
        marca_disponible: brandAssets,
        funcionalidades: features
      },
      resumen: summary,
      origen: "Brief Runia Web",
      estado_lead: "Brief recibido",
      presupuesto_generado: "Postventa",
      seguimiento: "Revisar materiales e iniciar producción",
      email_automatico: "pendiente",
      confirmacion_recepcion: "pendiente"
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Formulario enviado";
    }

    await sendToGoogleSheets(payload, "brief");

    if (confirmation) {
      form.hidden = true;
      briefGrid?.classList.add("is-brief-submitted");
      confirmation.hidden = false;
      confirmation.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    renderAdminOutput();
  });
};

const initCatalog = () => {
  const buttons = Array.from(document.querySelectorAll("[data-catalog-filter]"));
  const cards = Array.from(document.querySelectorAll("[data-catalog-card]"));
  if (!buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.catalogFilter;
      buttons.forEach((item) => item.classList.toggle("button-dark", item === button));
      buttons.forEach((item) => item.classList.toggle("button-soft", item !== button));
      cards.forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.catalogCard !== filter;
      });
    });
  });
};

initQuote();
initBudget();
initBrief();
initCatalog();
