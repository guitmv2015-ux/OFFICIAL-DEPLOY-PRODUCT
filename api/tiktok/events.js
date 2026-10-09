/**
 * Vercel Serverless Function: /api/tiktok/events
 * Endpoint dedicado da TikTok Events API v1.3:
 *  - GET: retorna status de configuração (sem jamais expor o token privado).
 *  - POST: valida, sanitiza valores com base no catálogo oficial do servidor e envia
 *          eventos para `https://business-api.tiktok.com/open_api/v1.3/event/track/`
 *          autenticando via `process.env.TIKTOK_ACCESS_TOKEN`.
 *  - Bloqueia qualquer tentativa de disparar `Purchase` diretamente pelo navegador.
 */
"use strict";

const {
  ALLOWED_BROWSER_EVENTS,
  getConfig,
  sanitizeCustomData,
  loadDb,
  saveDb,
  buildTikTokEventsPayload,
  dispatchTikTokEventsApi,
  getClientIp,
  readJsonBody,
  sendJson
} = require("../_lib/tracking-core");

module.exports = async function handler(req, res) {
  const cfg = getConfig();
  const hasServerToken = Boolean(
    process.env.TIKTOK_ACCESS_TOKEN && process.env.TIKTOK_ACCESS_TOKEN.trim()
  );

  if (req.method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      service: "tiktok_events_api",
      api_version: "v1.3",
      pixel_id: cfg.tiktokPixelId,
      token_configured: hasServerToken,
      test_event_code_configured: Boolean(cfg.tiktokTestEventCode)
    });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const body = await readJsonBody(req);
  const evName = String(body.event || body.event_name || "").trim();
  const evId = String(body.event_id || "").trim().slice(0, 128);

  if (!evName || !evId) {
    return sendJson(res, 400, { ok: false, error: "missing_event_or_event_id" });
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
  if (mem.sentTikTokEventIds.has(evId)) {
    return sendJson(res, 200, { ok: true, deduplicated: true, event_id: evId });
  }
  mem.sentTikTokEventIds.add(evId);

  const db = loadDb();
  const clientIp = getClientIp(req);
  const ua = body.user_agent || req.headers["user-agent"] || "";
  const eventTime = Math.floor(Date.now() / 1000);
  const safeCustomData = sanitizeCustomData(
    evName,
    body.properties || body.custom_data,
    body.product_id
  );
  const customer = (db.last_session || {}).customer || {};

  const tiktokPayload = buildTikTokEventsPayload({
    eventName: evName,
    eventId: evId,
    eventTime,
    eventSourceUrl: body.url || body.event_source_url,
    customData: safeCustomData,
    attribution: body.attribution,
    customer,
    clientIp,
    userAgent: ua
  });

  const tiktokRes = await dispatchTikTokEventsApi(tiktokPayload);
  db.tiktok_log.push({
    event_name: evName,
    event_id: evId,
    timestamp: eventTime,
    result: tiktokRes
  });
  saveDb(db);

  return sendJson(res, 200, {
    ok: true,
    event_id: evId,
    tiktok: tiktokRes
  });
};
