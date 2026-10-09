/**
 * HOLLOWPAW — Core Serverless de Tracking, TikTok Events API, Meta CAPI, Webhooks e UTMify
 * ========================================================================================
 * Compatível com Vercel Serverless Functions (Node.js 18/20/24+) e ambiente local.
 * Nenhuma credencial fica no código: todas as chaves vêm exclusivamente de `process.env`.
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
    metaAccessToken: (env.META_CAPI_ACCESS_TOKEN || "").trim(),
    metaTestEventCode: (env.META_TEST_EVENT_CODE || "").trim(),
    metaGraphVersion: (env.META_GRAPH_API_VERSION || "v20.0").trim(),
    utmifyToken: (env.UTMIFY_API_TOKEN || "").trim(),
    utmifyUrl: (env.UTMIFY_API_URL || "https://api.utmify.com.br/api-credentials/orders").trim(),
    webhookVerifyKey: (env.BRAVO_WEBHOOK_SECRET || env.WEBHOOK_SECRET || "").trim()
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
  "charge.succeeded"
]);

const NON_PURCHASE_STATUSES = new Set([
  "pending",
  "waiting_payment",
  "pix_generated",
  "boleto_generated",
  "created",
  "processing",
  "authorized",
  "failed",
  "refused",
  "declined",
  "canceled",
  "cancelled",
  "refunded",
  "chargeback",
  "expired"
]);

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
    contents: [
      {
        id: canonical.sku,
        content_id: canonical.sku,
        content_type: "product",
        content_name: canonical.name,
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
    db: { orders: {}, last_session: null, capi_log: [], tiktok_log: [], utmify_log: [] }
  };
}

function loadDb() {
  const file = getDbFilePath();
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      parsed.orders = parsed.orders || {};
      parsed.capi_log = parsed.capi_log || [];
      parsed.tiktok_log = parsed.tiktok_log || [];
      parsed.utmify_log = parsed.utmify_log || [];
      globalThis.__HP_TRACKING_MEM__.db = parsed;
      return parsed;
    }
  } catch (_) {}
  return globalThis.__HP_TRACKING_MEM__.db;
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

function sha256Norm(val, mode = "text") {
  if (!val || typeof val !== "string") return null;
  let v = val.trim().toLowerCase();
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

function sanitizeEventUrl(rawUrl, fallbackUrl) {
  const candidate = String(rawUrl || fallbackUrl || "https://hollowpaw-vercel-ready.vercel.app/").trim();
  try {
    const u = new URL(candidate);
    // Remove eventuais parâmetros de PII caso alguém passe na URL por engano
    const piiParams = ["email", "e-mail", "phone", "telefone", "celular", "cpf", "document", "name", "nome", "address", "endereco", "cep"];
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

  const emHash = sha256Norm(cust.email, "email");
  const phHash = sha256Norm(cust.phone, "phone");
  const zpHash = sha256Norm(cust.cep, "cep");
  const ctHash = sha256Norm(cust.city);
  const stHash = sha256Norm(cust.state);
  const countryHash = sha256Norm("br");

  const fullName = String(cust.name || "").trim();
  if (fullName) {
    const parts = fullName.split(/\s+/);
    const fnHash = sha256Norm(parts[0]);
    const lnHash = parts.length > 1 ? sha256Norm(parts.slice(1).join(" ")) : null;
    if (fnHash) userData.fn = [fnHash];
    if (lnHash) userData.ln = [lnHash];
  }

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

  const emHash = sha256Norm(cust.email, "email");
  const phHash = sha256Norm(cust.phone, "tiktok_phone");
  const extHash = sha256Norm(externalId || cd.order_id || cust.email || "");

  if (emHash) userObj.email = emHash;
  if (phHash) userObj.phone = phHash;
  if (extHash) userObj.external_id = extHash;

  const cleanUrl = sanitizeEventUrl(eventSourceUrl, attr.landing_page);
  const pageObj = {
    url: cleanUrl
  };
  if (attr.referrer && typeof attr.referrer === "string" && attr.referrer.trim()) {
    pageObj.referrer = attr.referrer.trim();
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
    const val = typeof cd.value === "number" && !Number.isNaN(cd.value) ? cd.value : 29.9;
    const qty = Math.max(1, parseInt(cd.num_items || 1, 10) || 1);
    const unitPrice = Number((val / qty).toFixed(2));

    properties.currency = "BRL";
    properties.value = val;
    properties.content_type = "product";
    properties.content_id = String(cid);
    properties.content_name = String(cname);
    properties.contents = [
      {
        content_id: String(cid),
        content_type: "product",
        content_name: String(cname),
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

function buildUtmifyPayload(orderRecord) {
  const attr = orderRecord.attribution || {};
  const cust = orderRecord.customer || {};
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

async function dispatchUtmify(orderRecord) {
  const cfg = getConfig();
  const payload = buildUtmifyPayload(orderRecord);
  if (!cfg.utmifyToken) {
    return { sent: false, configured: false, reason: "UTMIFY_CREDENTIAL_NOT_CONFIGURED" };
  }
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

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || "0.0.0.0";
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) {
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
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
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

async function handlePaymentWebhook(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }
  const cfg = getConfig();
  if (cfg.webhookVerifyKey) {
    const sig =
      req.headers["x-bravo-signature"] ||
      req.headers["x-webhook-secret"] ||
      req.headers["authorization"] ||
      "";
    if (!sig || !sig.includes(cfg.webhookVerifyKey)) {
      return sendJson(res, 401, { ok: false, error: "invalid_webhook_signature" });
    }
  }

  const body = await readJsonBody(req);
  const clientIp = getClientIp(req);
  const ua = req.headers["user-agent"] || "";

  const orderId = String(
    body.order_id || body.orderId || body.id || body.transaction_id || body.reference || ""
  ).trim();
  const rawStatus = String(
    body.status || body.event || body.payment_status || body.state || ""
  )
    .trim()
    .toLowerCase();

  if (!orderId || !rawStatus) {
    return sendJson(res, 400, { ok: false, error: "missing_order_id_or_status" });
  }

  const isApproved = APPROVED_STATUSES.has(rawStatus);
  const db = loadDb();
  const lastSess = db.last_session || {};
  let existing = db.orders[orderId];

  if (!existing) {
    const rawPid = body.product_id || body.product_sku || lastSess.product_id || "product1";
    const canonical = resolveCanonicalProduct(rawPid) || resolveCanonicalProduct("product1");
    const rawVal = Number(body.value || body.amount || lastSess.value || canonical.price);
    const safeVal = !Number.isNaN(rawVal) && rawVal > 0 && rawVal <= 5000 ? rawVal : canonical.price;

    existing = {
      order_id: orderId,
      product_id: canonical.id,
      product_sku: canonical.sku,
      product_name: canonical.name,
      value: safeVal,
      currency: "BRL",
      payment_method: body.payment_method || "pix",
      customer: body.customer || lastSess.customer || {},
      attribution: body.attribution || lastSess.attribution || {},
      client_ip: lastSess.client_ip || clientIp,
      user_agent: lastSess.user_agent || ua,
      created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
      paid: false,
      status: "waiting_payment",
      capi_purchase_sent: false,
      tiktok_purchase_sent: false,
      browser_purchase_fired: false,
      event_id: `purchase_${orderId}`
    };
    db.orders[orderId] = existing;
  }

  // Idempotência: se já foi pago e enviado para as APIs de conversão, bloqueia duplicidade
  if ((existing.capi_purchase_sent || existing.tiktok_purchase_sent) && isApproved) {
    saveDb(db);
    return sendJson(res, 200, {
      ok: true,
      order_id: orderId,
      status: existing.status,
      paid: true,
      purchase_dispatched: false,
      duplicate_prevented: true,
      event_id: existing.event_id
    });
  }

  // Se NÃO for status aprovado (ex.: pix_generated, waiting_payment), NÃO dispara Purchase
  if (!isApproved) {
    existing.status = NON_PURCHASE_STATUSES.has(rawStatus) ? rawStatus : "waiting_payment";
    existing.paid = false;
    const utmRes = await dispatchUtmify(existing);
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
      status: existing.status,
      paid: false,
      purchase_dispatched: false,
      reason: "payment_not_approved_yet"
    });
  }

  // Pagamento confirmado e aprovado -> Dispara Purchase 1 única vez (TikTok Events API + Meta CAPI + UTMify)
  const eventTime = Math.floor(Date.now() / 1000);
  existing.paid = true;
  existing.status = "paid";
  existing.approved_at = new Date().toISOString().replace("T", " ").slice(0, 19);
  existing.capi_purchase_sent = true;
  existing.tiktok_purchase_sent = true;
  const evId = existing.event_id || `purchase_${orderId}`;
  existing.event_id = evId;
  globalThis.__HP_TRACKING_MEM__.sentEventIds.add(evId);
  globalThis.__HP_TRACKING_MEM__.sentTikTokEventIds.add(evId);

  const customData = {
    value: Number(existing.value || 29.9),
    currency: "BRL",
    content_id: existing.product_sku || "HP-RIDER-01",
    content_ids: [existing.product_sku || "HP-RIDER-01"],
    contents: [
      {
        id: existing.product_sku || "HP-RIDER-01",
        content_id: existing.product_sku || "HP-RIDER-01",
        content_type: "product",
        content_name: existing.product_name || PRODUCT_NAMES.product1,
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

  const capiPayload = buildMetaCapiPayload({
    eventName: "Purchase",
    eventId: evId,
    eventTime,
    eventSourceUrl,
    customData,
    attribution: existing.attribution,
    customer: existing.customer,
    clientIp: existing.client_ip,
    userAgent: existing.user_agent
  });

  const tiktokPayload = buildTikTokEventsPayload({
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
  });

  const [capiRes, tiktokRes, utmRes] = await Promise.all([
    dispatchMetaCapi(capiPayload),
    dispatchTikTokEventsApi(tiktokPayload),
    dispatchUtmify(existing)
  ]);

  db.capi_log.push({
    event_name: "Purchase",
    event_id: evId,
    order_id: orderId,
    timestamp: eventTime,
    result: capiRes
  });
  db.tiktok_log.push({
    event_name: "Purchase",
    event_id: evId,
    order_id: orderId,
    timestamp: eventTime,
    result: tiktokRes
  });
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
    status: "paid",
    paid: true,
    purchase_dispatched: true,
    duplicate_prevented: false,
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
  getConfig,
  resolveCanonicalProduct,
  sanitizeCustomData,
  loadDb,
  saveDb,
  buildMetaCapiPayload,
  dispatchMetaCapi,
  buildTikTokEventsPayload,
  dispatchTikTokEventsApi,
  getClientIp,
  readJsonBody,
  sendJson,
  handlePaymentWebhook
};
