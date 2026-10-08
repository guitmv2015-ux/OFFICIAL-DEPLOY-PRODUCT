/* ==========================================================================
   HOLLOWPAW — main.js
   Menu móvel, preservação de parâmetros UTM em URLs limpas, preços
   centralizados em BRL, estimativa de entrega e redirecionamento de compra.
   ========================================================================== */
(function () {
  "use strict";
  var PRODUCTS = window.PRODUCTS || {};
  var STORE = window.STORE || {};
  var SETTINGS = window.CHECKOUT_SETTINGS || {};
  var brlFormatter = window.BRL_FORMATTER || new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  var fmt = window.formatPrice || function (v) {
    return brlFormatter.format(Number(v)).replace(/\u00a0/g, " ");
  };

  function getProduct(key) {
    if (typeof window.findProduct === "function") return window.findProduct(key);
    return PRODUCTS[key] || null;
  }

  window.HP = window.HP || {};

  /* ---------------------------------------------------------------------
     1. Preservação de parâmetros de anúncio (UTM + IDs de clique)
     --------------------------------------------------------------------- */
  var TRACK_KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id",
    "fbclid", "xcod", "sck", "src", "subid", "gclid", "gbraid", "wbraid", "ttclid", "msclkid"
  ];
  var STORAGE_KEY = "hp_ad_params";

  function readStoredParams() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      if (data._exp && Date.now() > data._exp) {
        localStorage.removeItem(STORAGE_KEY);
        return {};
      }
      delete data._exp;
      return data;
    } catch (e) {
      return {};
    }
  }

  function captureParams() {
    var stored = readStoredParams();
    var url = new URLSearchParams(location.search);
    var found = {};
    TRACK_KEYS.forEach(function (k) {
      var v = url.get(k);
      if (v) found[k] = v;
    });
    var merged = Object.assign({}, stored, found);
    if (Object.keys(merged).length) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        var withExp = Object.assign({ _exp: Date.now() + 30 * 864e5 }, merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(withExp));
      } catch (e) {}
    }
    return merged;
  }
  var adParams = captureParams();
  window.HP.adParams = adParams;

  function appendParams(href, params) {
    try {
      var u = new URL(href, location.href);
      TRACK_KEYS.forEach(function (k) {
        if (params[k] && !u.searchParams.has(k)) u.searchParams.set(k, params[k]);
      });
      return u.toString();
    } catch (e) {
      return href;
    }
  }

  /* Preserva parâmetros na navegação interna (suporta URLs limpas /produto/... e .html) */
  function decorateInternalLinks() {
    var hasTrackKeys = TRACK_KEYS.some(function (k) { return !!adParams[k]; });
    if (!hasTrackKeys) return;
    document.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      try {
        var u = new URL(href, location.href);
        if (u.origin !== location.origin) return;
        if (/\.(webp|png|jpg|jpeg|svg|gif|ico|css|js|woff2?|ttf|xml|txt|json)$/i.test(u.pathname)) return;
        TRACK_KEYS.forEach(function (k) {
          if (adParams[k] && !u.searchParams.has(k)) u.searchParams.set(k, adParams[k]);
        });
        a.setAttribute("href", u.pathname + u.search + u.hash);
      } catch (e) {}
    });
  }

  /* ---------------------------------------------------------------------
     2. Preços centralizados em BRL (R$ 29,90)
     --------------------------------------------------------------------- */
  function hydratePrices() {
    document.querySelectorAll("[data-price-for]").forEach(function (el) {
      var p = getProduct(el.getAttribute("data-price-for"));
      if (p) el.textContent = fmt(p.price);
    });
    var ld = document.getElementById("product-jsonld");
    if (ld) {
      try {
        var data = JSON.parse(ld.textContent);
        var p = getProduct(ld.getAttribute("data-product"));
        if (p && data.offers) {
          data.offers.price = Number(p.price).toFixed(2);
          data.offers.priceCurrency = "BRL";
          ld.textContent = JSON.stringify(data);
        }
      } catch (e) {}
    }
  }

  /* ---------------------------------------------------------------------
     3. Estimativa de entrega (dias úteis, formato pt-BR)
     --------------------------------------------------------------------- */
  function addBusinessDays(date, days) {
    var d = new Date(date.getTime()), added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      var w = d.getDay();
      if (w !== 0 && w !== 6) added++;
    }
    return d;
  }
  function fmtDate(d) {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(/\./g, "");
  }
  function hydrateDelivery() {
    var els = document.querySelectorAll("[data-delivery-estimate]");
    if (!els.length) return;
    var now = new Date();
    var min = (STORE.processingDaysMin || 1) + (STORE.shippingDaysBRMin || 5);
    var max = (STORE.processingDaysMax || 3) + (STORE.shippingDaysBRMax || 12);
    var text = fmtDate(addBusinessDays(now, min)) + " a " + fmtDate(addBusinessDays(now, max));
    els.forEach(function (el) { el.textContent = text; });
  }

  /* ---------------------------------------------------------------------
     4. Menu de navegação móvel (acessível)
     --------------------------------------------------------------------- */
  function initDrawer() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var drawer = document.getElementById("site-drawer");
    if (!toggle || !drawer) return;
    var overlay = document.querySelector("[data-drawer-overlay]");
    var closeBtn = drawer.querySelector("[data-menu-close]");
    var lastFocus = null;

    function focusables() { return drawer.querySelectorAll("a[href], button:not([disabled])"); }
    function open() {
      lastFocus = document.activeElement;
      document.documentElement.classList.add("nav-open");
      drawer.removeAttribute("inert");
      drawer.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      setTimeout(function () { closeBtn && closeBtn.focus(); }, 50);
    }
    function close() {
      document.documentElement.classList.remove("nav-open");
      drawer.setAttribute("inert", "");
      drawer.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      if (lastFocus) lastFocus.focus();
    }
    toggle.addEventListener("click", open);
    closeBtn && closeBtn.addEventListener("click", close);
    overlay && overlay.addEventListener("click", close);
    drawer.addEventListener("click", function (e) { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", function (e) {
      if (!document.documentElement.classList.contains("nav-open")) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "Tab") {
        var f = focusables();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------------------------------------------------------------------
     5. Redirecionamento de Compra
        • Todos os produtos -> /pages/informacoes-entrega.html?produto=<id>
     --------------------------------------------------------------------- */
  function buildCheckoutUrl(productId) {
    var p = getProduct(productId) || PRODUCTS.product1;
    var pid = p ? p.id : "product1";
    var url = "/pages/informacoes-entrega.html?produto=" + encodeURIComponent(pid);
    if (SETTINGS.FORWARD_PARAMS !== false && Object.keys(adParams).length) {
      url = appendParams(url, adParams);
    }
    return url;
  }
  window.HP.buildCheckoutUrl = buildCheckoutUrl;

  function toast(msg) {
    var t = document.getElementById("hp-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "hp-toast";
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      t.style.cssText = "position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:120;max-width:92vw;" +
        "background:#1f1a24;color:#fff;padding:12px 16px;border-radius:12px;font-size:14px;font-weight:600;" +
        "box-shadow:0 10px 30px rgba(0,0,0,.25);text-align:center;transition:opacity .2s";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.style.opacity = "0"; }, 3600);
  }
  window.HP.toast = toast;

  var redirecting = false;
  function onBuy(e) {
    var btn = e.target.closest("[data-buy]");
    if (!btn) return;
    e.preventDefault();
    if (redirecting) return;
    var rawId = btn.getAttribute("data-buy");
    var p = getProduct(rawId);
    if (!p) return;
    var productId = p.id;

    try {
      sessionStorage.setItem("hp_selected_product", productId);
    } catch (err) {}

    var url = buildCheckoutUrl(productId);
    if (!url) {
      toast("Não foi possível iniciar o pedido. Envie um e-mail para " + (STORE.supportEmail || "nosso suporte") + ".");
      return;
    }

    redirecting = true;
    btn.setAttribute("aria-busy", "true");
    var label = btn.querySelector("[data-btn-label]");
    if (label) label.textContent = "Continuando…";
    if (window.HPTrack) window.HPTrack.initiateCheckout(productId);

    setTimeout(function () {
      if (SETTINGS.OPEN_IN_NEW_TAB) {
        window.open(url, "_blank", "noopener");
        redirecting = false;
        if (label) label.textContent = "Comprar agora";
        btn.removeAttribute("aria-busy");
      } else {
        location.href = url;
      }
    }, 180);
  }

  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    redirecting = false;
    document.querySelectorAll("[data-buy][aria-busy]").forEach(function (b) {
      b.removeAttribute("aria-busy");
      var l = b.querySelector("[data-btn-label]");
      if (l) l.textContent = l.getAttribute("data-default") || "Comprar agora";
    });
  });

  /* ---------------------------------------------------------------------
     6. Formulário de Contato (validação em Português Brasileiro)
     --------------------------------------------------------------------- */
  function initContactForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;
    var status = form.querySelector("[data-form-status]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll("[data-required]").forEach(function (input) {
        var field = input.closest(".form-field");
        var val = (input.value || "").trim();
        var isEmail = input.type === "email";
        var ok = val.length > 0 && (!isEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val));
        if (field) field.classList.toggle("invalid", !ok);
        if (!ok && valid) { input.focus(); valid = false; }
      });
      if (!valid) return;
      if (status) {
        status.textContent = "Mensagem enviada com sucesso! Nossa equipe responderá em até 1 dia útil.";
        status.hidden = false;
      }
      form.reset();
    });
    form.addEventListener("input", function (e) {
      var field = e.target.closest(".form-field");
      if (field) field.classList.remove("invalid");
    });
  }

  /* ---------------------------------------------------------------------
     Inicialização
     --------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    hydratePrices();
    hydrateDelivery();
    initDrawer();
    decorateInternalLinks();
    initContactForm();
    document.addEventListener("click", onBuy);
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    document.querySelectorAll("[data-support-email]").forEach(function (el) {
      if (STORE.supportEmail) {
        el.textContent = STORE.supportEmail;
        if (el.tagName === "A") el.href = "mailto:" + STORE.supportEmail;
      }
    });
  });
})();
