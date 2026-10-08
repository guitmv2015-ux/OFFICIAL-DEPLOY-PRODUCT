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
  const orderId = String(
    urlObj.searchParams.get("order_id") || urlObj.searchParams.get("pedido") || ""
  ).trim();

  if (!orderId) {
    return sendJson(res, 400, { ok: false, error: "missing_order_id", paid: false });
  }

  const db = loadDb();
  const order = db.orders[orderId];

  if (!order) {
    return sendJson(res, 200, {
      ok: true,
      order_id: orderId,
      exists: false,
      paid: false,
      status: "unknown",
      browser_purchase_fired: false
    });
  }

  return sendJson(res, 200, {
    ok: true,
    order_id: orderId,
    exists: true,
    paid: Boolean(order.paid),
    status: order.status || "pending",
    event_id: order.event_id || `purchase_${orderId}`,
    browser_purchase_fired: Boolean(order.browser_purchase_fired),
    value: Number(order.value || 29.9),
    currency: order.currency || "BRL",
    product_id: order.product_id || "product1"
  });
};
