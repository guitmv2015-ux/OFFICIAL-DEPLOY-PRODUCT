/* ==========================================================================
   HOLLOWPAW — faq.js
   Acordeões nativos <details> com suporte a abertura única ([data-single])
   e deep-linking via hash de URL (#faq-envio).
   ========================================================================== */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".accordion[data-single]").forEach(function (acc) {
      acc.addEventListener("toggle", function (e) {
        if (!e.target.open) return;
        acc.querySelectorAll("details[open]").forEach(function (d) { if (d !== e.target) d.open = false; });
      }, true);
    });
    if (location.hash) {
      var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el && el.tagName === "DETAILS") { el.open = true; setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 60); }
    }
  });
})();
