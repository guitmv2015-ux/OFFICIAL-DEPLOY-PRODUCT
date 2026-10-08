/**
 * Vercel Serverless Function: POST /api/tracking/event
 * Recebe eventos de funil (PageView, ViewContent, Search, AddToCart, InitiateCheckout)
 * e envia para a Meta Conversions API (CAPI) com o mesmo `event_id` do navegador.
 * Bloqueia qualquer tentativa de disparar `Purchase` diretamente sem confirmação de webhook.
 */
"use strict";

const {
  loadDb,
  saveDb,
  buildMetaCapiPayload,
  dispatchMetaCapi,
  getClientIp,
  readJsonBody,
  sendJson
} = require("../_lib/tracking-core");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const body = await readJsonBody(req);
  const evName = String(body.event_name || "").trim();
  const evId = String(body.event_id || "").trim();

  if (!evName || !evId) {
    return sendJson(res, 400, { ok: false, error: "missing_event_name_or_id" });
  }

  if (evName.toLowerCase() === "purchase") {
    return sendJson(res, 403, {
      ok: false,
      error: "purchase_requires_backend_payment_webhook_confirmation"
    });
  }

  const mem = globalThis.__HP_TRACKING_MEM__;
  if (mem.sentEventIds.has(evId)) {
    return sendJson(res, 200, { ok: true, deduplicated: true, event_id: evId });
  }
  mem.sentEventIds.add(evId);

  const db = loadDb();
  const clientIp = getClientIp(req);
  const ua = body.user_agent || req.headers["user-agent"] || "";

  const capiPayload = buildMetaCapiPayload({
    eventName: evName,
    eventId: evId,
    eventSourceUrl: body.event_source_url,
    customData: body.custom_data,
    attribution: body.attribution,
    customer: (db.last_session || {}).customer,
    clientIp,
    userAgent: ua
  });

  const capiRes = await dispatchMetaCapi(capiPayload);
  db.capi_log.push({
    event_name: evName,
    event_id: evId,
    timestamp: Math.floor(Date.now() / 1000),
    result: capiRes
  });
  saveDb(db);

  return sendJson(res, 200, { ok: true, event_id: evId, capi: capiRes });
};
