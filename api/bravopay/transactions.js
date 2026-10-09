/**
 * Vercel Serverless Function: GET / POST /api/bravopay/transactions
 * =================================================================
 * Integração server-side oficial com a API da BravoPay (https://bravopay.club/api/v1).
 * - Autentica exclusivamente no servidor via `Authorization: Bearer <BRAVOPAY_API_TOKEN>`.
 * - Cria cobranças em `POST /transactions` com `amount_cents` (2990 = R$ 29,90),
 *   `external_reference` (order_id interno), `metadata`, `customer` e `utm`.
 * - Associa `transaction_id` (tx_...) ao `order_id` interno com status inicial `created` -> `pending`.
 * - Consulta transações em `GET /transactions/{id}` sem expor tokens ou PII.
 * - NUNCA dispara `Purchase` na criação da cobrança.
 */
"use strict";

const {
  getConfig,
  resolveCanonicalProduct,
  hashCustomerForStorage,
  loadDb,
  saveDb,
  createBravoPayTransaction,
  fetchBravoPayTransaction,
  getClientIp,
  readJsonBody,
  sendJson
} = require("../_lib/tracking-core");

module.exports = async function handler(req, res) {
  const cfg = getConfig();

  if (req.method === "GET") {
    const urlObj = new URL(req.url, "https://hollowpaw-vercel-ready.vercel.app");
    const txId = String(urlObj.searchParams.get("id") || urlObj.searchParams.get("transaction_id") || "").trim();
    const orderId = String(urlObj.searchParams.get("order_id") || "").trim();

    if (!txId && !orderId) {
      return sendJson(res, 200, {
        ok: true,
        endpoint: "/api/bravopay/transactions",
        base_url: cfg.bravoApiUrl,
        token_configured: Boolean(cfg.bravoApiToken),
        webhook_secret_configured: Boolean(cfg.webhookVerifyKey),
        supported_methods: ["GET", "POST"]
      });
    }

    const db = loadDb();
    const resolvedOrderId =
      orderId || (txId && db.transaction_to_order && db.transaction_to_order[txId]) || "";
    const order = resolvedOrderId ? db.orders[resolvedOrderId] : null;
    const targetTxId = txId || (order && order.transaction_id) || "";

    let gatewayCheck = null;
    if (targetTxId && cfg.bravoApiToken && urlObj.searchParams.get("verify") === "1") {
      gatewayCheck = await fetchBravoPayTransaction(targetTxId);
    }

    return sendJson(res, 200, {
      ok: true,
      order_id: resolvedOrderId || null,
      transaction_id: targetTxId || null,
      exists: Boolean(order),
      status: order ? order.status : "unknown",
      paid: Boolean(order && order.paid),
      amount_cents: order ? order.amount_cents : null,
      value: order ? order.value : null,
      currency: order ? order.currency : "BRL",
      gateway_check: gatewayCheck
    });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const body = await readJsonBody(req);
  const canonical =
    resolveCanonicalProduct(body.product_id || body.product_sku) ||
    resolveCanonicalProduct("product1");
  const expectedAmountCents = Math.round(Number(canonical.price) * 100);

  if (
    body.amount_cents !== undefined &&
    body.amount_cents !== null &&
    Math.round(Number(body.amount_cents)) !== expectedAmountCents
  ) {
    return sendJson(res, 400, {
      ok: false,
      error: "amount_mismatch",
      expected_amount_cents: expectedAmountCents,
      received_amount_cents: Number(body.amount_cents),
      purchase_dispatched: false
    });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const randSuffix = Math.random().toString(36).slice(2, 7);
  const orderId = String(body.order_id || body.external_reference || `ord_${nowSec}_${randSuffix}`)
    .trim()
    .slice(0, 120);

  const clientIp = getClientIp(req);
  const ua = req.headers["user-agent"] || "";
  const rawCustomer = body.customer && typeof body.customer === "object" ? body.customer : {};
  const hashedCustomer = hashCustomerForStorage(rawCustomer);
  const attribution =
    (body.attribution && typeof body.attribution === "object" ? body.attribution : null) ||
    (body.utm && typeof body.utm === "object" ? body.utm : {}) ||
    {};

  const db = loadDb();
  let orderRecord = db.orders[orderId];
  if (!orderRecord) {
    orderRecord = {
      order_id: orderId,
      transaction_id: null,
      product_id: canonical.id,
      product_sku: canonical.sku,
      product_name: canonical.name,
      product_category: canonical.category,
      amount_cents: expectedAmountCents,
      value: canonical.price,
      currency: "BRL",
      payment_method: String(body.method || "pix").toLowerCase() === "card" ? "card" : "pix",
      customer: hashedCustomer,
      attribution,
      client_ip: clientIp,
      user_agent: ua,
      created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
      updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
      paid: false,
      status: "created",
      capi_purchase_sent: false,
      tiktok_purchase_sent: false,
      purchase_webhook_processed: false,
      browser_purchase_fired: false,
      event_id: `purchase_${orderId}`
    };
    db.orders[orderId] = orderRecord;
  }

  const txRes = await createBravoPayTransaction({
    orderId,
    productId: canonical.id,
    method: orderRecord.payment_method,
    customer: rawCustomer,
    attribution,
    description: body.description || `${canonical.name} - Pedido ${orderId}`,
    expiresIn: body.expires_in || 3600
  });

  if (txRes.created && txRes.transaction_id) {
    orderRecord.transaction_id = txRes.transaction_id;
    orderRecord.status = "pending";
    orderRecord.paid = false;
    orderRecord.updated_at = new Date().toISOString().replace("T", " ").slice(0, 19);
    db.transaction_to_order[txRes.transaction_id] = orderId;
  }

  db.bravopay_log.push({
    action: "create_transaction",
    order_id: orderId,
    transaction_id: txRes.transaction_id || null,
    amount_cents: expectedAmountCents,
    timestamp: nowSec,
    created: Boolean(txRes.created),
    configured: Boolean(txRes.configured),
    http_status: txRes.http_status || null,
    error: txRes.error || txRes.reason || null
  });

  saveDb(db);

  const statusCode = txRes.created ? 200 : txRes.configured === false ? 200 : txRes.http_status || 502;
  return sendJson(res, statusCode, {
    ok: Boolean(txRes.created || txRes.configured === false),
    order_id: orderId,
    transaction_id: orderRecord.transaction_id || null,
    status: orderRecord.status,
    paid: false,
    purchase_dispatched: false,
    amount_cents: orderRecord.amount_cents,
    value: orderRecord.value,
    currency: orderRecord.currency,
    bravopay: txRes
  });
};
