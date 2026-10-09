/* ==========================================================================
   HOLLOWPAW — tracking.js
   Implementação centralizada e única de:
     1. Meta Pixel (ID: 1576880640332577) com prevenção de duplicidade
     2. Eventos Meta (PageView, ViewContent, Search, AddToCart, InitiateCheckout,
        AddPaymentInfo, Purchase) com eventID para deduplicação Browser + CAPI
     3. Captura e persistência de atribuição Meta (fbclid, _fbp, _fbc) e UTMs
        (utm_source, utm_campaign, utm_medium, utm_content, utm_term, xcod, sck)
     4. Verificação estrita e idempotente de Purchase via confirmação do backend.
   ========================================================================== */
(function () {
  "use strict";

  /* Evita execução duplicada caso o script seja incluído mais de uma vez */
  if (window._hpTrackingLoaded) return;
  window._hpTrackingLoaded = true;

  var cfg = window.TRACKING_CONFIG || {};
  var PRODUCTS = window.PRODUCTS || {};
  var debug = !!cfg.DEBUG;
  var endpoints = cfg.API_ENDPOINTS || {
    EVENT: "/api/tracking/event",
    ORDER_SESSION: "/api/orders/session",
    ORDER_STATUS: "/api/orders/status",
    ACK_PURCHASE: "/api/orders/ack-browser-purchase"
  };

  window.dataLayer = window.dataLayer || [];
  var memoryStore = {};

  function log() {
    if (debug && window.console) {
      console.log.apply(console, ["[HPTrack]"].concat([].slice.call(arguments)));
    }
  }

  function valid(id) {
    return typeof id === "string" && id.trim() !== "" && id.indexOf("PASTE") === -1;
  }

  function eventId(prefix) {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  /* --------------------------------------------------------------------------
     1. Cookies e Armazenamento de Atribuição (UTMs + fbclid + _fbp + _fbc)
     -------------------------------------------------------------------------- */
  var ATTR_STORAGE_KEY = "hp_ad_params";
  var TRACK_KEYS = [
    "utm_source",
    "utm_campaign",
    "utm_medium",
    "utm_content",
    "utm_term",
    "utm_id",
    "fbclid",
    "xcod",
    "sck",
    "src",
    "subid",
    "gclid",
    "gbraid",
    "wbraid",
    "ttclid",
    "msclkid"
  ];

  function getCookie(name) {
    try {
      var match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"));
      return match ? decodeURIComponent(match[1]) : "";
    } catch (e) {
      return "";
    }
  }

  function setCookie(name, value, maxAgeSeconds) {
    try {
      document.cookie = name + "=" + encodeURIComponent(value) + "; path=/; max-age=" + (maxAgeSeconds || 7776000) + "; SameSite=Lax";
    } catch (e) {}
  }

  function readStoredAttribution() {
    try {
      var raw = sessionStorage.getItem(ATTR_STORAGE_KEY) || localStorage.getItem(ATTR_STORAGE_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      if (data._exp && Date.now() > data._exp) {
        localStorage.removeItem(ATTR_STORAGE_KEY);
        return {};
      }
      delete data._exp;
      return data;
    } catch (e) {
      return {};
    }
  }

  function saveAttribution(data) {
    try {
      sessionStorage.setItem(ATTR_STORAGE_KEY, JSON.stringify(data));
      var withExp = Object.assign({ _exp: Date.now() + 30 * 86400000 }, data);
      localStorage.setItem(ATTR_STORAGE_KEY, JSON.stringify(withExp));
    } catch (e) {}
  }

  function captureAttribution() {
    var stored = readStoredAttribution();
    var merged = Object.assign({}, stored);
    var search = window.location.search || "";

    /* Preserva exatamente os valores de UTM da URL (incluindo pipes | do Meta Ads) */
    if (search.length > 1) {
      var params = new URLSearchParams(search);
      TRACK_KEYS.forEach(function (k) {
        var val = params.get(k);
        if (val !== null && val !== "") {
          merged[k] = val;
        }
      });
    }

    /* Constrói e preserva _fbc a partir de fbclid quando disponível */
    var fbcCookie = getCookie("_fbc");
    if (merged.fbclid && !fbcCookie) {
      fbcCookie = "fb.1." + Date.now() + "." + merged.fbclid;
      setCookie("_fbc", fbcCookie, 7776000);
    }
    if (fbcCookie) {
      merged._fbc = fbcCookie;
    }

    /* Preserva _fbp do cookie do Meta Pixel ou inicializa identificador compatível */
    var fbpCookie = getCookie("_fbp");
    if (!fbpCookie && !merged._fbp) {
      fbpCookie = "fb.1." + Date.now() + "." + Math.floor(1000000000 + Math.random() * 9000000000);
      setCookie("_fbp", fbpCookie, 7776000);
    }
    if (fbpCookie) {
      merged._fbp = fbpCookie;
    }

    /* Preserva _ttp do cookie do TikTok Pixel quando disponível */
    var ttpCookie = getCookie("_ttp");
    if (ttpCookie) {
      merged._ttp = ttpCookie;
    }

    if (!merged.landing_page) {
      merged.landing_page = window.location.href;
    }
    if (!merged.referrer && document.referrer) {
      merged.referrer = document.referrer;
    }

    saveAttribution(merged);
    return merged;
  }

  var currentAttribution = captureAttribution();

  function getAttribution() {
    var fbp = getCookie("_fbp");
    var fbc = getCookie("_fbc");
    var ttp = getCookie("_ttp");
    if (fbp) currentAttribution._fbp = fbp;
    if (fbc) currentAttribution._fbc = fbc;
    if (ttp) currentAttribution._ttp = ttp;
    saveAttribution(currentAttribution);
    return Object.assign({}, currentAttribution);
  }

  /* --------------------------------------------------------------------------
     2. Instalação Única do Meta Pixel (1576880640332577)
     -------------------------------------------------------------------------- */
  if (valid(cfg.GTM_ID) && !window._hpGtmInitialized) {
    window._hpGtmInitialized = true;
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    var g = document.createElement("script");
    g.async = true;
    g.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(cfg.GTM_ID);
    document.head.appendChild(g);
  }

  if (valid(cfg.GA4_ID) && !window._hpGa4Initialized) {
    window._hpGa4Initialized = true;
    var ga = document.createElement("script");
    ga.async = true;
    ga.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.GA4_ID);
    document.head.appendChild(ga);
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", cfg.GA4_ID);
  }

  if (valid(cfg.META_PIXEL_ID) && !window._hpMetaPixelInitialized) {
    window._hpMetaPixelInitialized = true;
    /* Meta Pixel Code oficial — executa init uma única vez por página */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("init", cfg.META_PIXEL_ID);
    log("Meta Pixel inicializado:", cfg.META_PIXEL_ID);
  }

  /* --------------------------------------------------------------------------
     2b. Vercel Web Analytics (@vercel/analytics) — fila global sem duplicação
     -------------------------------------------------------------------------- */
  if (!window.va) {
    window.va = function () {
      (window.vaq = window.vaq || []).push(arguments);
    };
  }
  if (!document.querySelector('script[src*="/_vercel/insights/script.js"]')) {
    var vaScript = document.createElement("script");
    vaScript.defer = true;
    vaScript.src = "/_vercel/insights/script.js";
    vaScript.setAttribute("data-sdkn", "@vercel/analytics");
    vaScript.setAttribute("data-sdkv", "2.0.1");
    document.head.appendChild(vaScript);
  }

  /* --------------------------------------------------------------------------
     2c. TikTok Pixel (DB477NJC77U2NTDCJ9JG) — sincronização sem duplicação
     -------------------------------------------------------------------------- */
  var tiktokPixelId = valid(cfg.TIKTOK_PIXEL_ID) ? cfg.TIKTOK_PIXEL_ID.trim() : "";
  var tiktokInitialPageFiredByHead = false;
  if (window.TiktokAnalyticsObject && window.ttq) {
    window._hpTiktokPixelInitialized = true;
    tiktokInitialPageFiredByHead = true;
    log("TikTok Pixel detectado no <head>:", tiktokPixelId || "DB477NJC77U2NTDCJ9JG");
  } else if (tiktokPixelId && !window._hpTiktokPixelInitialized) {
    window._hpTiktokPixelInitialized = true;
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = w[t] = w[t] || [];
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
      ttq.setAndDefer = function (t, e) {
        t[e] = function () {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) {
        for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
        return e;
      };
      ttq.load = function (e, n) {
        var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = r;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        n = document.createElement("script");
        n.type = "text/javascript";
        n.async = !0;
        n.src = r + "?sdkid=" + e + "&lib=" + t;
        e = document.getElementsByTagName("script")[0];
        e.parentNode.insertBefore(n, e);
      };
      ttq.load(tiktokPixelId);
      ttq.page();
      tiktokInitialPageFiredByHead = true;
    }(window, document, "ttq");
    log("TikTok Pixel inicializado via fallback:", tiktokPixelId);
  }

  /* --------------------------------------------------------------------------
     3. Helpers de Disparo (Browser Pixel + Backend CAPI / TikTok Events API)
     -------------------------------------------------------------------------- */
  var sentEventIds = {};

  function buildTikTokBrowserProps(eventName, data) {
    var d = data || {};
    if (eventName === "Search") {
      return { query: String(d.search_string || d.query || "").trim() };
    }
    var cid =
      d.content_id ||
      (Array.isArray(d.content_ids) && d.content_ids[0]) ||
      "HP-RIDER-01";
    var cname = d.content_name || "Fantasia de Halloween Divertida para Pets";
    var ccat = d.content_category || "Fantasia para Pets";
    var val = typeof d.value === "number" ? d.value : Number(d.value || 29.9);
    var qty = Math.max(1, parseInt(d.num_items || 1, 10) || 1);
    var unitPrice = Number((val / qty).toFixed(2));
    var props = {
      content_type: "product",
      content_id: String(cid),
      content_name: String(cname),
      content_category: String(ccat),
      contents: [
        {
          content_id: String(cid),
          content_type: "product",
          content_name: String(cname),
          content_category: String(ccat),
          quantity: qty,
          price: unitPrice
        }
      ],
      value: val,
      currency: d.currency || "BRL"
    };
    if (d.order_id) {
      props.order_id = String(d.order_id);
    }
    return props;
  }

  function ttTrack(eventName, data, evId) {
    if (!window.ttq || typeof window.ttq.track !== "function") return;
    if (eventName === "PageView" || eventName === "Pageview") return;
    try {
      var ttProps = buildTikTokBrowserProps(eventName, data);
      if (evId) {
        window.ttq.track(eventName, ttProps, { event_id: evId });
      } else {
        window.ttq.track(eventName, ttProps);
      }
    } catch (e) {}
  }

  function sendToTikTokBackend(eventName, data, evId) {
    if (eventName === "PageView" || eventName === "Pageview" || eventName === "Purchase") return;
    var ttEndpoint = endpoints.TIKTOK_EVENTS || "/api/tiktok/events";
    try {
      var payload = JSON.stringify({
        event: eventName,
        event_id: evId,
        event_time: Math.floor(Date.now() / 1000),
        url: window.location.href,
        properties: buildTikTokBrowserProps(eventName, data),
        custom_data: data || {},
        attribution: getAttribution(),
        user_agent: navigator.userAgent
      });
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(ttEndpoint, blob);
      } else if (window.fetch) {
        window.fetch(ttEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function sendToBackendCapi(eventName, data, evId) {
    try {
      var payload = JSON.stringify({
        event_name: eventName,
        event_id: evId,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: window.location.href,
        custom_data: data || {},
        attribution: getAttribution(),
        user_agent: navigator.userAgent,
        tiktok_handled: true
      });
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(endpoints.EVENT, blob);
      } else if (window.fetch) {
        window.fetch(endpoints.EVENT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function fbTrack(eventName, data, evId, syncCapi) {
    if (evId && sentEventIds[evId]) {
      log("Evento duplicado bloqueado na mesma sessão:", eventName, evId);
      return false;
    }
    if (evId) sentEventIds[evId] = true;

    try {
      if (window.fbq) {
        if (evId) {
          window.fbq("track", eventName, data || {}, { eventID: evId });
        } else {
          window.fbq("track", eventName, data || {});
        }
      }
    } catch (e) {}

    /* Dispara no TikTok Pixel do navegador com o MESMO event_id para deduplicação com a TikTok Events API */
    ttTrack(eventName, data, evId);

    window.dataLayer.push({
      event: "meta_" + eventName.toLowerCase(),
      event_name: eventName,
      event_id: evId,
      custom_data: data || {}
    });

    if (syncCapi !== false) {
      sendToTikTokBackend(eventName, data, evId);
      sendToBackendCapi(eventName, data, evId);
    }

    log(eventName, evId, data || {});
    return true;
  }

  function gtagEvent(name, data) {
    try {
      if (window.gtag && valid(cfg.GA4_ID)) window.gtag("event", name, data);
    } catch (e) {}
  }

  function item(p, qty) {
    return { item_id: p.sku || p.id, item_name: p.name, price: Number(p.price), quantity: qty || 1 };
  }

  function resolveProduct(productOrId) {
    if (!productOrId) return null;
    if (typeof productOrId === "object") return productOrId;
    if (typeof window.findProduct === "function") return window.findProduct(productOrId);
    return (window.PRODUCTS && window.PRODUCTS[productOrId]) || PRODUCTS[productOrId] || null;
  }

  /* --------------------------------------------------------------------------
     4. API Pública de Eventos (window.HPTrack)
     -------------------------------------------------------------------------- */
  var lastPageViewPath = null;
  var viewedProductsOnPage = {};
  var lastInitiateCheckoutTs = 0;
  var lastAddToCartTs = 0;

  var HPTrack = {
    getAttribution: getAttribution,

    /* Helper preparado para eventos customizados futuros no Vercel Web Analytics (track) */
    vercelEvent: function (eventName, properties) {
      if (!eventName || typeof window.va !== "function") return false;
      try {
        if (!properties || typeof properties !== "object") {
          window.va("event", { name: String(eventName).slice(0, 255) });
          return true;
        }
        var cleanProps = {};
        Object.keys(properties).forEach(function (k) {
          var v = properties[k];
          if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            cleanProps[String(k).slice(0, 255)] = typeof v === "string" ? v.slice(0, 255) : v;
          }
        });
        window.va("event", { name: String(eventName).slice(0, 255), data: cleanProps });
        return true;
      } catch (e) {
        return false;
      }
    },

    /* Helper preparado para eventos futuros do TikTok Pixel (ttq.track) */
    tiktokEvent: function (eventName, payload, options) {
      if (!eventName || !window.ttq || typeof window.ttq.track !== "function") return false;
      try {
        window.ttq.track(String(eventName), payload || {}, options || {});
        return true;
      } catch (e) {
        return false;
      }
    },

    /* 2. PAGEVIEW — 1x por rota/navegação */
    pageView: function (customPath) {
      var currentPath = customPath || (window.location.pathname + window.location.search);
      if (lastPageViewPath === currentPath) {
        log("PageView duplicado ignorado para:", currentPath);
        return false;
      }
      var isInitialLoad = lastPageViewPath === null;
      lastPageViewPath = currentPath;
      if (!isInitialLoad && window.ttq && typeof window.ttq.page === "function") {
        try {
          window.ttq.page();
        } catch (e) {}
      }
      var id = eventId("pv");
      return fbTrack("PageView", {}, id, true);
    },

    /* 3a. VIEWCONTENT — somente na abertura de página individual de produto */
    viewContent: function (productId) {
      var p = resolveProduct(productId);
      if (!p) return false;
      var key = p.id || productId;
      if (viewedProductsOnPage[key]) {
        log("ViewContent duplicado ignorado para:", key);
        return false;
      }
      viewedProductsOnPage[key] = true;

      var cur = p.currency || "BRL";
      var val = Number(p.price);
      var cid = (p.tracking && p.tracking.contentId) || p.sku || p.id;
      var ccat = p.category || "Fantasia para Pets";
      var id = eventId("vc_" + key);

      var payload = {
        content_ids: [cid],
        content_id: cid,
        content_type: "product",
        content_name: p.name,
        content_category: ccat,
        contents: [{ id: cid, quantity: 1, item_price: val }],
        value: val,
        currency: cur
      };
      gtagEvent("view_item", { currency: cur, value: val, items: [item(p, 1)] });
      return fbTrack("ViewContent", payload, id, true);
    },

    /* 3b. SEARCH — somente quando o usuário realiza uma busca real */
    search: function (searchTerm) {
      var term = typeof searchTerm === "string" ? searchTerm.trim() : "";
      if (!term) return false;
      var id = eventId("sr");
      var payload = {
        search_string: term
      };
      gtagEvent("search", { search_term: term });
      return fbTrack("Search", payload, id, true);
    },

    /* 3c. ADDTOCART — somente quando um produto é realmente adicionado ao carrinho */
    addToCart: function (productId, quantity) {
      var now = Date.now();
      if (now - lastAddToCartTs < 500) return false;
      var p = resolveProduct(productId);
      if (!p) return false;
      lastAddToCartTs = now;

      var qty = Math.max(1, parseInt(quantity, 10) || 1);
      var unitPrice = Number(p.price);
      var itemTotal = Number((unitPrice * qty).toFixed(2));
      var cur = p.currency || "BRL";
      var cid = (p.tracking && p.tracking.contentId) || p.sku || p.id;
      var ccat = p.category || "Fantasia para Pets";
      var id = eventId("atc_" + (p.id || productId));

      var payload = {
        content_ids: [cid],
        content_id: cid,
        content_type: "product",
        content_name: p.name,
        content_category: ccat,
        contents: [{ id: cid, quantity: qty, item_price: unitPrice }],
        num_items: qty,
        value: itemTotal,
        currency: cur
      };
      gtagEvent("add_to_cart", { currency: cur, value: itemTotal, items: [item(p, qty)] });
      return fbTrack("AddToCart", payload, id, true);
    },

    /* 3d. INITIATECHECKOUT — somente quando o usuário inicia o processo de checkout */
    initiateCheckout: function (productId, quantity) {
      var now = Date.now();
      if (now - lastInitiateCheckoutTs < 1000) {
        log("InitiateCheckout duplicado por clique duplo bloqueado.");
        return false;
      }
      var p = resolveProduct(productId);
      if (!p) return false;
      lastInitiateCheckoutTs = now;
      try {
        sessionStorage.setItem("hp_last_ic_ts", String(now));
      } catch (e) {}

      var qty = Math.max(1, parseInt(quantity, 10) || 1);
      var unitPrice = Number(p.price);
      var cartTotal = Number((unitPrice * qty).toFixed(2));
      var cur = p.currency || "BRL";
      var cid = (p.tracking && p.tracking.contentId) || p.sku || p.id;
      var ccat = p.category || "Fantasia para Pets";
      var id = eventId("ic_" + (p.id || productId));

      var payload = {
        content_ids: [cid],
        content_id: cid,
        contents: [{ id: cid, quantity: qty, item_price: unitPrice }],
        content_name: p.name,
        content_category: ccat,
        content_type: "product",
        num_items: qty,
        value: cartTotal,
        currency: cur
      };
      gtagEvent("begin_checkout", { currency: cur, value: cartTotal, items: [item(p, qty)] });
      return fbTrack("InitiateCheckout", payload, id, true);
    },

    /* 3e. ADDPAYMENTINFO — somente se houver etapa real de pagamento */
    addPaymentInfo: function (productId, quantity) {
      var p = resolveProduct(productId);
      if (!p) return false;
      var qty = Math.max(1, parseInt(quantity, 10) || 1);
      var unitPrice = Number(p.price);
      var cartTotal = Number((unitPrice * qty).toFixed(2));
      var cur = p.currency || "BRL";
      var cid = (p.tracking && p.tracking.contentId) || p.sku || p.id;
      var ccat = p.category || "Fantasia para Pets";
      var id = eventId("api_" + (p.id || productId));

      var payload = {
        content_ids: [cid],
        content_id: cid,
        content_name: p.name,
        content_category: ccat,
        contents: [{ id: cid, quantity: qty, item_price: unitPrice }],
        content_type: "product",
        value: cartTotal,
        currency: cur
      };
      return fbTrack("AddPaymentInfo", payload, id, true);
    },

    /* Registra sessão de pedido/entrega no backend e dispara PlaceAnOrder com event_id deduplicado */
    recordOrderSession: function (sessionData) {
      try {
        var sd = sessionData || {};
        var pid = sd.product_id || "product1";
        var p = resolveProduct(pid) || resolveProduct("product1");
        var evId = eventId("pao_" + pid);
        var sku = sd.product_sku || (p && p.sku) || "HP-RIDER-01";
        var name = sd.product_name || (p && p.name) || "Fantasia de Halloween Divertida para Pets";
        var ccat = (p && p.category) || "Fantasia para Pets";
        var val = Number(sd.value || (p && p.price) || 29.9);

        ttTrack(
          "PlaceAnOrder",
          {
            content_ids: [sku],
            content_id: sku,
            content_type: "product",
            content_name: name,
            content_category: ccat,
            value: val,
            currency: "BRL",
            num_items: 1
          },
          evId
        );

        var payload = JSON.stringify(Object.assign({}, sd, {
          event_id: evId,
          attribution: getAttribution(),
          event_source_url: window.location.href
        }));
        if (navigator.sendBeacon) {
          var blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon(endpoints.ORDER_SESSION, blob);
        } else if (window.fetch) {
          window.fetch(endpoints.ORDER_SESSION, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true
          }).catch(function () {});
        }
      } catch (e) {}
    },

    /* 4, 5 & 7. PURCHASE — idempotente com eventID estável ("purchase_" + orderId).
       NUNCA chamar sem confirmação de pagamento aprovado! */
    _emitConfirmedPurchase: function (orderId, value, productId, canonicalEventId) {
      if (!orderId) return false;
      var storageKey = "hp_purchase_" + orderId;
      try {
        if (memoryStore[storageKey] || localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey)) {
          log("Purchase idempotente: já disparado para o pedido", orderId);
          return false;
        }
      } catch (e) {
        if (memoryStore[storageKey]) return false;
      }

      var p = resolveProduct(productId) || resolveProduct("product1");
      var val = Number(value) || (p ? Number(p.price) : 29.90);
      var cur = (p && p.currency) || "BRL";
      var cid = p ? ((p.tracking && p.tracking.contentId) || p.sku || p.id) : String(productId || "HP-RIDER-01");
      var ccat = (p && p.category) || "Fantasia para Pets";
      var dedupEventId = canonicalEventId || ("purchase_" + orderId);

      memoryStore[storageKey] = dedupEventId;
      try {
        localStorage.setItem(storageKey, dedupEventId);
        sessionStorage.setItem(storageKey, dedupEventId);
      } catch (e) {}

      var payload = {
        value: val,
        currency: cur,
        content_ids: [cid],
        content_id: cid,
        contents: [{ id: cid, quantity: 1, item_price: val }],
        content_type: "product",
        content_name: p ? p.name : "Produto Hollowpaw",
        content_category: ccat,
        num_items: 1,
        order_id: orderId
      };

      /* syncCapi = false porque o backend/webhook já envia o Purchase via CAPI e TikTok Events API com o mesmo event_id */
      var ok = fbTrack("Purchase", payload, dedupEventId, false);
      gtagEvent("purchase", { transaction_id: orderId, currency: cur, value: val, items: p ? [item(p, 1)] : [] });
      return ok;
    }
  };

  window.HPTrack = HPTrack;

  /* Dispara PageView inicial exatamente uma vez por carregamento de página */
  HPTrack.pageView();

  /* --------------------------------------------------------------------------
     5. Listeners Globais para Busca Real ([data-search-form]), AddToCart
        ([data-add-to-cart]), ViewContent, InitiateCheckout Direto e
        Verificação Estrita de Purchase no Backend
     -------------------------------------------------------------------------- */
  function initDomTracking() {
    var prodRoot = document.querySelector("[data-product-id]");
    if (prodRoot) {
      var pageProdId = prodRoot.getAttribute("data-product-id");
      if (pageProdId) HPTrack.viewContent(pageProdId);
    }

    var deliveryForm = document.getElementById("delivery-info-form");
    if (deliveryForm) {
      var recentIc = 0;
      try {
        recentIc = parseInt(sessionStorage.getItem("hp_last_ic_ts") || "0", 10) || 0;
      } catch (e) {}
      if (Date.now() - recentIc > 15000) {
        var qParams = new URLSearchParams(window.location.search);
        var dlPid = qParams.get("produto") || qParams.get("product") || "product1";
        HPTrack.initiateCheckout(dlPid, 1);
      }
    }

    document.addEventListener("submit", function (e) {
      var searchForm = e.target && e.target.closest ? e.target.closest("[data-search-form]") : null;
      if (!searchForm) return;
      var input = searchForm.querySelector('input[type="search"], input[name="q"], input[name="search"], [data-search-input]');
      if (input && input.value && input.value.trim()) {
        HPTrack.search(input.value.trim());
      }
    });

    document.addEventListener("click", function (e) {
      var atcBtn = e.target && e.target.closest ? e.target.closest("[data-add-to-cart]") : null;
      if (!atcBtn) return;
      var pid = atcBtn.getAttribute("data-add-to-cart");
      var qty = atcBtn.getAttribute("data-quantity") || 1;
      if (pid) HPTrack.addToCart(pid, qty);
    });

    /* Confirmação de Purchase na página de obrigado SOMENTE se o backend
       confirmar que o pedido está efetivamente PAGO/APROVADO */
    if (document.body && document.body.getAttribute("data-page") === "thank-you") {
      var pc = cfg.PURCHASE_CONFIRMATION || {};
      if (!pc.ENABLED) return;

      var params = new URLSearchParams(window.location.search);
      var orderId = null;
      (pc.ORDER_ID_PARAMS || ["pedido", "order_id", "orderId", "order", "transaction_id"]).some(function (k) {
        var v = params.get(k);
        if (v && v.trim()) {
          orderId = v.trim();
          return true;
        }
        return false;
      });

      if (!orderId) {
        log("Página thank-you acessada sem order_id — Purchase NÃO disparado.");
        return;
      }

      var storageKey = "hp_purchase_" + orderId;
      try {
        if (localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey)) {
          log("Purchase já registrado anteriormente para o pedido", orderId, "— ignorando refresh.");
          return;
        }
      } catch (e) {}

      if (!window.fetch) return;

      /* Consulta o backend para confirmar se o pagamento foi realmente aprovado via webhook */
      window.fetch(endpoints.ORDER_STATUS + "?order_id=" + encodeURIComponent(orderId), {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store"
      })
        .then(function (resp) {
          if (!resp.ok) return null;
          return resp.json();
        })
        .then(function (data) {
          if (!data || data.paid !== true) {
            log("Pedido não confirmado como pago pelo backend — Purchase bloqueado:", orderId, data);
            return;
          }
          if (data.browser_purchase_fired === true) {
            log("Backend informou que o navegador já disparou Purchase para:", orderId);
            try {
              localStorage.setItem(storageKey, data.event_id || ("purchase_" + orderId));
            } catch (e) {}
            return;
          }

          var fired = HPTrack._emitConfirmedPurchase(
            orderId,
            data.value || params.get(pc.VALUE_PARAM || "valor"),
            data.product_id || params.get(pc.PRODUCT_PARAM || "produto"),
            data.event_id || ("purchase_" + orderId)
          );

          if (fired) {
            window.fetch(endpoints.ACK_PURCHASE, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: orderId,
                event_id: data.event_id || ("purchase_" + orderId)
              }),
              keepalive: true
            }).catch(function () {});
          }
        })
        .catch(function () {
          log("Não foi possível verificar o status do pagamento no backend — Purchase não disparado por segurança.");
        });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDomTracking);
  } else {
    initDomTracking();
  }
})();
