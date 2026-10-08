/* ==========================================================================
   HOLLOWPAW — CONFIGURAÇÃO DE CHECKOUT (BRASIL)
   --------------------------------------------------------------------------
   • Todos os produtos utilizam o fluxo padronizado:
     Página do Produto (/produto/<slug>)
     -> "Comprar agora"
     -> /informacoes-entrega?produto=<id> (ou /pages/informacoes-entrega.html)
     -> Preenchimento dos dados de entrega
     -> "CONTINUAR PARA PAGAMENTO"
     -> Redirecionamento para a URL de checkout externo específica do produto.
   • Ao adicionar um Produto 4 em `public/config/products.js` com `externalCheckoutUrl`,
     ele é automaticamente mapeado abaixo sem precisar editar este arquivo.
   ========================================================================== */
(function (root) {
  "use strict";

  var PRODUCTS = root.PRODUCTS || {};
  var EXTERNAL_CHECKOUT_URLS = {
    product1: "https://pagseguropix.org/c/fantasia-halloween-divertida-pets",
    product2: "https://pagseguropix.org/c/offer-2-prod-2",
    product3: "https://pagseguropix.org/c/fantasia-de-aranha-para-caes-e-gatos-halloween"
  };

  var CHECKOUT_LINKS = {};

  Object.keys(PRODUCTS).forEach(function (k) {
    var p = PRODUCTS[k];
    if (p && p.externalCheckoutUrl) {
      EXTERNAL_CHECKOUT_URLS[k] = p.externalCheckoutUrl;
      if (p.slug) EXTERNAL_CHECKOUT_URLS[p.slug] = p.externalCheckoutUrl;
    }
    CHECKOUT_LINKS[k] = "/pages/informacoes-entrega.html?produto=" + encodeURIComponent(k);
  });

  root.EXTERNAL_CHECKOUT_URLS = EXTERNAL_CHECKOUT_URLS;
  root.PRODUCT_1_EXTERNAL_CHECKOUT_URL = EXTERNAL_CHECKOUT_URLS.product1;
  root.PRODUCT_2_EXTERNAL_CHECKOUT_URL = EXTERNAL_CHECKOUT_URLS.product2;
  root.PRODUCT_3_EXTERNAL_CHECKOUT_URL = EXTERNAL_CHECKOUT_URLS.product3;
  root.CHECKOUT_LINKS = CHECKOUT_LINKS;

  root.CHECKOUT_SETTINGS = {
    FORWARD_PARAMS: true,
    OPEN_IN_NEW_TAB: false
  };

  root.POST_PURCHASE_EMAIL = {
    subject: "Seu pedido foi confirmado — entrega em até 15 dias úteis",
    body: [
      "Obrigado pela sua compra!",
      "",
      "Seu pedido foi confirmado com sucesso e já está sendo preparado para envio.",
      "",
      "📦 INFORMAÇÕES DE ENTREGA",
      "",
      "Seu produto será enviado para o endereço informado durante o pedido.",
      "",
      "Prazo estimado de entrega:",
      "Até 15 dias úteis.",
      "",
      "Seu pedido será entregue diretamente no endereço informado no momento da compra.",
      "",
      "Acompanhe seu e-mail para receber eventuais atualizações sobre o envio.",
      "",
      "Obrigado por comprar conosco!",
      "",
      "Atenciosamente,",
      "Equipe de Suporte"
    ].join("\n")
  };
})(typeof window !== "undefined" ? window : globalThis);
