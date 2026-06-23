const ADMIN_PASSWORD = "RuniaWeb1_.";
const ADMIN_API_URL = "https://script.google.com/macros/s/AKfycbwPLx1eoiamVc_WR4JL7oUWsMnNFQ7LCFfgTJd8D5ZnKVWTIEtmC2dZXZMzMmvtg6YC8Q/exec";
const ADMIN_API_TOKEN = "runia_admin_2026";

const SESSION_KEY = "runia_admin_session";
const STATUS_KEY = "runia_admin_brief_statuses";

const STATES = ["Nuevo", "Revisado", "Falta info", "En producción", "Enviado a cliente", "Entregado", "Archivado"];
const CRM_STATES = ["Nuevo", "Contactado", "Reunión", "Propuesta", "Negociación", "Ganado", "Perdido"];
const CRM_ORIGINS = ["WhatsApp directo", "Instagram", "Meta Ads", "Google", "Referido", "Partner", "Municipalidad", "Networking", "Cotizador", "Otro"];
const BUDGET_STATES = ["Borrador", "Enviado", "Aprobado", "Rechazado", "En producción"];
const PROJECT_STATES = ["Pendiente de inicio", "En producción", "En revisión", "Entregado", "Pausado"];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
})[char]);

const readStorage = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const hasConfiguredApi = () => {
  return ADMIN_API_URL && ADMIN_API_TOKEN && !ADMIN_API_URL.includes("PEGAR_") && !ADMIN_API_TOKEN.includes("PEGAR_");
};

const parseMaybeJson = (value) => {
  if (!value || typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !["{", "["].includes(trimmed[0])) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return parseAppsScriptObject_(trimmed) || value;
  }
};

const parseAppsScriptObject_ = (value) => {
  if (!value || value[0] !== "{" || value[value.length - 1] !== "}") return null;
  const body = value.slice(1, -1).trim();
  if (!body || !body.includes("=")) return null;

  return body.split(", ").reduce((object, pair) => {
    const separator = pair.indexOf("=");
    if (separator < 0) return object;
    const key = pair.slice(0, separator).trim();
    const itemValue = pair.slice(separator + 1).trim();
    if (key) object[key] = itemValue;
    return object;
  }, {});
};

const asArray = (value) => {
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  if (typeof parsed === "string") return parsed.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  return [];
};

const getFirst = (source, keys, fallback = "") => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
};

const normalizeBrief = (raw, index) => {
  const parsedRaw = parseMaybeJson(raw) || {};
  const nested = parseMaybeJson(parsedRaw.datos_completos || parsedRaw.datosCompletos || parsedRaw["Datos completos"] || parsedRaw.data || parsedRaw.brief) || {};
  const source = { ...parsedRaw, ...nested };
  const id = String(getFirst(source, ["id", "ID", "uuid", "timestamp", "fecha"], `brief-${index}`));
  const objectives = asArray(getFirst(source, ["objetivos", "objective", "objectives"]));
  const brandAssets = asArray(getFirst(source, ["marca_disponible", "brandAssets", "brand_assets"]));
  const features = asArray(getFirst(source, ["funcionalidades", "features"]));

  return {
    id,
    raw: parsedRaw,
    source,
    date: getFirst(source, ["fecha", "Fecha", "date", "createdAt", "timestamp"], ""),
    company: getFirst(source, ["empresa", "Empresa", "business", "negocio", "company", "Nombre del negocio"], ""),
    client: getFirst(source, ["cliente", "Cliente", "nombre", "Nombre", "contactName", "name"], ""),
    industry: getFirst(source, ["rubro", "industry", "Rubro"], ""),
    location: getFirst(source, ["location", "ubicacion", "ubicación", "Ubicación"], ""),
    whatsapp: getFirst(source, ["whatsapp", "WhatsApp"], ""),
    email: getFirst(source, ["email", "Email"], ""),
    instagram: getFirst(source, ["instagram", "Instagram"], ""),
    currentWebsite: getFirst(source, ["currentWebsite", "webActual", "Web actual si tiene"], ""),
    domain: getFirst(source, ["domain", "dominio", "Dominio si tiene"], ""),
    objectives,
    offer: getFirst(source, ["offer", "oferta", "Qué ofrece la empresa", "que_ofrece"], ""),
    services: getFirst(source, ["services", "servicios", "Servicios principales"], ""),
    products: getFirst(source, ["products", "productos", "Productos principales"], ""),
    differential: getFirst(source, ["differential", "diferencial", "Diferencial del negocio"], ""),
    audience: getFirst(source, ["audience", "clienteIdeal", "Cliente ideal"], ""),
    primaryCta: getFirst(source, ["primaryCta", "cta", "CTA principal"], ""),
    tone: getFirst(source, ["tone", "tono", "Tono de comunicación"], ""),
    visualFeeling: asArray(getFirst(source, ["visualFeeling", "sensacion_visual", "sensación visual", "Sensación visual", "¿Qué sensación querés transmitir?"], "")),
    colors: getFirst(source, ["colors", "colores", "Colores actuales"], ""),
    brandAssets,
    references: getFirst(source, ["references", "referencias", "Referencias visuales"], ""),
    donts: getFirst(source, ["donts", "Estilos que NO quiere", "Qué NO querés", "Que NO queres"], ""),
    photoLinks: getFirst(source, ["photoLinks", "fotos", "Links a fotos"], ""),
    logoLinks: getFirst(source, ["logoLinks", "logo", "Links a logo"], ""),
    currentTexts: getFirst(source, ["currentTexts", "textos", "Textos existentes"], ""),
    videos: getFirst(source, ["videos", "Videos"], ""),
    socials: getFirst(source, ["socials", "redes", "Redes sociales"], ""),
    otherFiles: getFirst(source, ["otherFiles", "otrosArchivos", "Otros archivos"], ""),
    features,
    status: getFirst(source, ["estado", "Estado", "status"], "Nuevo")
  };
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const slugStatus = (status) => status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");

const hasAnyText = (...values) => values.some((value) => String(value || "").trim().length > 0);
const includesValue = (items, expected) => items.some((item) => item.toLowerCase().includes(expected.toLowerCase()));
const listText = (items) => items.length ? items.join(", ") : "-";
const cleanListText = (items, fallback = "no especificado") => items.length ? items.join(", ") : fallback;

const buildChecklist = (brief) => {
  const hasLogo = includesValue(brief.brandAssets, "logo") || hasAnyText(brief.logoLinks);
  const hasColors = hasAnyText(brief.colors) || includesValue(brief.brandAssets, "manual");
  const hasPhotos = hasAnyText(brief.photoLinks);
  const hasTexts = hasAnyText(brief.currentTexts, brief.offer, brief.services, brief.products);
  const hasWhatsapp = hasAnyText(brief.whatsapp) || includesValue(brief.features, "WhatsApp");
  const hasDomain = hasAnyText(brief.domain);

  return [
    { text: hasLogo ? "Logo recibido" : "Falta logo", status: hasLogo ? "ok" : "missing" },
    { text: hasColors ? "Colores definidos" : "Falta definir colores", status: hasColors ? "ok" : "missing" },
    { text: hasPhotos ? "Fotos recibidas" : "Faltan fotos", status: hasPhotos ? "ok" : "missing" },
    { text: hasTexts ? "Textos recibidos" : "Requiere copy", status: hasTexts ? "ok" : "warn" },
    { text: hasWhatsapp ? "WhatsApp disponible" : "Falta WhatsApp", status: hasWhatsapp ? "ok" : "missing" },
    { text: hasDomain ? "Dominio disponible" : "Falta dominio", status: hasDomain ? "ok" : "missing" },
    { text: includesValue(brief.features, "formulario") ? "Requiere formulario" : "No requiere formulario declarado", status: includesValue(brief.features, "formulario") ? "warn" : "ok" },
    { text: includesValue(brief.features, "mapa") ? "Requiere mapa" : "No requiere mapa declarado", status: includesValue(brief.features, "mapa") ? "warn" : "ok" },
    { text: includesValue(brief.features, "catálogo") || includesValue(brief.features, "catalogo") ? "Requiere catálogo" : "No requiere catálogo declarado", status: includesValue(brief.features, "catálogo") || includesValue(brief.features, "catalogo") ? "warn" : "ok" },
    { text: includesValue(brief.features, "automatización") || includesValue(brief.features, "IA") ? "Requiere automatización futura" : "Sin automatización futura declarada", status: includesValue(brief.features, "automatización") || includesValue(brief.features, "IA") ? "warn" : "ok" }
  ];
};

const getBriefSignals = (brief) => {
  const hasIndustry = hasAnyText(brief.industry);
  const hasObjective = brief.objectives.length > 0;
  const hasServices = hasAnyText(brief.offer, brief.services, brief.products);
  const hasWhatsapp = hasAnyText(brief.whatsapp) || includesValue(brief.features, "WhatsApp");
  const hasAesthetic = hasAnyText(brief.colors, brief.references, brief.tone) || brief.visualFeeling.length > 0 || brief.brandAssets.length > 0;
  const hasMaterials = hasAnyText(brief.photoLinks, brief.logoLinks, brief.currentTexts, brief.socials, brief.instagram);
  const hasBranding = hasAnyText(brief.colors, brief.logoLinks) || includesValue(brief.brandAssets, "logo") || includesValue(brief.brandAssets, "manual");
  const hasCopy = hasAnyText(brief.currentTexts, brief.offer, brief.services, brief.products);
  const missing = [];

  if (!hasIndustry) missing.push("rubro");
  if (!hasObjective) missing.push("objetivo");
  if (!hasServices) missing.push("servicios/productos");
  if (!hasWhatsapp) missing.push("contacto/WhatsApp");
  if (!hasAesthetic) missing.push("estética");
  if (!hasMaterials) missing.push("materiales");
  if (!hasBranding) missing.push("branding");
  if (!hasCopy) missing.push("copy base");

  let completeness = "Bajo";
  if (hasIndustry && hasObjective && hasServices && hasWhatsapp && hasAesthetic && hasMaterials) {
    completeness = "Alto";
  } else if (hasIndustry && hasServices && hasWhatsapp) {
    completeness = "Medio";
  }

  let risk = "Alto";
  if (completeness === "Alto" && hasBranding && hasCopy) {
    risk = "Bajo";
  } else if (hasServices && hasWhatsapp && (hasAesthetic || hasMaterials)) {
    risk = "Medio";
  }

  return { completeness, risk, missing };
};

const buildSummary = (brief) => {
  const company = brief.company || "La empresa";
  const industry = brief.industry || "rubro no definido";
  const objective = listText(brief.objectives);
  const services = brief.services || brief.offer || brief.products || "servicios/productos a ordenar";
  const cta = brief.primaryCta || (brief.whatsapp ? "consultar por WhatsApp" : "generar consultas");
  return `${company} es un proyecto del rubro ${industry}. La web debe enfocarse en ${objective}, presentar ${services} con claridad y llevar al usuario hacia ${cta}. El material disponible permite producir una web con el sistema técnico y comercial de Runia Web, pero con identidad visual propia para la marca del cliente.`;
};

const buildCommercialSummary = (brief) => {
  const signals = getBriefSignals(brief);
  const company = brief.company || "El cliente";
  const industry = brief.industry || "un rubro no especificado";
  const objective = cleanListText(brief.objectives, "ordenar su presencia digital y generar consultas");
  const services = brief.services || brief.offer || brief.products || "sus servicios o productos principales";
  const cta = brief.primaryCta || (brief.whatsapp ? "consultar por WhatsApp" : "contactar al negocio");
  const missing = signals.missing.length ? signals.missing.slice(0, 4).join(", ") : "sin faltantes críticos";

  return `${company} es un negocio del rubro ${industry} que necesita una web para ${objective}. La propuesta debería enfocarse en comunicar ${services} y llevar al usuario a ${cta}. El problema principal parece ser presentar la oferta con claridad, generar confianza y facilitar el contacto. Por el alcance informado, corresponde una web comercial modular producida con el sistema Runia Web, sin copiar su estética visual. El brief está ${signals.completeness.toLowerCase()} y faltan ${missing}.`;
};

const buildTechnicalSummary = (brief) => {
  const signals = getBriefSignals(brief);
  const sections = buildSections(brief);
  const features = cleanListText(brief.features, "contacto claro y CTA visibles");
  const availableMaterials = [
    brief.logoLinks ? "logo" : "",
    brief.photoLinks ? "fotos" : "",
    brief.currentTexts || brief.offer || brief.services ? "textos/copy base" : "",
    brief.socials || brief.instagram ? "redes sociales" : "",
    brief.colors || brief.brandAssets.length ? "referencias de marca" : ""
  ].filter(Boolean);
  const integrations = [
    brief.whatsapp || includesValue(brief.features, "WhatsApp") ? "WhatsApp" : "",
    includesValue(brief.features, "formulario") ? "formulario" : "",
    includesValue(brief.features, "mapa") ? "mapa" : "",
    includesValue(brief.features, "catálogo") || includesValue(brief.features, "catalogo") ? "catálogo" : "",
    includesValue(brief.features, "automatización") || includesValue(brief.features, "IA") ? "automatización futura" : ""
  ].filter(Boolean);
  const ready = signals.risk === "Bajo" ? "listo para empezar" : signals.risk === "Medio" ? "puede empezar con revisión de faltantes" : "requiere completar información antes de producir";

  return `Estructura recomendada según el negocio: ${sections.join(", ")}. Funcionalidades: ${features}. Materiales disponibles: ${availableMaterials.length ? availableMaterials.join(", ") : "sin materiales claros declarados"}. Faltantes: ${signals.missing.length ? signals.missing.join(", ") : "sin faltantes críticos"}. Integraciones necesarias: ${integrations.length ? integrations.join(", ") : "no declaradas"}. Riesgo: ${signals.risk.toLowerCase()}. Estado operativo: ${ready}.`;
};

const buildPrompt = (brief) => {
  const valueOrGuidance = (value, guidance) => {
    const text = Array.isArray(value) ? listText(value) : String(value || "").trim();
    return text && text !== "-" ? text : guidance;
  };
  const company = valueOrGuidance(brief.company, "Usar el nombre de la empresa si esta disponible en el material. Si no aparece, redactar de forma neutra sin inventar marca.");
  const industry = valueOrGuidance(brief.industry, "Rubro no especificado. Inferir solo desde servicios/productos reales del brief; si no alcanza, usar copy general profesional.");
  const objective = valueOrGuidance(brief.objectives, "Objetivo no especificado. Priorizar presencia profesional, claridad comercial y generacion de consultas.");
  const audience = valueOrGuidance(brief.audience, "Publico objetivo no especificado. Redactar para potenciales clientes del rubro sin inventar segmentos concretos.");
  const services = valueOrGuidance(brief.services || brief.offer, "Servicios no especificados. Crear bloques modulares con copy neutro y editable, sin inventar prestaciones concretas.");
  const products = valueOrGuidance(brief.products, "Productos no especificados. No crear catalogo de productos inventados.");
  const differential = valueOrGuidance(brief.differential, "Diferencial no especificado. Usar argumentos generales: atencion clara, profesionalismo, confianza y facilidad de contacto.");
  const visualDirectionFallback = "No hay referencias suficientes. Proponer una direccion visual logica segun el rubro: deportivo = energia/movimiento/comunidad; inmobiliaria = confianza/premium/propiedades protagonistas; industrial = solidez/escala/infraestructura; gastronomia/vinos = lifestyle/calidez/producto/experiencia; servicios profesionales = claridad/autoridad/confianza. No copiar Runia Web.";
  const aesthetics = [
    `Sensacion a transmitir: ${valueOrGuidance(brief.visualFeeling, "No especificada. Definir una sensacion coherente con el rubro y objetivo comercial.")}`,
    `Colores: ${valueOrGuidance(brief.colors, "No definidos. Proponer una paleta propia coherente con el rubro/marca; no usar la paleta Runia salvo que el brief lo pida.")}`,
    `Referencias visuales: ${valueOrGuidance(brief.references, visualDirectionFallback)}`,
    `Evitar: ${valueOrGuidance(brief.donts, "No especificado. Evitar recursos genericos, exceso decorativo y textos de relleno.")}`,
    `Tono: ${valueOrGuidance(brief.tone, "Profesional, claro y comercial.")}`
  ];
  const materials = [
    `Logo: ${valueOrGuidance(brief.logoLinks, "No recibido. No inventar logo; dejar espacio preparado o usar nombre textual de forma sobria.")}`,
    `Fotos: ${valueOrGuidance(brief.photoLinks, "No recibidas. Usar placeholders visuales sobrios o imagenes genericas solo si el proyecto lo permite, sin simular fotos reales del negocio.")}`,
    `Textos: ${valueOrGuidance(brief.currentTexts, "No recibidos. Generar copy neutro y profesional basado solo en datos del brief.")}`,
    `Videos: ${valueOrGuidance(brief.videos, "No recibidos. No agregar videos inventados.")}`,
    `Redes: ${valueOrGuidance(brief.socials || brief.instagram, "No declaradas. No inventar redes sociales.")}`,
    `Otros archivos: ${valueOrGuidance(brief.otherFiles, "Sin otros archivos declarados.")}`
  ];
  const features = valueOrGuidance(brief.features, "Funcionalidades no especificadas. Incluir contacto claro y CTA visibles; no agregar integraciones complejas no pedidas.");
  const cta = valueOrGuidance(brief.primaryCta, brief.whatsapp ? "Consultar por WhatsApp" : "Contactar");

  return [
    `Crear una web para ${company}, rubro ${industry}, utilizando el sistema de produccion Runia Web.`,
    "",
    "OBJETIVO:",
    `Desarrollar una web comercial clara, moderna y orientada a generar consultas para ${company}, pero con identidad visual propia.`,
    "",
    "IMPORTANTE:",
    "- No copiar visualmente la web de Runia Web.",
    "- No replicar el hero de Runia Web.",
    "- No replicar la composicion de Runia Web.",
    "- No usar la misma paleta salvo que el brief lo pida.",
    "- No usar el mismo orden exacto de secciones si no tiene sentido para el negocio.",
    "- No entregar una web que parezca Runia con otro logo.",
    "",
    "ESTANDAR OBLIGATORIO RUNIA WEB",
    "",
    "IDENTIDAD ANTES QUE ESTRUCTURA",
    "- Antes de proponer diseño, secciones o arquitectura, definir internamente: personalidad de marca, posicionamiento, emociones a transmitir, percepcion buscada, estilo visual y tono de comunicacion.",
    "- Construir la web alrededor de esa identidad, no alrededor de una estructura prearmada.",
    "- No reutilizar automaticamente la estructura de Runia Web.",
    "- No replicar la misma web cambiando colores y textos.",
    "- Cada proyecto debe sentirse propio.",
    "- Pregunta interna obligatoria: ¿Por que esta web no podria pertenecer a otro cliente?",
    "- Si la respuesta no es evidente, la propuesta no esta suficientemente personalizada.",
    "",
    "EXPERIENCIA VISUAL",
    "- Cada proyecto debe tener identidad visual propia.",
    "- Se permite reutilizar componentes, sistema de diseño y metodologia.",
    "- No reutilizar narrativa, jerarquias, storytelling ni disposicion general.",
    "- Evitar el efecto plantilla con otro logo.",
    "",
    "ESTANDAR TECNICO OBLIGATORIO",
    "- Toda web debe salir lista para produccion desde el inicio.",
    "- Implementar SEO tecnico basico.",
    "- Incluir sitemap.xml.",
    "- Incluir robots.txt.",
    "- Configurar canonical.",
    "- Configurar Open Graph.",
    "- Configurar Twitter Cards.",
    "- Usar metadata optimizada.",
    "- Usar estructura semantica correcta.",
    "- Garantizar responsive completo y mobile first.",
    "- Implementar lazy loading cuando corresponda.",
    "- Optimizar imagenes.",
    "- Cuidar Core Web Vitals.",
    "- Aplicar buenas practicas de indexacion.",
    "",
    "GOOGLE",
    "- Dejar la estructura preparada para Google Search Console.",
    "- Dejar la estructura preparada para Google Analytics.",
    "- Dejar la estructura preparada para Google Business Profile cuando aplique.",
    "",
    "TRACKING",
    "- Preparar eventos claros y escalables para formularios, WhatsApp, reservas, contacto y acciones principales del negocio.",
    "- Nombrar los eventos de forma legible y mantenible.",
    "",
    "LEGAL",
    "- Crear /privacidad.",
    "- Crear /cookies.",
    "- Crear /terminos.",
    "- Mantener la identidad visual del proyecto en esas paginas.",
    "- No usar plantillas genericas.",
    "- Adaptar el contenido legal al tipo de negocio.",
    "",
    "RENDIMIENTO",
    "- La velocidad forma parte del producto.",
    "- Optimizar imagenes, fuentes, carga inicial y recursos criticos.",
    "- Objetivo: experiencia rapida en desktop y mobile.",
    "",
    "MOBILE",
    "- La experiencia mobile tiene prioridad.",
    "- Verificar navegacion, targets tactiles, formularios, legibilidad, scroll y rendimiento.",
    "",
    "SEO LOCAL",
    "- Si el negocio tiene ubicacion fisica, preparar estructura para SEO local.",
    "- Considerar schema, direccion, ciudad, datos de contacto y mapas.",
    "",
    "REGLA PARA CADA SECCION",
    "- Antes de generar cualquier seccion, preguntarse: ¿Esta seccion ayuda a transmitir la identidad del negocio?",
    "- Si la respuesta es no, esa seccion no debe existir.",
    "",
    "MANTENER DEL SISTEMA RUNIA:",
    "- estructura comercial clara",
    "- performance",
    "- responsive",
    "- accesibilidad basica",
    "- CTAs visibles",
    "- WhatsApp/formularios",
    "- navegacion simple",
    "- jerarquia visual",
    "- modularidad",
    "- SEO basico",
    "- codigo limpio",
    "",
    "CREAR PARA EL CLIENTE:",
    "- identidad visual propia",
    "- paleta adaptada a su marca/rubro",
    "- composicion de hero personalizada",
    "- tono visual acorde al negocio",
    "- secciones adaptadas a su objetivo",
    "- recursos graficos coherentes",
    "- experiencia visual diferenciada",
    "",
    "OBJETIVO DEL PROYECTO",
    objective,
    "",
    "DATOS DEL NEGOCIO",
    `- Nombre: ${company}`,
    `- Rubro: ${industry}`,
    `- Ubicación: ${valueOrGuidance(brief.location, "No especificada. No inventar direcciones ni zonas.")}`,
    `- WhatsApp: ${valueOrGuidance(brief.whatsapp, "No disponible. Mantener CTA de contacto editable sin inventar numero.")}`,
    `- Email: ${valueOrGuidance(brief.email, "No disponible. No inventar email.")}`,
    `- Dominio / web actual: ${valueOrGuidance([brief.domain, brief.currentWebsite].filter(Boolean), "No declarado. No inventar dominio.")}`,
    "",
    "PÚBLICO OBJETIVO",
    audience,
    "",
    "SERVICIOS / PRODUCTOS",
    `- Qué ofrece: ${valueOrGuidance(brief.offer, "No especificado. Redactar de forma general y editable.")}`,
    `- Servicios: ${services}`,
    `- Productos: ${products}`,
    "",
    "DIFERENCIALES",
    differential,
    "",
    "IDENTIDAD A CONSTRUIR",
    ...aesthetics.map((item) => `- ${item}`),
    `- Tipo de cliente ideal: ${audience}`,
    `- Rubro: ${industry}`,
    `- Diferencial: ${differential}`,
    "",
    "MATERIALES DISPONIBLES",
    ...materials.map((item) => `- ${item}`),
    "",
    "FUNCIONALIDADES",
    `- ${features}`,
    `- Formulario: ${includesValue(brief.features, "formulario") ? "Incluir formulario funcional." : "Incluir solo si aporta claridad al contacto."}`,
    `- Mapa: ${includesValue(brief.features, "mapa") ? "Incluir mapa o bloque de ubicación." : "No incluir mapa si no hay ubicación real."}`,
    `- Catálogo: ${includesValue(brief.features, "catálogo") || includesValue(brief.features, "catalogo") ? "Incluir sección de catálogo/productos." : "No crear catálogo inventado."}`,
    `- Automatización futura: ${includesValue(brief.features, "automatización") || includesValue(brief.features, "IA") ? "Dejar arquitectura preparada para automatizaciones futuras." : "No agregar automatizaciones no pedidas."}`,
    "",
    "CTA PRINCIPAL",
    cta,
    "",
    "ESTRUCTURA",
    "Definir el orden de secciones segun la identidad y el objetivo comercial del cliente. Elegir solo las necesarias.",
    "Las siguientes secciones son posibilidades, no una estructura obligatoria. No incluir una seccion si no refuerza la identidad del negocio o la conversion.",
    "Secciones posibles:",
    "- Hero comercial",
    "- Problema / oportunidad",
    "- Servicios",
    "- Productos",
    "- Beneficios",
    "- Diferenciales",
    "- Proceso",
    "- Galeria / portfolio",
    "- Testimonios",
    "- Ubicacion",
    "- FAQ",
    "- Contacto",
    "",
    "SECCIONES SUGERIDAS SEGUN ESTE BRIEF",
    `${buildSections(brief).join(", ")}. Revisarlas criticamente: eliminar o reemplazar cualquier seccion que no ayude a transmitir la identidad del negocio.`,
    "",
    "CAMPOS FALTANTES",
    "- Si faltan datos, no mostrar guiones.",
    "- No mostrar placeholders visibles en la web final.",
    "- No inventar direcciones.",
    "- No inventar testimonios.",
    "- No inventar datos comerciales.",
    "- Utilizar copy neutro y profesional basado en la información disponible.",
    "",
    "VALIDACIONES",
    "- Verificar que la web no parezca copia de Runia Web.",
    "- Revisar que tenga identidad visual propia.",
    "- Responsive completo",
    "- CTA visibles",
    "- Formularios funcionando",
    "- WhatsApp visible si hay numero disponible",
    "- Legal: /privacidad, /cookies y /terminos creadas y adaptadas al rubro",
    "- SEO tecnico: sitemap.xml, robots.txt, canonical, metadata, Open Graph y Twitter Cards",
    "- Google: estructura preparada para Search Console, Analytics y Business Profile si aplica",
    "- Tracking: eventos preparados para WhatsApp, formularios, reservas, contacto y CTA principales",
    "- Performance: imagenes, fuentes, carga inicial y recursos criticos optimizados",
    "- Mobile first verificado en navegacion, formularios, legibilidad y targets tactiles",
    "- SEO local preparado si hay ubicacion fisica",
    "- Sin textos de relleno",
    "- Sin placeholders visibles",
    "- Estetica coherente con el rubro",
    "- Confirmar que cada seccion existe por una razon de identidad, conversion o informacion necesaria"
  ].join("\n");
};

const buildSections = (brief) => {
  const sections = ["Hero comercial"];
  if (includesValue(brief.objectives, "captar consultas")) sections.push("Problema / oportunidad");
  if (hasAnyText(brief.services, brief.offer)) sections.push("Servicios");
  if (hasAnyText(brief.products) || includesValue(brief.objectives, "productos") || includesValue(brief.features, "catálogo") || includesValue(brief.features, "catalogo")) sections.push("Productos / catálogo");
  sections.push("Beneficios", "Diferenciales");
  if (includesValue(brief.objectives, "vender")) sections.push("Bloque de conversión");
  if (hasAnyText(brief.photoLinks, brief.socials, brief.instagram)) sections.push("Galería / portfolio");
  sections.push("Proceso");
  if (includesValue(brief.features, "mapa")) sections.push("Ubicación / mapa");
  if (includesValue(brief.features, "agenda")) sections.push("Agenda / reserva");
  sections.push("FAQ", "Contacto");
  return sections;
};

const app = {
  briefs: [],
  crmLeads: [],
  budgets: [],
  projects: [],
  selectedId: null,
  activeSection: "crm",
  statuses: readStorage(STATUS_KEY, {})
};

const renderLoginState = () => {
  const authenticated = localStorage.getItem(SESSION_KEY) === "true";
  $("[data-login-view]").hidden = authenticated;
  $("[data-dashboard-view]").hidden = !authenticated;
  if (authenticated) {
    renderAdminSection(app.activeSection);
    loadBriefs();
    loadCrmLeads();
    loadBudgets();
    loadProjects();
    renderOriginOptions();
  }
};

const setConnection = (state, title, message) => {
  const card = $("[data-connection-card]");
  card.classList.toggle("is-ready", state === "ready");
  card.classList.toggle("is-error", state === "error");
  $("[data-connection-title]").textContent = title;
  $("[data-connection-message]").textContent = message;
};

const renderAdminSection = (section) => {
  app.activeSection = section;
  $$("[data-admin-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.adminTab === section));
  $$("[data-admin-section]").forEach((element) => element.classList.toggle("is-active", element.dataset.adminSection === section));
};

const setCrmConnection = (state, title, message) => {
  const card = $("[data-crm-connection-card]");
  if (!card) return;
  card.classList.toggle("is-ready", state === "ready");
  card.classList.toggle("is-error", state === "error");
  $("[data-crm-connection-title]").textContent = title;
  $("[data-crm-connection-message]").textContent = message;
};

const setBudgetConnection = (state, title, message) => {
  const card = $("[data-budget-connection-card]");
  if (!card) return;
  card.classList.toggle("is-ready", state === "ready");
  card.classList.toggle("is-error", state === "error");
  $("[data-budget-connection-title]").textContent = title;
  $("[data-budget-connection-message]").textContent = message;
};
const setProjectConnection = (state, title, message) => {
  const card = $("[data-project-connection-card]");
  if (!card) return;
  card.classList.toggle("is-ready", state === "ready");
  card.classList.toggle("is-error", state === "error");
  $("[data-project-connection-title]").textContent = title;
  $("[data-project-connection-message]").textContent = message;
};
const getStatus = (brief) => app.statuses[brief.id] || brief.status || "Nuevo";

const setStatus = (briefId, status) => {
  app.statuses[briefId] = status;
  writeStorage(STATUS_KEY, app.statuses);
  renderDashboard();
  if (app.selectedId === briefId) renderDetail(app.briefs.find((brief) => brief.id === briefId));
};

const setStatusMessage = (message, state = "") => {
  const element = $("[data-status-message]");
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-saving", state === "saving");
  element.classList.toggle("is-success", state === "success");
  element.classList.toggle("is-error", state === "error");
};

const fetchBriefs = async () => {
  if (!hasConfiguredApi()) {
    setConnection("empty", "Sin configurar", "Conectá tu Google Apps Script para ver briefs reales.");
    return [];
  }

  const url = `${ADMIN_API_URL}?action=listBriefs&token=${encodeURIComponent(ADMIN_API_TOKEN)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Apps Script respondió ${response.status}`);
  const data = await response.json();
  const list = Array.isArray(data) ? data : data.briefs || data.data || data.rows || [];
  return list.map(normalizeBrief);
};

const persistBriefStatus = async (briefId, status) => {
  if (!hasConfiguredApi()) {
    return { success: false, error: "Endpoint no configurado" };
  }

  const url = `${ADMIN_API_URL}?action=updateBriefStatus&token=${encodeURIComponent(ADMIN_API_TOKEN)}&id=${encodeURIComponent(briefId)}&estado=${encodeURIComponent(status)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Apps Script respondió ${response.status}`);
  return response.json();
};

const adminApiGet = async (action, params = {}) => {
  const search = new URLSearchParams({ action, token: ADMIN_API_TOKEN, ...params });
  const response = await fetch(`${ADMIN_API_URL}?${search.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Apps Script respondió ${response.status}`);
  return response.json();
};

const normalizeCrmLead = (raw, index) => ({
  id: String(getFirst(raw, ["id"], `crm-${index}`)),
  date: getFirst(raw, ["fecha", "created_at"], ""),
  name: getFirst(raw, ["nombre", "name"], ""),
  company: getFirst(raw, ["empresa", "company"], ""),
  whatsapp: getFirst(raw, ["whatsapp"], ""),
  email: getFirst(raw, ["email"], ""),
  origin: getFirst(raw, ["origen", "origin"], "Otro"),
  estimatedValue: getFirst(raw, ["valor_estimado", "estimatedValue"], ""),
  notes: getFirst(raw, ["notas", "notes"], ""),
  status: getFirst(raw, ["estado", "status"], "Nuevo"),
  briefStatus: getFirst(raw, ["brief_status"], ""),
  briefBudgetId: getFirst(raw, ["brief_budget_id"], ""),
  productionStatus: getFirst(raw, ["production_status"], ""),
  projectId: getFirst(raw, ["project_id"], ""),
  createdAt: getFirst(raw, ["created_at"], ""),
  updatedAt: getFirst(raw, ["updated_at"], "")
});

const fetchCrmLeads = async () => {
  if (!hasConfiguredApi()) {
    setCrmConnection("error", "Sin configurar", "Conectá Apps Script para cargar CRM Leads.");
    return [];
  }
  const data = await adminApiGet("listCrmLeads");
  if (!data.success) throw new Error(data.error || "No se pudieron cargar leads");
  return (data.leads || []).map(normalizeCrmLead);
};

const loadCrmLeads = async () => {
  const status = $("[data-crm-status]");
  if (status) status.textContent = "Cargando leads...";
  try {
    app.crmLeads = await fetchCrmLeads();
    setCrmConnection("ready", "Conectado", `${app.crmLeads.length} leads cargados.`);
  } catch (error) {
    console.error(error);
    app.crmLeads = [];
    setCrmConnection("error", "Error CRM", "No se pudieron cargar leads desde Apps Script.");
  }
  renderCrm();
};

const updateCrmLeadStatus = async (leadId, nextStatus) => {
  const result = await adminApiGet("updateCrmLeadStatus", { id: leadId, estado: nextStatus });
  if (!result.success) throw new Error(result.error || "No se pudo actualizar lead");
  const lead = app.crmLeads.find((item) => item.id === leadId);
  if (lead) lead.status = nextStatus;
  renderCrm();
};

const normalizeBudget = (raw, index) => ({
  id: String(getFirst(raw, ["budget_id", "id"], `budget-${index}`)),
  leadId: String(getFirst(raw, ["lead_id", "leadId"], "")),
  reference: getFirst(raw, ["referencia", "reference"], ""),
  date: getFirst(raw, ["created_at", "timestamp"], ""),
  updatedAt: getFirst(raw, ["updated_at"], ""),
  mode: getFirst(raw, ["modo", "budgetMode"], ""),
  client: getFirst(raw, ["cliente", "client"], ""),
  company: getFirst(raw, ["empresa", "company"], ""),
  industry: getFirst(raw, ["rubro", "industry"], ""),
  partner: getFirst(raw, ["partner_name", "vendedor_partner", "seller"], ""),
  brand: getFirst(raw, ["marca_pdf"], ""),
  plan: getFirst(raw, ["plan"], ""),
  totalInitial: getFirst(raw, ["total_inicial", "inversion_inicial_usd"], ""),
  totalMonthly: getFirst(raw, ["total_mensual", "mensual_usd"], ""),
  partnerPrice: getFirst(raw, ["precio_partner"], ""),
  partnerMargin: getFirst(raw, ["margen_partner"], ""),
  status: getFirst(raw, ["estado", "status"], "Borrador"),
  shareUrl: getFirst(raw, ["share_url"], ""),
  payload: parseMaybeJson(getFirst(raw, ["payload_json"], "")) || {}
});

const formatUsd = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "-";
  return `USD ${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

const fetchBudgets = async () => {
  if (!hasConfiguredApi()) {
    setBudgetConnection("error", "Sin configurar", "Conectá Apps Script para cargar presupuestos.");
    return [];
  }
  const data = await adminApiGet("listBudgets");
  if (!data.success) throw new Error(data.error || "No se pudieron cargar presupuestos");
  return (data.budgets || []).map(normalizeBudget);
};

const loadBudgets = async () => {
  const status = $("[data-budget-status]");
  if (status) status.textContent = "Cargando presupuestos...";
  try {
    app.budgets = await fetchBudgets();
    setBudgetConnection("ready", "Conectado", `${app.budgets.length} presupuestos cargados.`);
  } catch (error) {
    console.error(error);
    app.budgets = [];
    setBudgetConnection("error", "Error", "No se pudieron cargar presupuestos desde Apps Script.");
  }
  renderBudgets();
  renderCrm();
};

const renderBudgetMetrics = () => {
  const counts = app.budgets.reduce((acc, budget) => {
    acc.total += 1;
    if (budget.status === "Borrador") acc.borrador += 1;
    if (budget.status === "Enviado") acc.enviado += 1;
    if (budget.status === "Aprobado") acc.aprobado += 1;
    if (budget.status === "Rechazado") acc.rechazado += 1;
    return acc;
  }, { total: 0, borrador: 0, enviado: 0, aprobado: 0, rechazado: 0 });

  Object.entries(counts).forEach(([key, value]) => {
    const element = $(`[data-budget-metric='${key}']`);
    if (element) element.textContent = value;
  });
};

const renderBudgets = () => {
  renderBudgetMetrics();
  const rows = $("[data-budget-rows]");
  const empty = $("[data-budget-empty]");
  const tableWrap = $("[data-budget-table-wrap]");
  const status = $("[data-budget-status]");
  if (!rows || !empty || !tableWrap) return;

  if (!app.budgets.length) {
    rows.innerHTML = "";
    empty.hidden = false;
    tableWrap.hidden = true;
    if (status) status.textContent = "Sin presupuestos cargados.";
    return;
  }

  empty.hidden = true;
  tableWrap.hidden = false;
  if (status) status.textContent = `${app.budgets.length} presupuestos cargados.`;
  rows.innerHTML = app.budgets.map((budget) => `
    <tr>
      <td>${escapeHtml(formatDate(budget.date))}</td>
      <td><strong>${escapeHtml(budget.reference || budget.id)}</strong></td>
      <td>${escapeHtml(budget.client || "-")}</td>
      <td>${escapeHtml(budget.company || "-")}</td>
      <td>${escapeHtml(budget.plan || "-")}</td>
      <td>${escapeHtml(formatUsd(budget.totalInitial))}</td>
      <td>${escapeHtml(budget.totalMonthly ? `${formatUsd(budget.totalMonthly)}/mes` : "-")}</td>
      <td>${escapeHtml(budget.mode || "-")}</td>
      <td>${escapeHtml(budget.partner || "-")}</td>
      <td>
        <select class="budget-status-select" data-budget-status-select data-budget-id="${escapeHtml(budget.id)}">
          ${BUDGET_STATES.map((state) => `<option value="${escapeHtml(state)}" ${state === budget.status ? "selected" : ""}>${escapeHtml(state)}</option>`).join("")}
        </select>
      </td>
    </tr>
  `).join("");
};

const updateBudgetStatus = async (budgetId, nextStatus) => {
  const result = await adminApiGet("updateBudgetStatus", { budget_id: budgetId, estado: nextStatus });
  if (!result.success) throw new Error(result.error || "No se pudo actualizar presupuesto");
  const budget = app.budgets.find((item) => item.id === budgetId);
  if (budget) budget.status = nextStatus;
  renderBudgets();
};
const normalizeProject = (raw, index) => ({
  id: String(getFirst(raw, ["project_id", "id"], "project-" + index)),
  leadId: String(getFirst(raw, ["lead_id", "leadId"], "")),
  budgetId: String(getFirst(raw, ["budget_id", "budgetId"], "")),
  briefId: String(getFirst(raw, ["brief_id", "briefId"], "")),
  reference: getFirst(raw, ["referencia_presupuesto", "referencia"], ""),
  client: getFirst(raw, ["cliente", "client"], ""),
  company: getFirst(raw, ["empresa", "company"], ""),
  industry: getFirst(raw, ["rubro", "industry"], ""),
  type: getFirst(raw, ["tipo_proyecto", "plan"], ""),
  status: getFirst(raw, ["estado_produccion", "status"], "Pendiente de inicio"),
  owner: getFirst(raw, ["responsable"], ""),
  priority: getFirst(raw, ["prioridad"], ""),
  startDate: getFirst(raw, ["fecha_inicio"], ""),
  dueDate: getFirst(raw, ["fecha_entrega_estimada"], ""),
  createdAt: getFirst(raw, ["created_at"], ""),
  updatedAt: getFirst(raw, ["updated_at"], "")
});

const fetchProjects = async () => {
  if (!hasConfiguredApi()) {
    setProjectConnection("error", "Sin configurar", "Conectá Apps Script para cargar proyectos.");
    return [];
  }
  const data = await adminApiGet("listProjects");
  if (!data.success) throw new Error(data.error || "No se pudieron cargar proyectos");
  return (data.projects || []).map(normalizeProject);
};

const loadProjects = async () => {
  const status = $("[data-project-status]");
  if (status) status.textContent = "Cargando proyectos...";
  try {
    app.projects = await fetchProjects();
    setProjectConnection("ready", "Conectado", app.projects.length + " proyectos cargados.");
  } catch (error) {
    console.error(error);
    app.projects = [];
    setProjectConnection("error", "Error", "No se pudieron cargar proyectos desde Apps Script.");
  }
  renderProjects();
  renderDashboard();
};

const getProjectByBriefId = (briefId) => app.projects.find((project) => project.briefId === briefId);

const renderProjectMetrics = () => {
  const counts = app.projects.reduce((acc, project) => {
    acc.total += 1;
    if (project.status === "Pendiente de inicio") acc.pendiente += 1;
    if (project.status === "En producción") acc.produccion += 1;
    if (project.status === "En revisión") acc.revision += 1;
    if (project.status === "Entregado") acc.entregado += 1;
    return acc;
  }, { total: 0, pendiente: 0, produccion: 0, revision: 0, entregado: 0 });

  Object.entries(counts).forEach(([key, value]) => {
    const element = $(`[data-project-metric='${key}']`);
    if (element) element.textContent = value;
  });
};

const renderProjects = () => {
  renderProjectMetrics();
  const rows = $("[data-project-rows]");
  const empty = $("[data-project-empty]");
  const tableWrap = $("[data-project-table-wrap]");
  const status = $("[data-project-status]");
  if (!rows || !empty || !tableWrap) return;

  if (!app.projects.length) {
    rows.innerHTML = "";
    empty.hidden = false;
    tableWrap.hidden = true;
    if (status) status.textContent = "Sin proyectos cargados.";
    return;
  }

  empty.hidden = true;
  tableWrap.hidden = false;
  if (status) status.textContent = app.projects.length + " proyectos cargados.";
  rows.innerHTML = app.projects.map((project) => `
    <tr>
      <td><strong>${escapeHtml(project.company || "-")}</strong></td>
      <td>${escapeHtml(project.client || "-")}</td>
      <td>${escapeHtml(project.type || "-")}</td>
      <td>${escapeHtml(project.reference || project.budgetId || "-")}</td>
      <td>
        <select class="budget-status-select" data-project-status-select data-project-id="${escapeHtml(project.id)}">
          ${PROJECT_STATES.map((state) => `<option value="${escapeHtml(state)}" ${state === project.status ? "selected" : ""}>${escapeHtml(state)}</option>`).join("")}
        </select>
      </td>
      <td>${escapeHtml(project.owner || "-")}</td>
      <td>${escapeHtml(formatDate(project.dueDate))}</td>
    </tr>
  `).join("");
};

const updateProjectStatus = async (projectId, nextStatus) => {
  const result = await adminApiGet("updateProjectStatus", { project_id: projectId, estado_produccion: nextStatus });
  if (!result.success) throw new Error(result.error || "No se pudo actualizar proyecto");
  const project = app.projects.find((item) => item.id === projectId);
  if (project) project.status = nextStatus;
  renderProjects();
};

const createProjectFromBrief = async (briefId) => {
  const result = await adminApiGet("createProjectFromBrief", { brief_id: briefId });
  if (!result.success) throw new Error(result.error || "No se pudo crear proyecto");
  await loadProjects();
  return result;
};
const getLeadBudgets = (leadId) => app.budgets.filter((budget) => budget.leadId === leadId);

const getDefaultBriefBudget = (leadId) => {
  const budgets = getLeadBudgets(leadId);
  if (budgets.length === 1) return budgets[0];
  const approved = budgets.filter((budget) => budget.status === "Aprobado");
  if (approved.length === 1) return approved[0];
  return null;
};

const buildBriefUrl = (leadId, budgetId = "") => {
  const url = new URL("../brief/", window.location.href);
  url.searchParams.set("lead_id", leadId);
  if (budgetId) url.searchParams.set("budget_id", budgetId);
  return url.toString();
};

const renderBriefAction = (lead) => {
  if (!["ganado", "ganada", "won"].includes(slugStatus(lead.status || ""))) return "";
  const budgets = getLeadBudgets(lead.id);
  const defaultBudget = getDefaultBriefBudget(lead.id);
  const needsSelector = budgets.length > 1 && !defaultBudget;
  const options = budgets.map((budget) => {
    const label = [budget.reference || budget.id, budget.plan, formatUsd(budget.totalInitial), budget.status].filter(Boolean).join(" · ");
    return '<option value="' + escapeHtml(budget.id) + '">' + escapeHtml(label) + '</option>';
  }).join("");
  const selectedBudgetId = defaultBudget?.id || budgets[0]?.id || "";
  return [
    '<div class="lead-brief-panel" data-brief-panel>',
    needsSelector ? '<label><span>Presupuesto</span><select data-brief-budget-select>' + options + '</select></label>' : "",
    '<button class="button button-light brief-button" type="button" data-generate-brief data-budget-id="' + escapeHtml(selectedBudgetId) + '">Enviar Brief</button>',
    '<p class="lead-save-message" data-brief-link-message></p>',
    '</div>'
  ].join("");
};
const sendBriefLinkForLead = async (leadId, budgetId, card) => {
  const lead = app.crmLeads.find((item) => item.id === leadId);
  const budget = app.budgets.find((item) => item.id === budgetId);
  const url = buildBriefUrl(leadId, budgetId);
  const message = $("[data-brief-link-message]", card);
  const reference = budget?.reference || budget?.id || "";
  if (message) message.textContent = "Generando link...";

  try { await navigator.clipboard.writeText(url); } catch (error) { console.warn("No se pudo copiar el link de brief", error); }

  try {
    const note = "Brief enviado al cliente" + (reference ? " con presupuesto " + reference : "") + ". Link: " + url;
    await adminApiGet("addCrmLeadNote", { id: leadId, nota: note });
    await adminApiGet("updateCrmLeadBriefStatus", { lead_id: leadId, budget_id: budgetId || "", brief_status: "enviado", referencia: reference });
    if (lead) {
      lead.briefStatus = "enviado";
      lead.notes = (lead.notes || "") + (lead.notes ? "\n" : "") + new Date().toISOString() + " - " + note;
    }
  } catch (error) {
    console.error(error);
    if (message) message.textContent = "Link copiado, pero no se pudo guardar la nota.";
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  if (message) message.textContent = "Link copiado y abierto.";
  window.open(url, "_blank", "noopener,noreferrer");
  await loadCrmLeads();
};
const loadBriefs = async () => {
  $("[data-table-status]").textContent = "Cargando briefs...";
  try {
    app.briefs = await fetchBriefs();
    if (hasConfiguredApi()) setConnection("ready", "Conectado", `${app.briefs.length} briefs recibidos.`);
  } catch (error) {
    console.error(error);
    app.briefs = [];
    setConnection("error", "Error de lectura", "No se pudieron cargar los briefs desde Apps Script.");
  }
  renderDashboard();
};

const renderMetrics = () => {
  const counts = app.briefs.reduce((acc, brief) => {
    const status = getStatus(brief);
    acc.total += 1;
    if (status === "Nuevo") acc.nuevo += 1;
    if (status === "En producción") acc.produccion += 1;
    if (status === "Entregado") acc.entregado += 1;
    return acc;
  }, { total: 0, nuevo: 0, produccion: 0, entregado: 0 });

  $("[data-metric='total']").textContent = counts.total;
  $("[data-metric='nuevo']").textContent = counts.nuevo;
  $("[data-metric='produccion']").textContent = counts.produccion;
  $("[data-metric='entregado']").textContent = counts.entregado;
};

const canCreateProjectFromBrief = (brief) => {
  if (!brief) return false;
  return hasAnyText(
    brief.company,
    brief.client,
    brief.whatsapp,
    brief.email,
    brief.industry,
    getFirst(brief.source || {}, ["lead_id", "budget_id", "referencia_presupuesto"])
  );
};

const renderBriefProjectAction = (brief) => {
  const project = getProjectByBriefId(brief.id);
  const openButton = '<button class="button button-soft" type="button" data-open-brief="' + escapeHtml(brief.id) + '">Ver brief</button>';
  if (project) {
    return '<div class="brief-row-actions">' + openButton + '<span class="status-pill is-entregado">Proyecto creado</span></div>';
  }
  if (!canCreateProjectFromBrief(brief)) {
    return '<div class="brief-row-actions">' + openButton + '<span class="muted-inline">Faltan datos</span></div>';
  }
  return '<div class="brief-row-actions">' + openButton + '<button class="button button-light" type="button" data-create-project="' + escapeHtml(brief.id) + '">Crear proyecto</button></div>';
};

const renderDashboard = () => {
  renderMetrics();
  const rows = $("[data-brief-rows]");
  const empty = $("[data-empty-state]");
  const tableWrap = $("[data-table-wrap]");

  if (!app.briefs.length) {
    rows.innerHTML = "";
    empty.hidden = false;
    tableWrap.hidden = true;
    $("[data-table-status]").textContent = hasConfiguredApi() ? "No hay briefs para mostrar." : "Esperando configuración.";
    return;
  }

  empty.hidden = true;
  tableWrap.hidden = false;
  $("[data-table-status]").textContent = `${app.briefs.length} briefs cargados.`;
  rows.innerHTML = app.briefs.map((brief) => {
    const status = getStatus(brief);
    return `
      <tr>
        <td>${escapeHtml(formatDate(brief.date))}</td>
        <td><strong>${escapeHtml(brief.company || "-")}</strong></td>
        <td>${escapeHtml(brief.client || "-")}</td>
        <td>${escapeHtml(brief.industry || "-")}</td>
        <td>${escapeHtml(brief.whatsapp || "-")}</td>
        <td><span class="status-pill is-${escapeHtml(slugStatus(status))}">${escapeHtml(status)}</span></td>
        <td>${renderBriefProjectAction(brief)}</td>
      </tr>
    `;
  }).join("");
};

const renderOriginOptions = () => {
  const select = $("[data-origin-select]");
  if (!select) return;
  select.innerHTML = CRM_ORIGINS.map((origin) => `<option value="${escapeHtml(origin)}">${escapeHtml(origin)}</option>`).join("");
};

const parseNotes = (notes) => String(notes || "").split("\n").map((note) => note.trim()).filter(Boolean);

const renderCrmMetrics = () => {
  const counts = app.crmLeads.reduce((acc, lead) => {
    acc.total += 1;
    if (lead.status === "Nuevo") acc.nuevo += 1;
    if (lead.status === "Propuesta") acc.propuesta += 1;
    if (lead.status === "Ganado") acc.ganado += 1;
    if (lead.status === "Perdido") acc.perdido += 1;
    return acc;
  }, { total: 0, nuevo: 0, propuesta: 0, ganado: 0, perdido: 0 });

  Object.entries(counts).forEach(([key, value]) => {
    const element = $(`[data-crm-metric='${key}']`);
    if (element) element.textContent = value;
  });
};

const renderCrm = () => {
  renderCrmMetrics();
  const board = $("[data-kanban-board]");
  const empty = $("[data-crm-empty]");
  const status = $("[data-crm-status]");
  if (!board) return;

  empty.hidden = app.crmLeads.length > 0;
  board.hidden = app.crmLeads.length === 0;
  if (status) status.textContent = app.crmLeads.length ? `${app.crmLeads.length} leads cargados.` : "Sin leads cargados.";

  board.innerHTML = CRM_STATES.map((state) => {
    const leads = app.crmLeads.filter((lead) => lead.status === state);
    return `
      <section class="kanban-column is-${escapeHtml(slugStatus(state))}" data-kanban-state="${escapeHtml(state)}">
        <h3>${escapeHtml(state)} <span>${leads.length}</span></h3>
        <div class="lead-list" data-lead-list>
          ${leads.map(renderLeadCard).join("")}
        </div>
      </section>
    `;
  }).join("");
};

const renderLeadCard = (lead) => {
  const notes = parseNotes(lead.notes);
  return `
    <article class="lead-card is-${escapeHtml(slugStatus(lead.status || "Nuevo"))} ${lead.status === "Ganado" ? "is-won" : ""}" data-lead-id="${escapeHtml(lead.id)}" draggable="true">
      <div>
        <strong>${escapeHtml(lead.company || lead.name || "Lead sin nombre")}</strong>
        <p>${escapeHtml(lead.name || "Contacto sin nombre")}</p>
      </div>
      <div class="lead-meta">
        <span>${escapeHtml(lead.origin || "Otro")} · ${escapeHtml(formatDate(lead.date))}</span>
        <span>${escapeHtml(lead.whatsapp || "Sin WhatsApp")}</span>
        <span>${escapeHtml(lead.email || "Sin email")}</span>
        <span>Valor: ${escapeHtml(lead.estimatedValue || "sin estimar")}</span>
        <span class="lead-budget-count">Presupuestos: ${app.budgets.filter((budget) => budget.leadId === lead.id).length}</span>
        ${lead.productionStatus ? `<span class="lead-budget-count">Producción: ${escapeHtml(lead.productionStatus)}</span>` : ""}
      </div>
      <select data-lead-status>
        ${CRM_STATES.map((state) => `<option value="${escapeHtml(state)}" ${state === lead.status ? "selected" : ""}>${escapeHtml(state)}</option>`).join("")}
      </select>
      <div class="lead-note-history">
        ${notes.length ? notes.map((note) => `<div class="lead-note">${escapeHtml(note)}</div>`).join("") : '<div class="lead-note">Sin notas cargadas.</div>'}
      </div>
      <form class="lead-note-form" data-note-form>
        <textarea name="note" placeholder="Agregar nota"></textarea>
        <button class="button button-soft small-copy" type="submit">Agregar nota</button>
      </form>
      ${renderBriefAction(lead)}
      <p class="lead-save-message" data-lead-message></p>
    </article>
  `;
};

const fieldRow = (label, value) => `<div class="field-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "-")}</strong></div>`;
const sectionRow = (label, value) => `<div class="brief-section"><span>${escapeHtml(label)}</span><p>${escapeHtml(value || "-")}</p></div>`;

const renderDetail = (brief) => {
  if (!brief) return;
  app.selectedId = brief.id;
  $("[data-brief-detail]").hidden = false;
  $("[data-detail-title]").textContent = brief.company || "Brief sin empresa";
  $("[data-detail-subtitle]").textContent = `${brief.industry || "Rubro sin definir"} · ${formatDate(brief.date)}`;

  $("[data-main-fields]").innerHTML = [
    fieldRow("Empresa", brief.company),
    fieldRow("Cliente", brief.client),
    fieldRow("Rubro", brief.industry),
    fieldRow("Ubicación", brief.location),
    fieldRow("WhatsApp", brief.whatsapp),
    fieldRow("Email", brief.email),
    fieldRow("Instagram", brief.instagram),
    fieldRow("Web actual", brief.currentWebsite),
    fieldRow("Dominio", brief.domain)
  ].join("");

  $("[data-operative-summary]").textContent = buildSummary(brief);
  const signals = getBriefSignals(brief);
  $("[data-completeness-signal]").innerHTML = `
    <span class="signal-pill is-${escapeHtml(signals.completeness.toLowerCase())}">${escapeHtml(signals.completeness)}</span>
    <p>${escapeHtml(signals.completeness === "Alto" ? "Tiene datos clave, estética y materiales suficientes para avanzar." : signals.completeness === "Medio" ? "Tiene base operativa, pero faltan estética o materiales para producir con menos fricción." : "Faltan datos clave como servicios, objetivo o contacto.")}</p>
  `;
  $("[data-risk-signal]").innerHTML = `
    <span class="signal-pill is-${escapeHtml(signals.risk.toLowerCase() === "bajo" ? "low" : signals.risk.toLowerCase() === "medio" ? "medium" : "high")}">${escapeHtml(signals.risk)}</span>
    <p>${escapeHtml(signals.risk === "Bajo" ? "Brief claro y materiales suficientes." : signals.risk === "Medio" ? "Faltan algunos materiales o copy; se puede avanzar con criterio." : "Faltan servicios, objetivo, branding o contacto. Conviene pedir información antes de producir.")}</p>
  `;
  $("[data-commercial-summary]").textContent = buildCommercialSummary(brief);
  $("[data-technical-summary]").textContent = buildTechnicalSummary(brief);

  $("[data-brief-sections]").innerHTML = [
    sectionRow("Objetivo", listText(brief.objectives)),
    sectionRow("Servicios / productos", [brief.offer, brief.services, brief.products].filter(Boolean).join("\n\n")),
    sectionRow("Identidad visual", [`Sensación: ${listText(brief.visualFeeling)}`, `Colores: ${brief.colors || "-"}`, `Referencias: ${brief.references || "-"}`, `Evitar: ${brief.donts || "-"}`].join("\n")),
    sectionRow("Materiales", [`Fotos: ${brief.photoLinks || "-"}`, `Logo: ${brief.logoLinks || "-"}`, `Textos: ${brief.currentTexts || "-"}`, `Videos: ${brief.videos || "-"}`, `Redes: ${brief.socials || "-"}`, `Otros: ${brief.otherFiles || "-"}`].join("\n")),
    sectionRow("Funcionalidades", listText(brief.features)),
    sectionRow("Comentarios", [brief.differential, brief.audience, brief.tone].filter(Boolean).join("\n\n"))
  ].join("");

  $("[data-checklist]").innerHTML = buildChecklist(brief).map((item) => `<li class="is-${item.status}">${escapeHtml(item.text)}</li>`).join("");
  $("[data-prompt-output]").textContent = buildPrompt(brief);

  const select = $("[data-status-select]");
  select.innerHTML = STATES.map((state) => `<option value="${escapeHtml(state)}">${escapeHtml(state)}</option>`).join("");
  select.value = getStatus(brief);
  setStatusMessage("", "");
  $("[data-brief-detail]").scrollIntoView({ behavior: "smooth", block: "start" });
};

document.addEventListener("submit", (event) => {
  if (!event.target.matches("[data-login-form]")) return;
  event.preventDefault();
  const password = new FormData(event.target).get("password");
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(SESSION_KEY, "true");
    $("[data-login-message]").textContent = "";
    renderLoginState();
    return;
  }
  $("[data-login-message]").textContent = "Contraseña incorrecta.";
});

document.addEventListener("click", async (event) => {
  const tabButton = event.target.closest("[data-admin-tab]");
  if (tabButton) {
    renderAdminSection(tabButton.dataset.adminTab);
    return;
  }

  if (event.target.closest("[data-new-lead]")) {
    $("[data-crm-form]").hidden = false;
    $("[data-crm-form-message]").textContent = "";
    return;
  }

  if (event.target.closest("[data-cancel-lead]")) {
    $("[data-crm-form]").hidden = true;
    $("[data-crm-form]").reset();
    return;
  }

  const openButton = event.target.closest("[data-open-brief]");
  if (openButton) {
    renderDetail(app.briefs.find((brief) => brief.id === openButton.dataset.openBrief));
    return;
  }
  const createProjectButton = event.target.closest("[data-create-project]");
  if (createProjectButton) {
    const briefId = createProjectButton.dataset.createProject;
    const originalText = createProjectButton.textContent;
    createProjectButton.disabled = true;
    createProjectButton.textContent = "Creando...";
    try {
      await createProjectFromBrief(briefId);
      await loadBriefs();
      renderAdminSection("production");
    } catch (error) {
      console.error(error);
      createProjectButton.textContent = "Error";
      window.setTimeout(() => { createProjectButton.textContent = originalText; }, 1600);
    } finally {
      createProjectButton.disabled = false;
    }
    return;
  }


  if (event.target.closest("[data-logout]")) {
    localStorage.removeItem(SESSION_KEY);
    app.selectedId = null;
    renderLoginState();
    return;
  }

  if (event.target.closest("[data-refresh]")) {
    await loadBriefs();
    await loadCrmLeads();
    await loadBudgets();
    await loadProjects();
    return;
  }

  const briefButton = event.target.closest("[data-generate-brief]");
  if (briefButton) {
    const card = briefButton.closest("[data-lead-id]");
    const leadId = card?.dataset.leadId || "";
    const select = card?.querySelector("[data-brief-budget-select]");
    const budgetId = select?.value || briefButton.dataset.budgetId || "";
    if (!leadId) return;
    briefButton.disabled = true;
    try {
      await sendBriefLinkForLead(leadId, budgetId, card);
    } finally {
      briefButton.disabled = false;
    }
    return;
  }

  if (event.target.closest("[data-close-detail]")) {
    $("[data-brief-detail]").hidden = true;
    app.selectedId = null;
    return;
  }

  if (event.target.closest("[data-copy-prompt]")) {
    const button = event.target.closest("[data-copy-prompt]");
    await navigator.clipboard.writeText($("[data-prompt-output]").textContent);
    button.textContent = "Copiado";
    window.setTimeout(() => { button.textContent = "Copiar"; }, 1600);
  }

  const summaryButton = event.target.closest("[data-copy-summary]");
  if (summaryButton) {
    const type = summaryButton.dataset.copySummary;
    const selector = type === "technical" ? "[data-technical-summary]" : "[data-commercial-summary]";
    await navigator.clipboard.writeText($(selector).textContent);
    const originalText = summaryButton.textContent;
    summaryButton.textContent = "Copiado";
    window.setTimeout(() => { summaryButton.textContent = originalText; }, 1600);
  }
});

document.addEventListener("change", async (event) => {
  const projectStatusSelect = event.target.closest("[data-project-status-select]");
  if (projectStatusSelect) {
    const projectId = projectStatusSelect.dataset.projectId;
    const nextStatus = projectStatusSelect.value;
    projectStatusSelect.disabled = true;
    try {
      await updateProjectStatus(projectId, nextStatus);
      await loadCrmLeads();
    } catch (error) {
      console.error(error);
      const status = $("[data-project-status]");
      if (status) status.textContent = "No se pudo guardar el estado del proyecto.";
    } finally {
      projectStatusSelect.disabled = false;
    }
    return;
  }

  const budgetStatusSelect = event.target.closest("[data-budget-status-select]");
  if (budgetStatusSelect) {
    const budgetId = budgetStatusSelect.dataset.budgetId;
    const nextStatus = budgetStatusSelect.value;
    budgetStatusSelect.disabled = true;
    try {
      await updateBudgetStatus(budgetId, nextStatus);
    } catch (error) {
      console.error(error);
      const status = $("[data-budget-status]");
      if (status) status.textContent = "No se pudo guardar el estado del presupuesto.";
    } finally {
      budgetStatusSelect.disabled = false;
    }
    return;
  }

  const leadStatusSelect = event.target.closest("[data-lead-status]");
  if (leadStatusSelect) {
    const card = leadStatusSelect.closest("[data-lead-id]");
    const leadId = card.dataset.leadId;
    const nextStatus = leadStatusSelect.value;
    const message = $("[data-lead-message]", card);
    if (message) message.textContent = "Guardando...";

    try {
      await updateCrmLeadStatus(leadId, nextStatus);
    } catch (error) {
      console.error(error);
      if (message) message.textContent = "No se pudo guardar el estado.";
    }
    return;
  }

  if (!event.target.matches("[data-status-select]") || !app.selectedId) return;
  const briefId = app.selectedId;
  const nextStatus = event.target.value;
  const brief = app.briefs.find((item) => item.id === briefId);

  setStatusMessage("Guardando...", "saving");
  app.statuses[briefId] = nextStatus;
  if (brief) brief.status = nextStatus;
  writeStorage(STATUS_KEY, app.statuses);
  renderDashboard();

  try {
    const result = await persistBriefStatus(briefId, nextStatus);
    if (!result.success) throw new Error(result.error || "No se pudo actualizar el estado");
    setStatusMessage("Guardado en Sheet", "success");
  } catch (error) {
    console.error(error);
    setStatusMessage("No se pudo guardar en Sheet. Quedó guardado localmente.", "error");
  }
});

document.addEventListener("dragstart", (event) => {
  const card = event.target.closest("[data-lead-id]");
  if (!card) return;
  if (event.target.closest("select, textarea, button, input")) {
    event.preventDefault();
    return;
  }

  card.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", card.dataset.leadId);
});

document.addEventListener("dragend", (event) => {
  const card = event.target.closest("[data-lead-id]");
  if (card) card.classList.remove("is-dragging");
  $$(".kanban-column").forEach((column) => column.classList.remove("is-drag-over"));
});

document.addEventListener("dragover", (event) => {
  const column = event.target.closest("[data-kanban-state]");
  if (!column) return;
  event.preventDefault();
  column.classList.add("is-drag-over");
  event.dataTransfer.dropEffect = "move";
});

document.addEventListener("dragleave", (event) => {
  const column = event.target.closest("[data-kanban-state]");
  if (!column || column.contains(event.relatedTarget)) return;
  column.classList.remove("is-drag-over");
});

document.addEventListener("drop", async (event) => {
  const column = event.target.closest("[data-kanban-state]");
  if (!column) return;
  event.preventDefault();
  column.classList.remove("is-drag-over");

  const leadId = event.dataTransfer.getData("text/plain");
  const nextStatus = column.dataset.kanbanState;
  const lead = app.crmLeads.find((item) => item.id === leadId);
  if (!lead || lead.status === nextStatus) return;

  const previousStatus = lead.status;
  lead.status = nextStatus;
  renderCrm();

  try {
    await updateCrmLeadStatus(leadId, nextStatus);
  } catch (error) {
    console.error(error);
    lead.status = previousStatus;
    renderCrm();
    const status = $("[data-crm-status]");
    if (status) status.textContent = "No se pudo guardar el movimiento.";
  }
});

document.addEventListener("submit", async (event) => {
  const crmForm = event.target.closest("[data-crm-form]");
  if (crmForm) {
    event.preventDefault();
    const message = $("[data-crm-form-message]");
    const submitButton = crmForm.querySelector('[type="submit"]');
    const data = Object.fromEntries(new FormData(crmForm).entries());
    if (message) message.textContent = "Guardando lead...";
    if (submitButton) submitButton.disabled = true;

    try {
      const result = await adminApiGet("createCrmLead", {
        nombre: data.name || "",
        empresa: data.company || "",
        whatsapp: data.whatsapp || "",
        email: data.email || "",
        origen: data.origin || "Otro",
        valor_estimado: data.estimatedValue || "",
        notas: data.notes || "",
        estado: "Nuevo"
      });
      if (!result.success) throw new Error(result.error || "No se pudo crear lead");
      crmForm.reset();
      crmForm.hidden = true;
      await loadCrmLeads();
    } catch (error) {
      console.error(error);
      if (message) message.textContent = "No se pudo guardar el lead.";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
    return;
  }

  const noteForm = event.target.closest("[data-note-form]");
  if (noteForm) {
    event.preventDefault();
    const card = noteForm.closest("[data-lead-id]");
    const leadId = card.dataset.leadId;
    const note = new FormData(noteForm).get("note");
    const message = $("[data-lead-message]", card);
    if (!String(note || "").trim()) return;
    if (message) message.textContent = "Guardando nota...";

    try {
      const result = await adminApiGet("addCrmLeadNote", { id: leadId, nota: note });
      if (!result.success) throw new Error(result.error || "No se pudo agregar nota");
      await loadCrmLeads();
    } catch (error) {
      console.error(error);
      if (message) message.textContent = "No se pudo guardar la nota.";
    }
  }
});

renderLoginState();
