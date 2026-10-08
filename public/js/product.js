/* ==========================================================================
   HOLLOWPAW — product.js
   Galeria (swipe, indicadores, miniaturas, lightbox de zoom), barra fixa
   móvel de compra e evento ViewContent.
   ========================================================================== */
(function () {
  "use strict";
  var PRODUCTS = window.PRODUCTS || {};

  function getProduct(key) {
    if (typeof window.findProduct === "function") return window.findProduct(key);
    return PRODUCTS[key] || null;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.querySelector("[data-product-id]");
    if (!root) return;
    var productId = root.getAttribute("data-product-id");
    var product = getProduct(productId);

    initGallery();
    initStickyCta();
    if (window.HPTrack && product) window.HPTrack.viewContent(product.id);
  });

  /* ---------------- Galeria ---------------- */
  function initGallery() {
    var gallery = document.querySelector("[data-gallery]");
    if (!gallery) return;
    var track = gallery.querySelector(".gallery-track");
    var slides = [].slice.call(track.children);
    var dots = [].slice.call(document.querySelectorAll("[data-gallery-dot]"));
    var thumbs = [].slice.call(document.querySelectorAll("[data-gallery-thumb]"));
    var counter = gallery.querySelector("[data-gallery-counter]");
    var prev = gallery.querySelector(".gallery-arrow.prev");
    var next = gallery.querySelector(".gallery-arrow.next");
    var index = 0;

    function setActive(i) {
      index = i;
      dots.forEach(function (d, n) { d.setAttribute("aria-current", n === i ? "true" : "false"); });
      thumbs.forEach(function (t, n) { t.setAttribute("aria-current", n === i ? "true" : "false"); });
      if (counter) counter.textContent = (i + 1) + " / " + slides.length;
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
    }
    function goTo(i, smooth) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: smooth === false ? "auto" : "smooth" });
      setActive(i);
    }
    var raf = null;
    track.addEventListener("scroll", function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var i = Math.round(track.scrollLeft / track.clientWidth);
        if (i !== index && i >= 0 && i < slides.length) setActive(i);
      });
    }, { passive: true });
    dots.forEach(function (d, n) { d.addEventListener("click", function () { goTo(n); }); });
    thumbs.forEach(function (t, n) { t.addEventListener("click", function () { goTo(n); }); });
    prev && prev.addEventListener("click", function () { goTo(index - 1); });
    next && next.addEventListener("click", function () { goTo(index + 1); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
    });
    setActive(0);

    /* Lightbox */
    var lb = document.getElementById("lightbox");
    if (!lb || typeof lb.showModal !== "function") return;
    var lbImg = lb.querySelector("img");
    var lbStage = lb.querySelector(".lightbox-stage");
    var lbCount = lb.querySelector("[data-lb-count]");
    var lbIndex = 0;
    function show(i) {
      lbIndex = (i + slides.length) % slides.length;
      var img = slides[lbIndex].querySelector("img");
      lbImg.src = img.getAttribute("data-full") || img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbStage.classList.remove("zoomed");
      if (lbCount) lbCount.textContent = (lbIndex + 1) + " / " + slides.length;
    }
    slides.forEach(function (s, n) {
      var b = s.querySelector("button");
      b && b.addEventListener("click", function () { show(n); lb.showModal(); document.documentElement.style.overflow = "hidden"; });
    });
    lb.addEventListener("close", function () { document.documentElement.style.overflow = ""; goTo(lbIndex, false); });
    lb.querySelector("[data-lb-close]").addEventListener("click", function () { lb.close(); });
    lb.querySelector("[data-lb-prev]").addEventListener("click", function () { show(lbIndex - 1); });
    lb.querySelector("[data-lb-next]").addEventListener("click", function () { show(lbIndex + 1); });
    lbImg.addEventListener("click", function () { lbStage.classList.toggle("zoomed"); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") show(lbIndex + 1);
      if (e.key === "ArrowLeft") show(lbIndex - 1);
    });
    var sx = null;
    lbStage.addEventListener("touchstart", function (e) { if (e.touches.length === 1) sx = e.touches[0].clientX; }, { passive: true });
    lbStage.addEventListener("touchend", function (e) {
      if (sx === null || lbStage.classList.contains("zoomed")) { sx = null; return; }
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) show(lbIndex + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------------- Barra fixa móvel (Sticky CTA) ---------------- */
  function initStickyCta() {
    var bar = document.querySelector("[data-sticky-cta]");
    var mainBuy = document.getElementById("main-buy");
    if (!bar || !mainBuy || !("IntersectionObserver" in window)) return;
    var hiders = [].slice.call(document.querySelectorAll("[data-hide-sticky]"));
    var state = { main: true, hider: false };
    var visible = [];

    function update() {
      var navOpen = document.documentElement.classList.contains("nav-open");
      var show = !state.main && !state.hider && !navOpen;
      bar.classList.toggle("is-visible", show);
      bar.setAttribute("aria-hidden", show ? "false" : "true");
      if (show) bar.removeAttribute("inert"); else bar.setAttribute("inert", "");
    }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { state.main = en.isIntersecting; });
      update();
    }, { threshold: 0 }).observe(mainBuy);

    if (hiders.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var idx = visible.indexOf(en.target);
          if (en.isIntersecting) { if (idx === -1) visible.push(en.target); }
          else if (idx !== -1) { visible.splice(idx, 1); }
        });
        state.hider = visible.length > 0;
        update();
      }, { threshold: 0 });
      hiders.forEach(function (h) { io.observe(h); });
    }
    new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
})();
