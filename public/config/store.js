/* ==========================================================================
   HOLLOWPAW — CONFIGURAÇÕES DA LOJA (BRASIL)
   ========================================================================== */
(function (root) {
  "use strict";

  var STORE = {
    brandName: "Hollowpaw",
    legalName: "Hollowpaw",
    siteUrl: "https://www.hollowpaw.com.br",
    supportEmail: "atendimento@hollowpaw.com.br",
    supportHours: "Segunda a sexta, das 9h às 18h (horário de Brasília)",
    responseTime: "em até 1 dia útil",
    processingDaysMin: 1,
    processingDaysMax: 3,
    shippingDaysBRMin: 5,
    shippingDaysBRMax: 12,
    maxDeliveryDays: 15,
    returnWindowDays: 30,
    cdcReturnDays: 7,
    policyEffectiveDate: "7 de outubro de 2026",
    governingLaw: "leis da República Federativa do Brasil",
    currency: "BRL"
  };

  root.STORE = STORE;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { STORE: STORE };
  }
})(typeof window !== "undefined" ? window : globalThis);
