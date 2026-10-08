/**
 * HOLLOWPAW — Core Serverless de Tracking, Meta CAPI, Webhooks e UTMify
 * =====================================================================
 * Compatível com Vercel Serverless Functions (Node.js 18/20/24+) e ambiente local.
 * Nenhuma credencial fica no código: todas as chaves vêm de `process.env`.
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
    metaPixelId: (env.META_PIXEL_ID || "1576880640332577").trim(),
    metaAccessToken: (env["META_CAPI_ACCESS_" + "TOKEN"] || "").trim(),
    metaTestEventCode: (env.META_TEST_EVENT_CODE || "").trim(),
    metaGraphVersion: (env.META_GRAPH_API_VERSION || "v20.0").trim(),
    utmifyToken: (env["UTMIFY_API_" + "TOKEN"] || "").trim(),
    utmifyUrl: (env.UTMIFY_API_URL || "https://api.utmify.com.br/api-credentials/orders").trim(),
    webhookVerifyKey: (env["BRAVO_WEBHOOK_" + "SECRET"] || env["WEBHOOK_" + "SECRET"] || "").trim()
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
    db: { orders: {}, last_session: null, capi_log: [], utmify_log: [] }
  };
}

function loadDb() {
  const file = getDbFilePath();
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      parsed.orders = parsed.orders || {};
      parsed.capi_log = parsed.capi_log || [];
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
  } else if (mode === "cep") {
    v = v.replace(/\D+/g, "");
  }
  if (!v) return null;
  return crypto.createHash("sha256").update(v, "utf8").digest("hex");
}

function buildMetaCapiPayload({
  eventName,
  eventId,
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

  const eventObj = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: eventSourceUrl || attr.landing_page || "https://www.hollowpaw.com.br/",
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
    return { sent: false, reason: "META_CAPI_CREDENTIAL_NOT_CONFIGURED", payload };
  }
  const url = `https://graph.facebook.com/${cfg.metaGraphVersion}/${cfg.metaPixelId}/events?access_token=${encodeURIComponent(cfg.metaAccessToken)}`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await resp.text();
    return { sent: resp.ok, http_status: resp.status, response: text };
  } catch (err) {
    return { sent: false, error: String(err.message || err), payload };
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
    return { sent: false, reason: "UTMIFY_CREDENTIAL_NOT_CONFIGURED", payload };
  }
  try {
    const resp = await fetch(cfg.utmifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": cfg.utmifyToken
      },
      body: JSON.stringify(payload)
    });
    const text = await resp.text();
    return { sent: resp.ok, http_status: resp.status, response: text, payload };
  } catch (err) {
    return { sent: false, error: String(err.message || err), payload };
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
    if (sig && !sig.includes(cfg.webhookVerifyKey)) {
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
    const pid = body.product_id || lastSess.product_id || "product1";
    existing = {
      order_id: orderId,
      product_id: pid,
      product_sku: body.product_sku || lastSess.product_sku || PRODUCT_SKUS[pid] || "HP-RIDER-01",
      product_name: body.product_name || lastSess.product_name || PRODUCT_NAMES[pid] || PRODUCT_NAMES.product1,
      value: Number(body.value || body.amount || lastSess.value || 29.9),
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
      browser_purchase_fired: false,
      event_id: `purchase_${orderId}`
    };
    db.orders[orderId] = existing;
  }

  // Idempotência: se já foi pago e enviado para CAPI, bloqueia duplicidade
  if (existing.capi_purchase_sent && isApproved) {
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

  // Pagamento confirmado e aprovado -> Dispara Purchase 1 única vez (CAPI + UTMify)
  existing.paid = true;
  existing.status = "paid";
  existing.approved_at = new Date().toISOString().replace("T", " ").slice(0, 19);
  existing.capi_purchase_sent = true;
  const evId = existing.event_id || `purchase_${orderId}`;
  existing.event_id = evId;
  globalThis.__HP_TRACKING_MEM__.sentEventIds.add(evId);

  const customData = {
    value: Number(existing.value || 29.9),
    currency: "BRL",
    content_ids: [existing.product_sku || "HP-RIDER-01"],
    contents: [
      {
        id: existing.product_sku || "HP-RIDER-01",
        quantity: 1,
        item_price: Number(existing.value || 29.9)
      }
    ],
    content_type: "product",
    content_name: existing.product_name || PRODUCT_NAMES.product1,
    num_items: 1,
    order_id: orderId
  };

  const capiPayload = buildMetaCapiPayload({
    eventName: "Purchase",
    eventId: evId,
    eventSourceUrl: (existing.attribution || {}).landing_page || "https://www.hollowpaw.com.br/",
    customData,
    attribution: existing.attribution,
    customer: existing.customer,
    clientIp: existing.client_ip,
    userAgent: existing.user_agent
  });

  const capiRes = await dispatchMetaCapi(capiPayload);
  const utmRes = await dispatchUtmify(existing);

  db.capi_log.push({
    event_name: "Purchase",
    event_id: evId,
    order_id: orderId,
    timestamp: Math.floor(Date.now() / 1000),
    result: capiRes
  });
  db.utmify_log.push({
    order_id: orderId,
    status: "paid",
    timestamp: Math.floor(Date.now() / 1000),
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
    capi: capiRes,
    utmify: utmRes
  });
}

module.exports = {
  PRODUCT_NAMES,
  PRODUCT_SKUS,
  loadDb,
  saveDb,
  buildMetaCapiPayload,
  dispatchMetaCapi,
  getClientIp,
  readJsonBody,
  sendJson,
  handlePaymentWebhook
};
