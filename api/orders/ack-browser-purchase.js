/**
 * Vercel Serverless Function: POST /api/orders/ack-browser-purchase
 * Registra que o navegador já disparou o evento `Purchase` daquele pedido,
 * garantindo que atualizar a página (F5) ou limpar o storage jamais duplique o evento.
 */
"use strict";

const { loadDb, saveDb, readJsonBody, sendJson } = require("../_lib/tracking-core");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const body = await readJsonBody(req);
  const orderId = String(body.order_id || "").trim();
  if (!orderId) {
    return sendJson(res, 400, { ok: false, error: "missing_order_id" });
  }

  const db = loadDb();
  const order = db.orders[orderId];
  if (order) {
    order.browser_purchase_fired = true;
    saveDb(db);
  }

  return sendJson(res, 200, { ok: true, order_id: orderId, browser_purchase_fired: true });
};
