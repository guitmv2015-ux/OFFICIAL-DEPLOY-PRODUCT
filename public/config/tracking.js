/* ==========================================================================
   HOLLOWPAW — CONFIGURAÇÃO CENTRAL DE RASTREAMENTO (META PIXEL, CAPI & UTMIFY)
   --------------------------------------------------------------------------
   • ATENÇÃO: NUNCA coloque chaves privadas ou tokens de API neste arquivo
     público. Credenciais de servidor são configuradas exclusivamente nas
     Environment Variables do Vercel (/api/*).
   • Eventos rastreados:
       PageView          → todas as páginas públicas (1x por navegação)
       ViewContent       → abertura de página individual de produto (BRL)
       Search            → somente quando o usuário realiza uma busca real
       AddToCart         → somente quando um item é adicionado ao carrinho
       InitiateCheckout  → clique real para iniciar o checkout ("Comprar agora")
       Purchase          → SOMENTE após confirmação de pagamento aprovado pelo
                           backend/webhook (idempotente com event_id único).
   ========================================================================== */
window.TRACKING_CONFIG = {
  META_PIXEL_ID: "1576880640332577",
  TIKTOK_PIXEL_ID: "DB477NJC77U2NTDCJ9JG",
  GA4_ID: "",
  GTM_ID: "",

  /* Endpoints Serverless (/api/* no Vercel) para CAPI, atribuição e validação de Purchase */
  API_ENDPOINTS: {
    EVENT: "/api/tracking/event",
    ORDER_SESSION: "/api/orders/session",
    ORDER_STATUS: "/api/orders/status",
    ACK_PURCHASE: "/api/orders/ack-browser-purchase"
  },

  PURCHASE_CONFIRMATION: {
    ENABLED: true,
    REQUIRE_BACKEND_CONFIRMATION: true,
    ORDER_ID_PARAMS: ["pedido", "order_id", "orderId", "order", "transaction_id"],
    VALUE_PARAM: "valor",
    PRODUCT_PARAM: "produto"
  },

  DEBUG: false
};
