/**
 * Vercel Serverless Function: POST /api/orders/session
 * Salva os dados de entrega + parâmetros de atribuição (UTMs, fbclid, _fbp, _fbc, xcod, sck)
 * antes do redirecionamento ao checkout externo.
 */
"use strict";

const {
  PRODUCT_NAMES,
  PRODUCT_SKUS,
  loadDb,
  saveDb,
  getClientIp,
  readJsonBody,
  sendJson
} = require("../_lib/tracking-core");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const body = await readJsonBody(req);
  const pid = body.product_id || "product1";
  const sessionRecord = {
    session_id: `sess_${ Math.floor(Date.now() / 1000) }`,
    product_id: pid,
    product_sku: body.product_sku || PRODUCT_SKUS[pid] || "HP-RIDER-01",
    product_name: body.product_name || PRODUCT_NAMES[pid] || PRODUCT_NAMES.product1,
    value: Number(body.value || 29.9),
    currency: "BRL",
    customer: body.customer || {},
    attribution: body.attribution || {},
    client_ip: getClientIp(req),
    user_agent: req.headers["user-agent"] || "",
    created_at: new Date().toISOString().replace("T", " ").slice(0, 19)
  };

  const db = loadDb();
  db.last_session = sessionRecord;
  saveDb(db);

  return sendJson(res, 200, { ok: true, session_id: sessionRecord.session_id });
};
