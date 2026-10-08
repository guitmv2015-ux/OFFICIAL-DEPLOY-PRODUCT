/**
 * Vercel Serverless Function: POST /api/webhooks/payment
 * Recebe notificações de pagamento do gateway com idempotência estrita.
 * Somente status efetivamente pagos disparam `Purchase` (Meta CAPI + UTMify).
 */
"use strict";

const { handlePaymentWebhook } = require("../_lib/tracking-core");

module.exports = async function handler(req, res) {
  return handlePaymentWebhook(req, res);
};
