/**
 * Vercel Serverless Function: POST /api/orders/session
 * Salva os dados de entrega + parâmetros de atribuição (UTMs, ttclid, _ttp, fbclid, _fbp, _fbc, xcod, sck)
 * antes do redirecionamento ao checkout externo, e dispara o evento `PlaceAnOrder`
 * na TikTok Events API com o mesmo `event_id` gerado no navegador.
 */
"use strict";

const {
  resolveCanonicalProduct,
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
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const body = await readJsonBody(req);
  const canonical =
    resolveCanonicalProduct(body.product_id || body.product_sku) ||
    resolveCanonicalProduct("product1");
  const clientIp = getClientIp(req);
  const ua = req.headers["user-agent"] || "";
  const nowSec = Math.floor(Date.now() / 1000);

  const sessionRecord = {
    session_id: `sess_${nowSec}`,
    product_id: canonical.id,
    product_sku: canonical.sku,
    product_name: canonical.name,
    value: canonical.price,
    currency: "BRL",
    customer: body.customer || {},
    attribution: body.attribution || {},
    client_ip: clientIp,
    user_agent: ua,
    created_at: new Date().toISOString().replace("T", " ").slice(0, 19)
  };

  const db = loadDb();
  db.last_session = sessionRecord;

  const evId = String(body.event_id || `pao_${canonical.id}_${nowSec}`).trim().slice(0, 128);
  const mem = globalThis.__HP_TRACKING_MEM__;
  let tiktokRes = { sent: false, deduplicated: true };

  if (!mem.sentTikTokEventIds.has(evId)) {
    mem.sentTikTokEventIds.add(evId);
    const safeCustomData = sanitizeCustomData("PlaceAnOrder", {}, canonical.id);
    const tiktokPayload = buildTikTokEventsPayload({
      eventName: "PlaceAnOrder",
      eventId: evId,
      eventTime: nowSec,
      eventSourceUrl: body.event_source_url || "https://hollowpaw-vercel-ready.vercel.app/informacoes-entrega",
      customData: safeCustomData,
      attribution: sessionRecord.attribution,
      customer: sessionRecord.customer,
      clientIp,
      userAgent: ua,
      externalId: sessionRecord.session_id
    });
    tiktokRes = await dispatchTikTokEventsApi(tiktokPayload);
    db.tiktok_log.push({
      event_name: "PlaceAnOrder",
      event_id: evId,
      timestamp: nowSec,
      result: tiktokRes
    });
  }

  saveDb(db);

  return sendJson(res, 200, {
    ok: true,
    session_id: sessionRecord.session_id,
    event_id: evId,
    tiktok: tiktokRes
  });
};
