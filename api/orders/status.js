/**
 * Vercel Serverless Function: GET /api/orders/status
 * Consulta se um pedido foi efetivamente confirmado como PAGO via webhook antes
 * de autorizar o disparo do evento `Purchase` no navegador.
 */
"use strict";

const { loadDb, sendJson } = require("../_lib/tracking-core");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const urlObj = new URL(req.url, "https://www.hollowpaw.com.br");
  const rawOrderId = String(
    urlObj.searchParams.get("order_id") || urlObj.searchParams.get("pedido") || ""
  ).trim();
  const rawTxId = String(urlObj.searchParams.get("transaction_id") || "").trim();

  if (!rawOrderId && !rawTxId) {
    return sendJson(res, 400, { ok: false, error: "missing_order_id", paid: false });
  }

  const db = loadDb();
  const resolvedOrderId =
    rawOrderId || (rawTxId && db.transaction_to_order && db.transaction_to_order[rawTxId]) || rawTxId;
  const order = db.orders[resolvedOrderId];

  if (!order) {
    return sendJson(res, 200, {
      ok: true,
      order_id: resolvedOrderId,
      transaction_id: rawTxId || null,
      exists: false,
      paid: false,
      status: "unknown",
      browser_purchase_fired: false
    });
  }

  return sendJson(res, 200, {
    ok: true,
    order_id: order.order_id || resolvedOrderId,
    transaction_id: order.transaction_id || null,
    exists: true,
    paid: Boolean(order.paid),
    status: order.status || "pending",
    event_id: order.event_id || `purchase_${order.order_id || resolvedOrderId}`,
    capi_purchase_sent: Boolean(order.capi_purchase_sent),
    tiktok_purchase_sent: Boolean(order.tiktok_purchase_sent),
    browser_purchase_fired: Boolean(order.browser_purchase_fired),
    amount_cents: Number(order.amount_cents || Math.round(Number(order.value || 29.9) * 100)),
    value: Number(order.value || 29.9),
    currency: order.currency || "BRL",
    product_id: order.product_id || "product1"
  });
};
