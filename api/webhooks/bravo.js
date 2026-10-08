/**
 * Vercel Serverless Function: POST /api/webhooks/bravo
 * Endpoint dedicado para o webhook de pagamento da Bravo.
 */
"use strict";

const { handlePaymentWebhook } = require("../_lib/tracking-core");

module.exports = async function handler(req, res) {
  return handlePaymentWebhook(req, res);
};
