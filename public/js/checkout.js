/* ==========================================================================
   HOLLOWPAW — checkout.js
   Confirmação de pedido pós-compra em Português Brasileiro.
   ========================================================================== */
(function () {
  "use strict";
  var PRODUCTS = window.PRODUCTS || {};
  var fmt = window.formatPrice || function (v) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
      .format(Number(v))
      .replace(/\u00a0/g, " ");
  };

  function getProduct(key) {
    if (typeof window.findProduct === "function") return window.findProduct(key);
    return PRODUCTS[key] || null;
  }

  function initThankYouPage() {
    if (document.body.getAttribute("data-page") !== "thank-you") return;
    var params = new URLSearchParams(location.search);
    var raw = null;
    try { raw = JSON.parse(sessionStorage.getItem("hp_last_order") || "null"); } catch (e) {}

    var orderId = params.get("pedido") || params.get("order_id") || (raw && raw.orderId) || "HP-849201";
    var pid = params.get("produto") || params.get("product") || (raw && raw.productId) || "product1";
    var p = getProduct(pid) || PRODUCTS.product1;

    var elOrder = document.getElementById("ty-order-id");
    var elProduct = document.getElementById("ty-product-name");
    var elTotal = document.getElementById("ty-total");
    var elAddress = document.getElementById("ty-address");

    if (elOrder) elOrder.textContent = orderId;
    if (elProduct && p) elProduct.textContent = p.name;
    if (elTotal && p) elTotal.textContent = fmt(p.price);
    if (elAddress && raw && raw.address) elAddress.textContent = raw.address;
  }

  document.addEventListener("DOMContentLoaded", function () {
    initThankYouPage();
  });
})();
