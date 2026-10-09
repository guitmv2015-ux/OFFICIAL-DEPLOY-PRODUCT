/**
 * HOLLOWPAW — Core Serverless de Tracking, TikTok Events API, Meta CAPI, Webhooks e UTMify
 * ========================================================================================
 * Compatível com Vercel Serverless Functions (Node.js 18/20/24+) e ambiente local.
 * Nenhuma credencial fica no código: todas as chaves vêm exclusivamente de `process.env`.
 * Nenhum dado pessoal (PII) em texto aberto é gravado em disco ou retornado em respostas HTTP.
 */
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

function loadDotEnvIfNeeded() {
  if (process.env.__HP_ENV_LOADED) return;
  process.env.__HP_ENV_LOADED = "1";
  try {
    const envPath = path.resolve(__dirname, "..", "..", ".env");
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const idx = line.indexOf("=");
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (k && process.env[k] === undefined) {
        process.env[k] = v;
      }
    }
  } catch (_) {}
}

loadDotEnvIfNeeded();

function getConfig() {
  const env = process.env;
  return {
    tiktokPixelId: (env.TIKTOK_PIXEL_ID || "DB477NJC77U2NTDCJ9JG").trim(),
    tiktokAccessToken: (env.TIKTOK_ACCESS_TOKEN || "").trim(),
    tiktokTestEventCode: (env.TIKTOK_TEST_EVENT_CODE || "").trim(),
    tiktokApiUrl: (
      env.TIKTOK_EVENTS_API_URL || "https://business-api.tiktok.com/open_api/v1.3/event/track/"
    ).trim(),
    metaPixelId: (env.META_PIXEL_ID || "1576880640332577").trim(),
    metaAccessToken: (env.META_ACCESS_TOKEN || env.META_CAPI_ACCESS_TOKEN || "").trim(),
    metaTestEventCode: (env.META_TEST_EVENT_CODE || "").trim(),
    metaGraphVersion: (env.META_GRAPH_API_VERSION || "v20.0").trim(),
    utmifyToken: (env.UTMIFY_API_TOKEN || "").trim(),
    utmifyUrl: (env.UTMIFY_API_URL || "https://api.utmify.com.br/api-credentials/orders").trim(),
    bravoApiUrl: (env.BRAVOPAY_API_URL || "https://bravopay.club/api/v1").trim().replace(/\/+$/, ""),
    bravoApiToken: (
      env.BRAVOPAY_API_TOKEN ||
      env.BRAVOPAY_API_KEY ||
      env.BRAVO_API_KEY ||
      ""
    ).trim(),
    bravoProductId: (env.BRAVOPAY_PRODUCT_ID || "").trim(),
    webhookVerifyKey: (
      env.BRAVOPAY_WEBHOOK_SECRET ||
      env.BRAVO_WEBHOOK_SECRET ||
      env.WEBHOOK_SECRET ||
      ""
    ).trim()
  };
}

const APPROVED_STATUSES = new Set([
  "paid",
  "approved",
  "confirmed",
  "completed",
  "pagamento_aprovado",
  "order.paid",
  "payment.approved",
  "charge.succeeded",
  "transaction.paid"
]);

const PENDING_STATUSES = new Set([
  "pending",
  "waiting_payment",
  "pix_generated",
  "boleto_generated",
  "processing",
  "authorized",
  "transaction.created",
  "transaction.receipt_uploaded"
]);

const REFUSED_STATUSES = new Set([
  "failed",
  "refused",
  "declined",
  "rejected",
  "transaction.failed"
]);

const CANCELED_STATUSES = new Set([
  "canceled",
  "cancelled",
  "expired",
  "transaction.expired"
]);

const REFUNDED_STATUSES = new Set([
  "refunded",
  "chargeback",
  "chargedback",
  "transaction.refunded",
  "transaction.chargeback"
]);

const NON_PURCHASE_STATUSES = new Set([
  "created",
  ...PENDING_STATUSES,
  ...REFUSED_STATUSES,
  ...CANCELED_STATUSES,
  ...REFUNDED_STATUSES
]);

const REVERSAL_STATUSES = new Set([
  ...CANCELED_STATUSES,
  ...REFUNDED_STATUSES
]);

function normalizeOrderState(rawStatus, rawEventType) {
  const st = String(rawStatus || "").trim().toLowerCase();
  const ev = String(rawEventType || "").trim().toLowerCase();

  // Se o status explícito da transação indicar estado não pago, ele tem precedência sobre o tipo do envelope
  if (st) {
    if (REFUNDED_STATUSES.has(st)) return { canonicalStatus: "refunded", isApproved: false };
    if (CANCELED_STATUSES.has(st)) return { canonicalStatus: "canceled", isApproved: false };
    if (REFUSED_STATUSES.has(st)) return { canonicalStatus: "refused", isApproved: false };
    if (PENDING_STATUSES.has(st)) return { canonicalStatus: "pending", isApproved: false };
    if (st === "created") return { canonicalStatus: "created", isApproved: false };
    if (APPROVED_STATUSES.has(st)) return { canonicalStatus: "paid", isApproved: true };
  }

  if (ev) {
    if (REFUNDED_STATUSES.has(ev)) return { canonicalStatus: "refunded", isApproved: false };
    if (CANCELED_STATUSES.has(ev)) return { canonicalStatus: "canceled", isApproved: false };
    if (REFUSED_STATUSES.has(ev)) return { canonicalStatus: "refused", isApproved: false };
    if (PENDING_STATUSES.has(ev)) return { canonicalStatus: "pending", isApproved: false };
    if (APPROVED_STATUSES.has(ev)) return { canonicalStatus: "paid", isApproved: true };
  }

  return { canonicalStatus: "pending", isApproved: false };
}

const ALLOWED_BROWSER_EVENTS = new Set([
  "PageView",
  "ViewContent",
  "Search",
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
  "PlaceAnOrder"
]);

const PRODUCT_NAMES = {
  product1: "Fantasia de Halloween Divertida para Pets",
  product2: "Roupa de freira para pet",
  product3: "A Aranha Felpuda"
};

const PRODUCT_SKUS = {
  product1: "HP-RIDER-01",
  product2: "HP-HABIT-01",
  product3: "HP-SPIDER-01"
};

const PRODUCT_PRICES = {
  product1: 29.9,
  product2: 29.9,
  product3: 29.9
};

const PRODUCT_CATEGORY = "Fantasia para Pets";

const SKU_TO_PRODUCT_ID = {
  "HP-RIDER-01": "product1",
  "HP-HABIT-01": "product2",
  "HP-SPIDER-01": "product3",
  "headless-rider": "product1",
  "fantasia-freira": "product2",
  "holy-habit": "product2",
  "creepy-crawler": "product3",
  "aranha-felpuda": "product3"
};

function resolveCanonicalProduct(rawKey) {
  if (!rawKey) return null;
  const key = String(rawKey).trim();
  const pid = PRODUCT_NAMES[key] ? key : SKU_TO_PRODUCT_ID[key] || null;
  if (!pid) return null;
  return {
    id: pid,
    sku: PRODUCT_SKUS[pid],
    name: PRODUCT_NAMES[pid],
    category: PRODUCT_CATEGORY,
    price: PRODUCT_PRICES[pid],
    currency: "BRL"
  };
}

function sanitizeCustomData(eventName, rawCustomData, fallbackProductId) {
  const raw = rawCustomData && typeof rawCustomData === "object" ? rawCustomData : {};
  if (eventName === "PageView" || eventName === "Pageview") {
    return {};
  }
  if (eventName === "Search") {
    const q = String(raw.search_string || raw.query || "").trim().slice(0, 160);
    return q ? { search_string: q, query: q } : {};
  }

  const rawCid =
    (Array.isArray(raw.content_ids) && raw.content_ids[0]) ||
    raw.content_id ||
    (Array.isArray(raw.contents) && raw.contents[0] && (raw.contents[0].id || raw.contents[0].content_id)) ||
    fallbackProductId ||
    "product1";

  const canonical = resolveCanonicalProduct(rawCid) || resolveCanonicalProduct("product1");
  const rawQty =
    (Array.isArray(raw.contents) && raw.contents[0] && raw.contents[0].quantity) ||
    raw.num_items ||
    raw.quantity ||
    1;
  const qty = Math.min(50, Math.max(1, parseInt(rawQty, 10) || 1));
  const unitPrice = canonical.price;
  const totalValue = Number((unitPrice * qty).toFixed(2));

  const sanitized = {
    content_ids: [canonical.sku],
    content_id: canonical.sku,
    content_type: "product",
    content_name: canonical.name,
    content_category: canonical.category,
    contents: [
      {
        id: canonical.sku,
        content_id: canonical.sku,
        content_type: "product",
        content_name: canonical.name,
        content_category: canonical.category,
        quantity: qty,
        item_price: unitPrice,
        price: unitPrice
      }
    ],
    num_items: qty,
    value: totalValue,
    currency: "BRL"
  };

  if (raw.order_id) {
    sanitized.order_id = String(raw.order_id).trim().slice(0, 128);
  }
  return sanitized;
}

function getDbFilePath() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "hollowpaw_orders_tracking.json");
  }
  const dataDir = path.resolve(__dirname, "..", "..", "data");
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    return path.join(dataDir, "orders_tracking.json");
  } catch (_) {
    return path.join(os.tmpdir(), "hollowpaw_orders_tracking.json");
  }
}

if (!globalThis.__HP_TRACKING_MEM__) {
  globalThis.__HP_TRACKING_MEM__ = {
    sentEventIds: new Set(),
    sentTikTokEventIds: new Set(),
    db: {
      orders: {},
      transaction_to_order: {},
      last_session: null,
      capi_log: [],
      tiktok_log: [],
      utmify_log: [],
      bravopay_log: []
    }
  };
}

function loadDb() {
  const file = getDbFilePath();
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      parsed.orders = parsed.orders || {};
      parsed.transaction_to_order = parsed.transaction_to_order || {};
      parsed.capi_log = parsed.capi_log || [];
      parsed.tiktok_log = parsed.tiktok_log || [];
      parsed.utmify_log = parsed.utmify_log || [];
      parsed.bravopay_log = parsed.bravopay_log || [];
      globalThis.__HP_TRACKING_MEM__.db = parsed;
      return parsed;
    }
  } catch (_) {}
  const memDb = globalThis.__HP_TRACKING_MEM__.db;
  memDb.orders = memDb.orders || {};
  memDb.transaction_to_order = memDb.transaction_to_order || {};
  memDb.capi_log = memDb.capi_log || [];
  memDb.tiktok_log = memDb.tiktok_log || [];
  memDb.utmify_log = memDb.utmify_log || [];
  memDb.bravopay_log = memDb.bravopay_log || [];
  return memDb;
}

function saveDb(db) {
  globalThis.__HP_TRACKING_MEM__.db = db;
  const file = getDbFilePath();
  try {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tmp, file);
  } catch (_) {}
}

function isSha256Hex(val) {
  return typeof val === "string" && /^[a-f0-9]{64}$/i.test(val.trim());
}

function sha256Norm(val, mode = "text") {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (isSha256Hex(trimmed)) return trimmed.toLowerCase();

  let v = trimmed.toLowerCase();
  if (mode === "phone") {
    let digits = v.replace(/\D+/g, "");
    if (!digits) return null;
    if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
      digits = "55" + digits;
    }
    v = digits;
  } else if (mode === "tiktok_phone") {
    let digits = v.replace(/\D+/g, "");
    if (!digits) return null;
    if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
      digits = "55" + digits;
    }
    v = "+" + digits;
  } else if (mode === "cep") {
    v = v.replace(/\D+/g, "");
  }
  if (!v) return null;
  return crypto.createHash("sha256").update(v, "utf8").digest("hex");
}

/**
 * Converte dados de cliente em hashes SHA-256 irreversíveis antes de persistir na sessão,
 * evitando armazenar PII em texto aberto em arquivos temporários.
 */
function hashCustomerForStorage(rawCustomer) {
  const c = rawCustomer && typeof rawCustomer === "object" ? rawCustomer : {};
  const hashed = {};
  const emHash = c.email_hash || sha256Norm(c.email, "email");
  const phMetaHash = c.phone_meta_hash || sha256Norm(c.phone, "phone");
  const phTiktokHash = c.phone_tiktok_hash || sha256Norm(c.phone, "tiktok_phone");
  const zpHash = c.zp_hash || sha256Norm(c.cep, "cep");
  const ctHash = c.ct_hash || sha256Norm(c.city);
  const stHash = c.st_hash || sha256Norm(c.state);

  if (emHash) hashed.email_hash = emHash;
  if (phMetaHash) hashed.phone_meta_hash = phMetaHash;
  if (phTiktokHash) hashed.phone_tiktok_hash = phTiktokHash;
  if (zpHash) hashed.zp_hash = zpHash;
  if (ctHash) hashed.ct_hash = ctHash;
  if (stHash) hashed.st_hash = stHash;

  const fullName = String(c.name || "").trim();
  if (fullName) {
    const parts = fullName.split(/\s+/);
    const fnHash = sha256Norm(parts[0]);
    const lnHash = parts.length > 1 ? sha256Norm(parts.slice(1).join(" ")) : null;
    if (fnHash) hashed.fn_hash = fnHash;
    if (lnHash) hashed.ln_hash = lnHash;
  } else {
    if (c.fn_hash) hashed.fn_hash = c.fn_hash;
    if (c.ln_hash) hashed.ln_hash = c.ln_hash;
  }
  return hashed;
}

function sanitizeEventUrl(rawUrl, fallbackUrl) {
  const candidate = String(rawUrl || fallbackUrl || "https://hollowpaw-vercel-ready.vercel.app/").trim();
  try {
    const u = new URL(candidate);
    const piiParams = [
      "email",
      "e-mail",
      "phone",
      "telefone",
      "celular",
      "cpf",
      "document",
      "name",
      "nome",
      "address",
      "endereco",
      "cep"
    ];
    for (const k of piiParams) {
      u.searchParams.delete(k);
    }
    return u.toString();
  } catch (_) {
    return "https://hollowpaw-vercel-ready.vercel.app/";
  }
}

function buildMetaCapiPayload({
  eventName,
  eventId,
  eventTime,
  eventSourceUrl,
  customData,
  attribution,
  customer,
  clientIp,
  userAgent
}) {
  const cfg = getConfig();
  const attr = attribution || {};
  const cust = customer || {};

  const userData = {
    client_ip_address: clientIp || "0.0.0.0",
    client_user_agent: userAgent || attr.user_agent || "Mozilla/5.0"
  };

  if (attr._fbc) {
    userData.fbc = attr._fbc;
  } else if (attr.fbclid) {
    userData.fbc = `fb.1.${Date.now()}.${attr.fbclid}`;
  }
  if (attr._fbp) {
    userData.fbp = attr._fbp;
  }

  const emHash = cust.email_hash || sha256Norm(cust.email, "email");
  const phHash = cust.phone_meta_hash || sha256Norm(cust.phone, "phone");
  const zpHash = cust.zp_hash || sha256Norm(cust.cep, "cep");
  const ctHash = cust.ct_hash || sha256Norm(cust.city);
  const stHash = cust.st_hash || sha256Norm(cust.state);
  const countryHash = sha256Norm("br");

  const fnHash = cust.fn_hash || (cust.name ? sha256Norm(String(cust.name).trim().split(/\s+/)[0]) : null);
  const lnHash =
    cust.ln_hash ||
    (cust.name && String(cust.name).trim().split(/\s+/).length > 1
      ? sha256Norm(String(cust.name).trim().split(/\s+/).slice(1).join(" "))
      : null);

  if (fnHash) userData.fn = [fnHash];
  if (lnHash) userData.ln = [lnHash];
  if (emHash) userData.em = [emHash];
  if (phHash) userData.ph = [phHash];
  if (zpHash) userData.zp = [zpHash];
  if (ctHash) userData.ct = [ctHash];
  if (stHash) userData.st = [stHash];
  if (countryHash) userData.country = [countryHash];

  const cleanUrl = sanitizeEventUrl(eventSourceUrl, attr.landing_page);

  const eventObj = {
    event_name: eventName,
    event_time: Number(eventTime) || Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: cleanUrl,
    user_data: userData,
    custom_data: customData || {}
  };

  const body = { data: [eventObj] };
  if (cfg.metaTestEventCode) {
    body.test_event_code = cfg.metaTestEventCode;
  }
  return body;
}

async function dispatchMetaCapi(payload) {
  const cfg = getConfig();
  if (!cfg.metaAccessToken || !cfg.metaPixelId) {
    return { sent: false, configured: false, reason: "META_CAPI_CREDENTIAL_NOT_CONFIGURED" };
  }
  const url = `https://graph.facebook.com/${cfg.metaGraphVersion}/${cfg.metaPixelId}/events?access_token=${encodeURIComponent(cfg.metaAccessToken)}`;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    });
    const text = await resp.text();
    return { sent: resp.ok, configured: true, http_status: resp.status, response: text.slice(0, 500) };
  } catch (err) {
    return { sent: false, configured: true, error: String(err.message || err) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Monta o payload oficial da TikTok Events API v1.3 (/open_api/v1.3/event/track/)
 * seguindo estritamente a documentação oficial de Web Events e deduplicação por `event_id`.
 */
function buildTikTokEventsPayload({
  eventName,
  eventId,
  eventTime,
  eventSourceUrl,
  customData,
  attribution,
  customer,
  clientIp,
  userAgent,
  externalId
}) {
  const cfg = getConfig();
  const attr = attribution || {};
  const cust = customer || {};
  const cd = customData || {};

  const userObj = {
    ip: clientIp || "0.0.0.0",
    user_agent: userAgent || attr.user_agent || "Mozilla/5.0"
  };

  if (attr.ttclid && typeof attr.ttclid === "string" && attr.ttclid.trim()) {
    userObj.ttclid = attr.ttclid.trim();
  }
  if (attr._ttp && typeof attr._ttp === "string" && attr._ttp.trim()) {
    userObj.ttp = attr._ttp.trim();
  }

  const emHash = cust.email_hash || sha256Norm(cust.email, "email");
  const phHash = cust.phone_tiktok_hash || sha256Norm(cust.phone, "tiktok_phone");
  const extHash = sha256Norm(externalId || cd.order_id || emHash || "");

  if (emHash) userObj.email = emHash;
  if (phHash) userObj.phone = phHash;
  if (extHash) userObj.external_id = extHash;

  const cleanUrl = sanitizeEventUrl(eventSourceUrl, attr.landing_page);
  const pageObj = {
    url: cleanUrl
  };
  if (attr.referrer && typeof attr.referrer === "string" && attr.referrer.trim()) {
    pageObj.referrer = sanitizeEventUrl(attr.referrer, "");
  }

  const properties = {};
  if (eventName === "Search") {
    const q = String(cd.query || cd.search_string || "").trim();
    if (q) properties.query = q;
  } else if (eventName !== "PageView" && eventName !== "Pageview") {
    const cid =
      cd.content_id ||
      (Array.isArray(cd.content_ids) && cd.content_ids[0]) ||
      "HP-RIDER-01";
    const cname = cd.content_name || PRODUCT_NAMES.product1;
    const ccat = cd.content_category || PRODUCT_CATEGORY;
    const val = typeof cd.value === "number" && !Number.isNaN(cd.value) ? cd.value : 29.9;
    const qty = Math.max(1, parseInt(cd.num_items || 1, 10) || 1);
    const unitPrice = Number((val / qty).toFixed(2));

    properties.currency = "BRL";
    properties.value = val;
    properties.content_type = "product";
    properties.content_id = String(cid);
    properties.content_name = String(cname);
    properties.content_category = String(ccat);
    properties.contents = [
      {
        content_id: String(cid),
        content_type: "product",
        content_name: String(cname),
        content_category: String(ccat),
        quantity: qty,
        price: unitPrice
      }
    ];
    if (cd.order_id) {
      properties.order_id = String(cd.order_id);
    }
  }

  const normalizedEventName = eventName === "PageView" ? "Pageview" : eventName;

  const eventItem = {
    event: normalizedEventName,
    event_time: Number(eventTime) || Math.floor(Date.now() / 1000),
    event_id: String(eventId),
    user: userObj,
    page: pageObj,
    properties
  };

  const body = {
    event_source: "web",
    event_source_id: cfg.tiktokPixelId,
    data: [eventItem]
  };

  if (cfg.tiktokTestEventCode) {
    body.test_event_code = cfg.tiktokTestEventCode;
  }

  return body;
}

/**
 * Envia o evento para o endpoint oficial da TikTok Events API v1.3
 * autenticando via header `Access-Token` a partir de `process.env.TIKTOK_ACCESS_TOKEN`.
 * Nunca expõe o token nem PII nos logs ou no retorno.
 */
async function dispatchTikTokEventsApi(payload) {
  const cfg = getConfig();
  if (!cfg.tiktokAccessToken || !cfg.tiktokPixelId) {
    return {
      sent: false,
      configured: false,
      pixel_id: cfg.tiktokPixelId || null,
      reason: "TIKTOK_ACCESS_TOKEN_NOT_CONFIGURED"
    };
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;

  try {
    const resp = await fetch(cfg.tiktokApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": cfg.tiktokAccessToken
      },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    });

    const rawText = await resp.text();
    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch (_) {}

    const apiCode = parsed && typeof parsed.code === "number" ? parsed.code : null;
    const isSuccess = resp.ok && apiCode === 0;

    return {
      sent: isSuccess,
      configured: true,
      http_status: resp.status,
      api_code: apiCode,
      message: parsed && parsed.message ? String(parsed.message).slice(0, 200) : rawText.slice(0, 200),
      request_id: (parsed && parsed.request_id) || null
    };
  } catch (err) {
    const isAbort = err && err.name === "AbortError";
    return {
      sent: false,
      configured: true,
      error: isAbort ? "tiktok_events_api_timeout" : String(err.message || err).slice(0, 200)
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildUtmifyPayload(orderRecord, rawCustomer) {
  const attr = orderRecord.attribution || {};
  const cust = rawCustomer || {};
  const statusMap = {
    paid: "paid",
    waiting_payment: "waiting_payment",
    pending: "waiting_payment",
    refused: "refused",
    refunded: "refunded",
    chargeback: "chargedback"
  };
  const utmStatus = statusMap[orderRecord.status || "waiting_payment"] || "waiting_payment";
  const nowIso = new Date().toISOString().replace("T", " ").slice(0, 19);
  const valCents = Math.round(Number(orderRecord.value || 29.9) * 100);

  return {
    orderId: String(orderRecord.order_id),
    platform: "HollowpawVercel",
    paymentMethod: orderRecord.payment_method || "pix",
    status: utmStatus,
    createdAt: orderRecord.created_at || nowIso,
    approvedDate: utmStatus === "paid" ? orderRecord.approved_at || nowIso : null,
    refundedAt: null,
    customer: {
      name: cust.name || "Cliente",
      email: cust.email || "cliente@hollowpaw.com.br",
      phone: String(cust.phone || "").replace(/\D+/g, "") || null,
      document: String(cust.document || "").replace(/\D+/g, "") || null,
      country: "BR",
      ip: orderRecord.client_ip || "0.0.0.0"
    },
    products: [
      {
        id: String(orderRecord.product_id || "product1"),
        name: orderRecord.product_name || PRODUCT_NAMES[orderRecord.product_id] || PRODUCT_NAMES.product1,
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: valCents
      }
    ],
    trackingParameters: {
      src: attr.src || attr.xcod || null,
      sck: attr.sck || null,
      utm_source: attr.utm_source || null,
      utm_campaign: attr.utm_campaign || null,
      utm_medium: attr.utm_medium || null,
      utm_content: attr.utm_content || null,
      utm_term: attr.utm_term || null
    },
    commission: {
      totalPriceInCents: valCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: valCents,
      currency: "BRL"
    },
    isTest: false
  };
}

async function dispatchUtmify(orderRecord, rawCustomer) {
  const cfg = getConfig();
  if (!cfg.utmifyToken) {
    return { sent: false, configured: false, reason: "UTMIFY_CREDENTIAL_NOT_CONFIGURED" };
  }
  const payload = buildUtmifyPayload(orderRecord, rawCustomer);
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
  try {
    const resp = await fetch(cfg.utmifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": cfg.utmifyToken
      },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    });
    const text = await resp.text();
    return { sent: resp.ok, configured: true, http_status: resp.status, response: text.slice(0, 300) };
  } catch (err) {
    return { sent: false, configured: true, error: String(err.message || err).slice(0, 200) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildBravoPayTransactionPayload({
  orderId,
  productId,
  method = "pix",
  customer = {},
  attribution = {},
  description = "",
  expiresIn = 3600
}) {
  const cfg = getConfig();
  const canonical =
    resolveCanonicalProduct(productId) || resolveCanonicalProduct("product1");
  const amountCents = Math.round(Number(canonical.price) * 100);
  const cust = customer && typeof customer === "object" ? customer : {};
  const attr = attribution && typeof attribution === "object" ? attribution : {};
  const cleanOrderId = String(orderId || `ord_${Math.floor(Date.now() / 1000)}`)
    .trim()
    .slice(0, 120);

  const customerObj = {};
  if (cust.email && String(cust.email).trim()) {
    customerObj.email = String(cust.email).trim();
  }
  if (cust.name && String(cust.name).trim()) {
    customerObj.name = String(cust.name).trim();
  }
  const rawCpf = String(cust.cpf || cust.document || "").replace(/\D+/g, "");
  if (rawCpf) {
    customerObj.cpf = rawCpf;
  }
  const rawPhone = String(cust.phone || "").replace(/\D+/g, "");
  if (rawPhone) {
    customerObj.phone = rawPhone;
  }

  const utmObj = {
    source: String(attr.utm_source || attr.source || "").trim(),
    medium: String(attr.utm_medium || attr.medium || "").trim(),
    campaign: String(attr.utm_campaign || attr.campaign || "").trim(),
    content: String(attr.utm_content || attr.content || "").trim(),
    term: String(attr.utm_term || attr.term || "").trim(),
    fbclid: String(attr.fbclid || "").trim(),
    ttclid: String(attr.ttclid || "").trim(),
    gclid: String(attr.gclid || "").trim()
  };

  const payload = {
    amount_cents: amountCents,
    method: String(method || "pix").toLowerCase() === "card" ? "card" : "pix",
    customer: customerObj,
    description: String(description || `${canonical.name} - Pedido ${cleanOrderId}`)
      .trim()
      .slice(0, 300),
    external_reference: cleanOrderId,
    metadata: {
      order_id: cleanOrderId,
      product_id: canonical.id,
      product_sku: canonical.sku
    },
    expires_in: Math.min(86400, Math.max(60, Number(expiresIn) || 3600)),
    utm: utmObj
  };

  if (cfg.bravoProductId) {
    payload.product_id = cfg.bravoProductId;
  }

  return payload;
}

async function createBravoPayTransaction(txArgs = {}) {
  const cfg = getConfig();
  const payload = buildBravoPayTransactionPayload(txArgs);
  if (!cfg.bravoApiToken) {
    return {
      created: false,
      configured: false,
      reason: "BRAVOPAY_API_TOKEN_NOT_CONFIGURED",
      amount_cents: payload.amount_cents,
      external_reference: payload.external_reference
    };
  }

  const url = `${cfg.bravoApiUrl}/transactions`;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.bravoApiToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": payload.external_reference
      },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    });

    const rawText = await resp.text();
    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch (_) {}

    const txId = parsed && parsed.id ? String(parsed.id).trim() : null;
    const isOk = resp.ok && Boolean(txId);

    return {
      created: isOk,
      configured: true,
      http_status: resp.status,
      transaction_id: txId,
      status: (parsed && parsed.status) || null,
      method: (parsed && parsed.method) || payload.method.toUpperCase(),
      amount_cents:
        parsed && typeof parsed.amount_cents === "number"
          ? parsed.amount_cents
          : payload.amount_cents,
      currency: (parsed && parsed.currency) || "BRL",
      external_reference:
        (parsed && parsed.external_reference) || payload.external_reference,
      pix: (parsed && parsed.pix) || null,
      card: (parsed && parsed.card) || null,
      created_at: (parsed && parsed.created_at) || null,
      error: !isOk
        ? (parsed && parsed.error) || {
            code: "bravopay_http_error",
            message: rawText.slice(0, 200)
          }
        : null
    };
  } catch (err) {
    const isAbort = err && err.name === "AbortError";
    return {
      created: false,
      configured: true,
      error: {
        code: isAbort ? "bravopay_timeout" : "bravopay_network_error",
        message: isAbort
          ? "Timeout ao comunicar com a API da BravoPay"
          : String(err.message || err).slice(0, 200)
      }
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchBravoPayTransaction(transactionId) {
  const cfg = getConfig();
  const cleanId = String(transactionId || "").trim();
  if (!cleanId) {
    return { ok: false, configured: Boolean(cfg.bravoApiToken), error: "missing_transaction_id" };
  }
  if (!cfg.bravoApiToken) {
    return {
      ok: false,
      configured: false,
      reason: "BRAVOPAY_API_TOKEN_NOT_CONFIGURED"
    };
  }

  const url = `${cfg.bravoApiUrl}/transactions/${encodeURIComponent(cleanId)}`;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;

  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cfg.bravoApiToken}`,
        Accept: "application/json"
      },
      signal: controller ? controller.signal : undefined
    });

    const rawText = await resp.text();
    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch (_) {}

    return {
      ok: resp.ok && Boolean(parsed && parsed.id),
      configured: true,
      http_status: resp.status,
      transaction: parsed && parsed.id ? parsed : null,
      error: !resp.ok
        ? (parsed && parsed.error) || {
            code: "bravopay_http_error",
            message: rawText.slice(0, 200)
          }
        : null
    };
  } catch (err) {
    const isAbort = err && err.name === "AbortError";
    return {
      ok: false,
      configured: true,
      error: {
        code: isAbort ? "bravopay_timeout" : "bravopay_network_error",
        message: String(err.message || err).slice(0, 200)
      }
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || "0.0.0.0";
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    if (typeof req.rawBody !== "string") {
      try {
        req.rawBody = JSON.stringify(req.body);
      } catch (_) {
        req.rawBody = "";
      }
    }
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    req.rawBody = req.body;
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      req.rawBody = raw;
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        resolve({});
      }
    });
    req.on("error", () => {
      req.rawBody = "";
      resolve({});
    });
  });
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Connection", "close");
  res.end(body);
}

function verifyWebhookAuth(req, rawPayloadObj, secretKey, rawBodyStr) {
  if (!secretKey) return true;
  const sigHeader = String(
    req.headers["bravopay-signature"] ||
      req.headers["x-bravopay-signature"] ||
      req.headers["x-bravo-signature"] ||
      req.headers["x-webhook-secret"] ||
      req.headers["x-webhook-token"] ||
      req.headers["authorization"] ||
      ""
  ).trim();
  if (!sigHeader) return false;

  const bodyStr =
    typeof rawBodyStr === "string" && rawBodyStr.length > 0
      ? rawBodyStr
      : JSON.stringify(rawPayloadObj || {});

  // 1. Formato oficial BravoPay: BravoPay-Signature: t=<ts>,v1=<hmac_sha256_hex>
  if (sigHeader.includes("t=") && sigHeader.includes("v1=")) {
    try {
      const parts = {};
      for (const piece of sigHeader.split(",")) {
        const idx = piece.indexOf("=");
        if (idx > 0) {
          parts[piece.slice(0, idx).trim()] = piece.slice(idx + 1).trim();
        }
      }
      const t = Number(parts.t);
      const v1 = String(parts.v1 || "").toLowerCase();
      if (!t || !v1 || Math.abs(Date.now() / 1000 - t) > 300) {
        return false;
      }
      const expected = crypto
        .createHmac("sha256", secretKey)
        .update(`${t}.${bodyStr}`, "utf8")
        .digest("hex")
        .toLowerCase();
      const a = Buffer.from(v1, "utf8");
      const b = Buffer.from(expected, "utf8");
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  // 2. Comparação direta constante (Bearer <secret> ou x-webhook-secret)
  const cleanHeader = sigHeader.replace(/^Bearer\s+/i, "").trim();
  try {
    const a = Buffer.from(cleanHeader, "utf8");
    const b = Buffer.from(secretKey, "utf8");
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  } catch (_) {}

  // 3. HMAC-SHA256 direto sobre o corpo JSON
  try {
    const hmac = crypto
      .createHmac("sha256", secretKey)
      .update(bodyStr, "utf8")
      .digest("hex");
    const a = Buffer.from(cleanHeader.toLowerCase(), "utf8");
    const b = Buffer.from(hmac.toLowerCase(), "utf8");
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  } catch (_) {}

  return false;
}

function normalizeIncomingAttribution(rawTracking, fallbackAttribution) {
  const base = Object.assign({}, fallbackAttribution || {});
  if (!rawTracking || typeof rawTracking !== "object") return base;

  const mapPairs = [
    ["utm_source", rawTracking.utm_source || rawTracking.source],
    ["utm_medium", rawTracking.utm_medium || rawTracking.medium],
    ["utm_campaign", rawTracking.utm_campaign || rawTracking.campaign],
    ["utm_content", rawTracking.utm_content || rawTracking.content],
    ["utm_term", rawTracking.utm_term || rawTracking.term],
    ["fbclid", rawTracking.fbclid],
    ["ttclid", rawTracking.ttclid],
    ["gclid", rawTracking.gclid],
    ["_fbp", rawTracking._fbp],
    ["_fbc", rawTracking._fbc],
    ["_ttp", rawTracking._ttp],
    ["landing_page", rawTracking.landing_page],
    ["referrer", rawTracking.referrer],
    ["src", rawTracking.src || rawTracking.xcod],
    ["sck", rawTracking.sck]
  ];

  for (const [k, val] of mapPairs) {
    if (val && typeof val === "string" && val.trim() && !base[k]) {
      base[k] = val.trim();
    }
  }
  return base;
}

async function handlePaymentWebhook(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }
  const body = await readJsonBody(req);
  const cfg = getConfig();
  if (cfg.webhookVerifyKey && !verifyWebhookAuth(req, body, cfg.webhookVerifyKey, req.rawBody)) {
    return sendJson(res, 401, {
      ok: false,
      error: "invalid_webhook_signature",
      purchase_dispatched: false
    });
  }

  const rawEventType = String(body.type || body.event || "").trim().toLowerCase();
  if (rawEventType.startsWith("withdrawal.")) {
    return sendJson(res, 200, {
      ok: true,
      ignored: "withdrawal_event",
      purchase_dispatched: false
    });
  }

  const clientIp = getClientIp(req);
  const ua = req.headers["user-agent"] || "";
  const nested = body.data && typeof body.data === "object" ? body.data : {};
  const metaObj =
    (nested.metadata && typeof nested.metadata === "object" ? nested.metadata : null) ||
    (body.metadata && typeof body.metadata === "object" ? body.metadata : null) ||
    {};

  const rawBodyId = String(body.id || "").trim();
  const rawNestedId = String(nested.id || "").trim();
  const transactionId = String(
    body.transaction_id ||
      nested.transaction_id ||
      (rawNestedId.startsWith("tx_") ? rawNestedId : "") ||
      (rawBodyId.startsWith("tx_") ? rawBodyId : "") ||
      (body.data && rawNestedId ? rawNestedId : "")
  )
    .trim()
    .slice(0, 128);

  const db = loadDb();
  const lastSess = db.last_session || {};

  const externalRef = String(
    nested.external_reference ||
      body.external_reference ||
      metaObj.order_id ||
      body.order_id ||
      body.orderId ||
      nested.order_id ||
      nested.orderId ||
      body.reference ||
      nested.reference ||
      ""
  )
    .trim()
    .slice(0, 128);

  const mappedOrderFromTx =
    transactionId && db.transaction_to_order && db.transaction_to_order[transactionId]
      ? String(db.transaction_to_order[transactionId])
      : "";

  let orderId =
    externalRef ||
    mappedOrderFromTx ||
    transactionId ||
    (!rawBodyId.startsWith("evt_") ? rawBodyId : "");
  orderId = String(orderId || "").trim().slice(0, 128);

  const rawStatus = String(
    nested.status ||
      body.status ||
      body.payment_status ||
      nested.payment_status ||
      body.state ||
      nested.state ||
      ""
  )
    .trim()
    .toLowerCase();

  if (!orderId || (!rawStatus && !rawEventType)) {
    return sendJson(res, 400, {
      ok: false,
      error: "missing_order_id_or_status",
      purchase_dispatched: false
    });
  }

  const { canonicalStatus, isApproved } = normalizeOrderState(rawStatus, rawEventType);

  let existing =
    db.orders[orderId] ||
    (mappedOrderFromTx && db.orders[mappedOrderFromTx] ? db.orders[mappedOrderFromTx] : null);

  if (existing && existing.order_id) {
    orderId = existing.order_id;
  }

  // Valida correspondência entre pedido interno e transação da BravoPay
  if (
    existing &&
    existing.transaction_id &&
    transactionId &&
    existing.transaction_id !== transactionId
  ) {
    return sendJson(res, 409, {
      ok: false,
      error: "transaction_order_mismatch",
      order_id: orderId,
      expected_transaction_id: existing.transaction_id,
      received_transaction_id: transactionId,
      purchase_dispatched: false
    });
  }

  const rawPid =
    (existing && existing.product_id) ||
    metaObj.product_id ||
    metaObj.product_sku ||
    body.product_id ||
    body.product_sku ||
    nested.product_id ||
    nested.product_sku ||
    lastSess.product_id ||
    "product1";
  const canonical = resolveCanonicalProduct(rawPid) || resolveCanonicalProduct("product1");

  // Valida moeda (currency = BRL)
  const incomingCurrency = nested.currency !== undefined ? nested.currency : body.currency;
  if (
    incomingCurrency !== undefined &&
    incomingCurrency !== null &&
    String(incomingCurrency).trim() !== "" &&
    String(incomingCurrency).trim().toUpperCase() !== "BRL"
  ) {
    return sendJson(res, 400, {
      ok: false,
      error: "currency_mismatch",
      order_id: orderId,
      expected_currency: "BRL",
      received_currency: String(incomingCurrency).trim(),
      purchase_dispatched: false
    });
  }

  // Valida valor (amount_cents = 2990 ou value = 29.90)
  const expectedAmountCents =
    existing && existing.amount_cents
      ? Number(existing.amount_cents)
      : Math.round(Number((existing && existing.value) || canonical.price) * 100);

  const rawAmountCents =
    nested.amount_cents !== undefined ? nested.amount_cents : body.amount_cents;
  const rawVal =
    nested.value !== undefined
      ? nested.value
      : body.value !== undefined
      ? body.value
      : nested.amount !== undefined
      ? nested.amount
      : body.amount;

  let receivedAmountCents = null;
  if (rawAmountCents !== undefined && rawAmountCents !== null && rawAmountCents !== "") {
    receivedAmountCents = Math.round(Number(rawAmountCents));
  } else if (rawVal !== undefined && rawVal !== null && rawVal !== "") {
    receivedAmountCents = Math.round(Number(rawVal) * 100);
  }

  if (receivedAmountCents !== null) {
    if (
      Number.isNaN(receivedAmountCents) ||
      receivedAmountCents <= 0 ||
      Math.abs(receivedAmountCents - expectedAmountCents) > 1
    ) {
      return sendJson(res, 400, {
        ok: false,
        error: "amount_mismatch",
        order_id: orderId,
        expected_amount_cents: expectedAmountCents,
        received_amount_cents: receivedAmountCents,
        purchase_dispatched: false
      });
    }
  }

  const safeVal = Number((expectedAmountCents / 100).toFixed(2));
  const incomingRawCustomer = body.customer || nested.customer || null;
  const incomingTracking =
    nested.tracking ||
    body.tracking ||
    nested.utm ||
    body.utm ||
    body.attribution ||
    nested.attribution ||
    null;

  if (!existing) {
    existing = {
      order_id: orderId,
      transaction_id: transactionId || null,
      product_id: canonical.id,
      product_sku: canonical.sku,
      product_name: canonical.name,
      product_category: canonical.category,
      amount_cents: expectedAmountCents,
      value: safeVal,
      currency: "BRL",
      payment_method: String(
        nested.method || body.method || body.payment_method || nested.payment_method || "pix"
      ).toLowerCase(),
      customer: incomingRawCustomer
        ? hashCustomerForStorage(incomingRawCustomer)
        : lastSess.customer || {},
      attribution: normalizeIncomingAttribution(incomingTracking, lastSess.attribution || {}),
      client_ip: lastSess.client_ip || clientIp,
      user_agent: lastSess.user_agent || ua,
      created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
      paid: false,
      status: "pending",
      capi_purchase_sent: false,
      tiktok_purchase_sent: false,
      purchase_webhook_processed: false,
      browser_purchase_fired: false,
      event_id: `purchase_${orderId}`
    };
    db.orders[orderId] = existing;
  } else {
    if (transactionId && !existing.transaction_id) {
      existing.transaction_id = transactionId;
    }
    if (!existing.amount_cents) {
      existing.amount_cents = expectedAmountCents;
    }
    if (incomingRawCustomer) {
      existing.customer = Object.assign(
        {},
        existing.customer || {},
        hashCustomerForStorage(incomingRawCustomer)
      );
    }
    if (incomingTracking) {
      existing.attribution = normalizeIncomingAttribution(
        incomingTracking,
        existing.attribution || {}
      );
    }
  }

  if (existing.transaction_id) {
    db.transaction_to_order[existing.transaction_id] = orderId;
  }

  // Idempotência: se todos os destinos ativos já tiveram Purchase confirmado (ou processado sem pendências de retry), bloqueia duplicidade
  const metaDoneOrUnconfigured = Boolean(existing.capi_purchase_sent) || !cfg.metaAccessToken;
  const tiktokDoneOrUnconfigured = Boolean(existing.tiktok_purchase_sent) || !cfg.tiktokAccessToken;

  if (
    existing.purchase_webhook_processed &&
    metaDoneOrUnconfigured &&
    tiktokDoneOrUnconfigured &&
    isApproved
  ) {
    saveDb(db);
    return sendJson(res, 200, {
      ok: true,
      order_id: orderId,
      transaction_id: existing.transaction_id || null,
      status: existing.status,
      paid: true,
      purchase_dispatched: false,
      duplicate_prevented: true,
      capi_purchase_sent: Boolean(existing.capi_purchase_sent),
      tiktok_purchase_sent: Boolean(existing.tiktok_purchase_sent),
      event_id: existing.event_id
    });
  }

  // Se NÃO for status aprovado (ex.: created, pending, waiting_payment, refused, canceled, refunded):
  // Protege contra downgrade caso um webhook "pending" chegue fora de ordem após "paid"
  if (!isApproved) {
    if (existing.paid && !REVERSAL_STATUSES.has(canonicalStatus) && !REVERSAL_STATUSES.has(rawStatus)) {
      return sendJson(res, 200, {
        ok: true,
        order_id: orderId,
        transaction_id: existing.transaction_id || null,
        status: existing.status,
        paid: true,
        purchase_dispatched: false,
        ignored_out_of_order_status: canonicalStatus
      });
    }
    existing.status = canonicalStatus;
    existing.paid = false;
    existing.updated_at = new Date().toISOString().replace("T", " ").slice(0, 19);
    const utmRes = await dispatchUtmify(existing, incomingRawCustomer);
    db.utmify_log.push({
      order_id: orderId,
      status: existing.status,
      timestamp: Math.floor(Date.now() / 1000),
      result: utmRes
    });
    saveDb(db);
    return sendJson(res, 200, {
      ok: true,
      order_id: orderId,
      transaction_id: existing.transaction_id || null,
      status: existing.status,
      paid: false,
      purchase_dispatched: false,
      reason: "payment_not_approved_yet"
    });
  }

  // Pagamento confirmado e aprovado -> Preserva timestamp e event_id originais do pedido para idempotência e retry seguro por plataforma
  const eventTime = existing.purchase_event_time || Math.floor(Date.now() / 1000);
  existing.purchase_event_time = eventTime;
  existing.paid = true;
  existing.status = "paid";
  existing.approved_at =
    existing.approved_at ||
    (nested.paid_at ? String(nested.paid_at).replace("T", " ").slice(0, 19) : null) ||
    new Date().toISOString().replace("T", " ").slice(0, 19);
  existing.updated_at = new Date().toISOString().replace("T", " ").slice(0, 19);
  const evId = existing.event_id || `purchase_${orderId}`;
  existing.event_id = evId;
  globalThis.__HP_TRACKING_MEM__.sentEventIds.add(evId);
  globalThis.__HP_TRACKING_MEM__.sentTikTokEventIds.add(evId);

  const customData = {
    value: Number(existing.value || 29.9),
    currency: "BRL",
    content_id: existing.product_sku || "HP-RIDER-01",
    content_ids: [existing.product_sku || "HP-RIDER-01"],
    content_category: existing.product_category || PRODUCT_CATEGORY,
    contents: [
      {
        id: existing.product_sku || "HP-RIDER-01",
        content_id: existing.product_sku || "HP-RIDER-01",
        content_type: "product",
        content_name: existing.product_name || PRODUCT_NAMES.product1,
        content_category: existing.product_category || PRODUCT_CATEGORY,
        quantity: 1,
        item_price: Number(existing.value || 29.9),
        price: Number(existing.value || 29.9)
      }
    ],
    content_type: "product",
    content_name: existing.product_name || PRODUCT_NAMES.product1,
    num_items: 1,
    order_id: orderId
  };

  const eventSourceUrl =
    (existing.attribution || {}).landing_page || "https://hollowpaw-vercel-ready.vercel.app/obrigado";

  const metaAlreadySent = Boolean(existing.capi_purchase_sent);
  const tiktokAlreadySent = Boolean(existing.tiktok_purchase_sent);

  const capiPromise = metaAlreadySent
    ? Promise.resolve({ sent: true, skipped: "already_sent" })
    : dispatchMetaCapi(
        buildMetaCapiPayload({
          eventName: "Purchase",
          eventId: evId,
          eventTime,
          eventSourceUrl,
          customData,
          attribution: existing.attribution,
          customer: existing.customer,
          clientIp: existing.client_ip,
          userAgent: existing.user_agent
        })
      );

  const tiktokPromise = tiktokAlreadySent
    ? Promise.resolve({ sent: true, skipped: "already_sent" })
    : dispatchTikTokEventsApi(
        buildTikTokEventsPayload({
          eventName: "Purchase",
          eventId: evId,
          eventTime,
          eventSourceUrl,
          customData,
          attribution: existing.attribution,
          customer: existing.customer,
          clientIp: existing.client_ip,
          userAgent: existing.user_agent,
          externalId: orderId
        })
      );

  const [capiRes, tiktokRes, utmRes] = await Promise.all([
    capiPromise,
    tiktokPromise,
    dispatchUtmify(existing, incomingRawCustomer)
  ]);

  // Somente marca cada plataforma como enviada quando houver confirmação real (HTTP 2xx / code 0) da respectiva API
  if (capiRes.sent === true) {
    existing.capi_purchase_sent = true;
  }
  if (tiktokRes.sent === true) {
    existing.tiktok_purchase_sent = true;
  }
  existing.purchase_webhook_processed = true;

  if (!metaAlreadySent) {
    db.capi_log.push({
      event_name: "Purchase",
      event_id: evId,
      order_id: orderId,
      transaction_id: existing.transaction_id || null,
      timestamp: eventTime,
      result: capiRes
    });
  }
  if (!tiktokAlreadySent) {
    db.tiktok_log.push({
      event_name: "Purchase",
      event_id: evId,
      order_id: orderId,
      transaction_id: existing.transaction_id || null,
      timestamp: eventTime,
      result: tiktokRes
    });
  }
  db.utmify_log.push({
    order_id: orderId,
    status: "paid",
    timestamp: eventTime,
    result: utmRes
  });
  saveDb(db);

  return sendJson(res, 200, {
    ok: true,
    order_id: orderId,
    transaction_id: existing.transaction_id || null,
    amount_cents: existing.amount_cents,
    value: existing.value,
    currency: existing.currency,
    status: "paid",
    paid: true,
    purchase_dispatched: true,
    duplicate_prevented: false,
    capi_purchase_sent: Boolean(existing.capi_purchase_sent),
    tiktok_purchase_sent: Boolean(existing.tiktok_purchase_sent),
    event_id: evId,
    tiktok: tiktokRes,
    capi: capiRes,
    utmify: utmRes
  });
}

module.exports = {
  ALLOWED_BROWSER_EVENTS,
  PRODUCT_NAMES,
  PRODUCT_SKUS,
  PRODUCT_PRICES,
  PRODUCT_CATEGORY,
  getConfig,
  normalizeOrderState,
  resolveCanonicalProduct,
  sanitizeCustomData,
  hashCustomerForStorage,
  loadDb,
  saveDb,
  buildMetaCapiPayload,
  dispatchMetaCapi,
  buildTikTokEventsPayload,
  dispatchTikTokEventsApi,
  buildBravoPayTransactionPayload,
  createBravoPayTransaction,
  fetchBravoPayTransaction,
  verifyWebhookAuth,
  getClientIp,
  readJsonBody,
  sendJson,
  handlePaymentWebhook
};
