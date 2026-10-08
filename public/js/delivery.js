/* ==========================================================================
   HOLLOWPAW — delivery.js
   Página de Informações de Entrega para TODOS os produtos cadastrados em
   `public/config/products.js`.
   Valida os campos de entrega em Português Brasileiro e redireciona para o
   checkout externo específico do produto sem expor dados pessoais na URL.
   ========================================================================== */
(function () {
  "use strict";

  var PRODUCTS = window.PRODUCTS || {};
  var DEFAULT_URLS = {
    product1: "https://pagseguropix.org/c/fantasia-halloween-divertida-pets",
    product2: "https://pagseguropix.org/c/offer-2-prod-2",
    product3: "https://pagseguropix.org/c/fantasia-de-aranha-para-caes-e-gatos-halloween"
  };

  var fmt = window.formatPrice || function (v) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
      .format(Number(v))
      .replace(/\u00a0/g, " ");
  };

  function getProduct(key) {
    if (typeof window.findProduct === "function") return window.findProduct(key);
    return PRODUCTS[key] || null;
  }

  function onlyDigits(s) {
    return (s || "").replace(/\D+/g, "");
  }

  function maskPhone(v) {
    var d = onlyDigits(v).slice(0, 11);
    if (d.length <= 2) return d.length ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  function maskCEP(v) {
    var d = onlyDigits(v).slice(0, 8);
    if (d.length <= 5) return d;
    return d.slice(0, 5) + "-" + d.slice(5);
  }

  function resolveProductId() {
    var params = new URLSearchParams(location.search);
    var fromQuery = params.get("produto") || params.get("product");
    if (fromQuery) {
      var matched = getProduct(fromQuery);
      var resolvedId = matched ? matched.id : (DEFAULT_URLS[fromQuery] ? fromQuery : null);
      if (resolvedId) {
        try {
          sessionStorage.setItem("hp_selected_product", resolvedId);
        } catch (e) {}
        return resolvedId;
      }
    }
    try {
      var fromSession = sessionStorage.getItem("hp_selected_product");
      if (fromSession) {
        var matchedSession = getProduct(fromSession);
        if (matchedSession) return matchedSession.id;
        if (DEFAULT_URLS[fromSession]) return fromSession;
      }
    } catch (e) {}
    return "product1";
  }

  function getExternalCheckoutUrl(pid) {
    var p = getProduct(pid);
    if (p && p.externalCheckoutUrl) return p.externalCheckoutUrl;
    var extMap = window.EXTERNAL_CHECKOUT_URLS || {};
    if (extMap[pid]) return extMap[pid];
    return DEFAULT_URLS[pid] || DEFAULT_URLS.product1;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("delivery-info-form");
    if (!form) return;

    var pid = resolveProductId();
    var p = getProduct(pid) || PRODUCTS.product1;

    /* Atualiza o resumo compacto do pedido para refletir o produto selecionado */
    var summaryImg = document.getElementById("dl-summary-img");
    var summaryName = document.getElementById("dl-summary-name");
    var summarySub = document.getElementById("dl-summary-sub");
    var summaryPrice = document.getElementById("dl-summary-price");
    var summaryTotal = document.getElementById("dl-summary-total");

    if (p) {
      if (summaryImg && p.images && p.images[0]) {
        var baseSrc = p.images[0].src || "";
        if (baseSrc.charAt(0) !== "/") baseSrc = "/" + baseSrc;
        summaryImg.src = baseSrc + "-600.webp";
        summaryImg.alt = p.images[0].alt;
      }
      if (summaryName) summaryName.textContent = p.name;
      if (summarySub) summarySub.textContent = p.subtitle;
      var priceStr = fmt(p.price);
      if (summaryPrice) {
        summaryPrice.setAttribute("data-price-for", p.id);
        summaryPrice.textContent = priceStr;
      }
      if (summaryTotal) {
        summaryTotal.setAttribute("data-price-for", p.id);
        summaryTotal.textContent = priceStr;
      }
    }

    var phoneInput = document.getElementById("dl-phone");
    var cepInput = document.getElementById("dl-cep");
    var submitBtn = document.getElementById("dl-submit-btn");
    var submitLabel = document.getElementById("dl-submit-label");
    var errorBanner = document.getElementById("dl-error-banner");

    if (phoneInput) {
      phoneInput.addEventListener("input", function () {
        phoneInput.value = maskPhone(phoneInput.value);
      });
    }
    if (cepInput) {
      cepInput.addEventListener("input", function () {
        cepInput.value = maskCEP(cepInput.value);
      });
    }

    function validateField(input) {
      var field = input.closest(".form-field");
      var val = (input.value || "").trim();
      var ok = true;
      if (input.hasAttribute("data-required")) {
        ok = val.length > 0;
        if (ok && input.type === "email") {
          ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        }
        if (ok && input.id === "dl-phone") {
          ok = onlyDigits(val).length >= 10;
        }
        if (ok && input.id === "dl-cep") {
          ok = onlyDigits(val).length === 8;
        }
      }
      if (field) field.classList.toggle("invalid", !ok);
      return ok;
    }

    form.addEventListener("input", function (e) {
      var f = e.target.closest(".form-field");
      if (f) f.classList.remove("invalid");
      if (errorBanner) errorBanner.hidden = true;
    });

    form.addEventListener("change", function (e) {
      var f = e.target.closest(".form-field");
      if (f) f.classList.remove("invalid");
      if (errorBanner) errorBanner.hidden = true;
    });

    var submitting = false;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submitting) return;
      if (errorBanner) errorBanner.hidden = true;

      var requiredInputs = [].slice.call(form.querySelectorAll("[data-required]"));
      var firstInvalid = null;

      requiredInputs.forEach(function (inp) {
        var ok = validateField(inp);
        if (!ok && !firstInvalid) firstInvalid = inp;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      submitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute("aria-busy", "true");
      }
      if (submitLabel) {
        submitLabel.textContent = "Continuando...";
      }

      try {
        var activePid = resolveProductId();
        var activeProd = getProduct(activePid) || p;
        var target = getExternalCheckoutUrl(activePid);
        if (!target || !/^https?:\/\//i.test(target)) {
          throw new Error("URL inválida");
        }

        try {
          if (window.HPTrack && typeof window.HPTrack.recordOrderSession === "function") {
            window.HPTrack.recordOrderSession({
              product_id: activeProd ? activeProd.id : activePid,
              product_sku: activeProd ? activeProd.sku : activePid,
              product_name: activeProd ? activeProd.name : "",
              value: activeProd ? Number(activeProd.price) : 29.90,
              currency: "BRL",
              customer: {
                name: (document.getElementById("dl-name") || {}).value || "",
                email: (document.getElementById("dl-email") || {}).value || "",
                phone: (document.getElementById("dl-phone") || {}).value || "",
                cep: (document.getElementById("dl-cep") || {}).value || "",
                state: (document.getElementById("dl-state") || {}).value || "",
                city: (document.getElementById("dl-city") || {}).value || "",
                street: (document.getElementById("dl-street") || {}).value || "",
                number: (document.getElementById("dl-number") || {}).value || "",
                complement: (document.getElementById("dl-complement") || {}).value || "",
                neighborhood: (document.getElementById("dl-neighborhood") || {}).value || ""
              }
            });
          }
        } catch (trackErr) {}

        setTimeout(function () {
          location.href = target;
        }, 150);
      } catch (err) {
        submitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute("aria-busy");
        }
        if (submitLabel) {
          submitLabel.textContent = "CONTINUAR PARA PAGAMENTO";
        }
        if (errorBanner) {
          errorBanner.hidden = false;
        }
      }
    });

    window.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      submitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute("aria-busy");
      }
      if (submitLabel) {
        submitLabel.textContent = "CONTINUAR PARA PAGAMENTO";
      }
    });
  });
})();
