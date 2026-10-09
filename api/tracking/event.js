/**
 * Vercel Serverless Function: POST /api/tracking/event
 * Recebe eventos de funil (PageView, ViewContent, Search, AddToCart, InitiateCheckout,
 * AddPaymentInfo, PlaceAnOrder) e envia para a TikTok Events API (v1.3) e Meta Conversions API (CAPI)
 * com o mesmo `event_id` do navegador para deduplicação exata.
 * Bloqueia qualquer tentativa de disparar `Purchase` diretamente sem confirmação de webhook.
 */
"use strict";

const {
  ALLOWED_BROWSER_EVENTS,
  sanitizeCustomData,
  loadDb,
  saveDb,
  buildMetaCapiPayload,
  dispatchMetaCapi,
  buildTikTokEventsPayload,
  dispatchTikTokEventsApi,
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
  const evId = String(body.event_id || "").trim().slice(0, 128);

  if (!evName || !evId) {
    return sendJson(res, 400, { ok: false, error: "missing_event_name_or_id" });
  }

  const lowerName = evName.toLowerCase();
  if (lowerName === "purchase" || lowerName === "completepayment") {
    return sendJson(res, 403, {
      ok: false,
      error: "purchase_requires_backend_payment_webhook_confirmation"
    });
  }

  if (!ALLOWED_BROWSER_EVENTS.has(evName)) {
    return sendJson(res, 400, {
      ok: false,
      error: "unsupported_event_name"
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
  const eventTime = Math.floor(Date.now() / 1000);
  const safeCustomData = sanitizeCustomData(evName, body.custom_data, body.product_id);
  const customer = (db.last_session || {}).customer || {};

  const capiPayload = buildMetaCapiPayload({
    eventName: evName,
    eventId: evId,
    eventTime,
    eventSourceUrl: body.event_source_url,
    customData: safeCustomData,
    attribution: body.attribution,
    customer,
    clientIp,
    userAgent: ua
  });

  // PageView no TikTok já é disparado 1x no navegador por `ttq.page()`;
  // Eventos de funil enviados pelo navegador chamam diretamente `/api/tiktok/events` (`tiktok_handled: true`).
  // Se `/api/tracking/event` for chamado diretamente sem `tiktok_handled`, envia também para a TikTok Events API.
  let tiktokRes = {
    sent: false,
    skipped: body.tiktok_handled ? "dispatched_via_api_tiktok_events" : "pageview_handled_by_browser_pixel"
  };
  if (evName !== "PageView" && !body.tiktok_handled) {
    mem.sentTikTokEventIds.add(evId);
    const tiktokPayload = buildTikTokEventsPayload({
      eventName: evName,
      eventId: evId,
      eventTime,
      eventSourceUrl: body.event_source_url,
      customData: safeCustomData,
      attribution: body.attribution,
      customer,
      clientIp,
      userAgent: ua
    });
    tiktokRes = await dispatchTikTokEventsApi(tiktokPayload);
    db.tiktok_log.push({
      event_name: evName,
      event_id: evId,
      timestamp: eventTime,
      result: tiktokRes
    });
  }

  const capiRes = await dispatchMetaCapi(capiPayload);
  db.capi_log.push({
    event_name: evName,
    event_id: evId,
    timestamp: eventTime,
    result: capiRes
  });
  saveDb(db);

  return sendJson(res, 200, {
    ok: true,
    event_id: evId,
    tiktok: tiktokRes,
    capi: capiRes
  });
};
