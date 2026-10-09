/**
 * HOLLOWPAW — Gerador Estático Zero-Dependência para Vercel (scripts/build.js)
 * ============================================================================
 * Lê:
 *   - public/config/products.js  (Fonte única da verdade dos produtos)
 *   - public/config/store.js     (Configurações da loja)
 *   - src/content/institutional.js
 *
 * Gera automaticamente:
 *   - public/index.html
 *   - public/produto/<slug>/index.html (e public/produto/<slug>.html)
 *   - public/products/<legacySlug>.html (compatibilidade reversa)
 *   - public/<cleanPath>/index.html e public/pages/<slug>.html
 *   - public/404.html
 *   - public/sitemap.xml
 *   - public/robots.txt
 *
 * Execução: `npm run build` ou `node scripts/build.js`
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const { PRODUCTS } = require(path.join(PUBLIC_DIR, "config", "products.js"));
const { STORE } = require(path.join(PUBLIC_DIR, "config", "store.js"));
const C = require(path.join(ROOT_DIR, "src", "content", "institutional.js"));
let vaPkg = { name: "@vercel/analytics", version: "2.0.1" };
try {
  vaPkg = require("@vercel/analytics/package.json");
} catch (_) {}
let siPkg = { name: "@vercel/speed-insights", version: "2.0.0" };
try {
  siPkg = require("@vercel/speed-insights/package.json");
} catch (_) {}

const SITE = (process.env.SITE_URL || STORE.siteUrl || "https://www.hollowpaw.com.br").replace(/\/+$/, "");
const BRAND = STORE.brandName || "Hollowpaw";
const PRODUCT_KEYS = Object.keys(PRODUCTS);

const now = new Date();
const TODAY_ISO = now.toISOString().slice(0, 10);
const ASSET_V = TODAY_ISO.replace(/-/g, "");
const CURRENT_YEAR = now.getFullYear();

const PT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function e(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTags(str) {
  return String(str ?? "").replace(/<[^>]+>/g, "");
}

function money(val) {
  return "R$ " + Number(val).toFixed(2).replace(".", ",");
}

/**
 * Lê a largura real de um arquivo .webp sem depender de bibliotecas externas.
 */
function getWebpWidth(relPath, fallback = 800) {
  try {
    const cleanRel = relPath.replace(/^\/+/, "");
    const fullPath = path.join(PUBLIC_DIR, cleanRel);
    if (!fs.existsSync(fullPath)) return fallback;
    const buf = fs.readFileSync(fullPath);
    if (buf.length < 30) return fallback;
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 " && buf.length >= 30) {
      return buf.readUInt16LE(26) & 0x3fff;
    }
    if (chunk === "VP8L" && buf.length >= 25) {
      const b0 = buf[21];
      const b1 = buf[22];
      return 1 + (((b1 & 0x3f) << 8) | b0);
    }
    if (chunk === "VP8X" && buf.length >= 30) {
      return 1 + buf.readUIntLE(24, 3);
    }
    return fallback;
  } catch (_) {
    return fallback;
  }
}

function addBusinessDays(startDate, days) {
  const d = new Date(startDate.getTime());
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) added++;
  }
  return d;
}

function deliveryFallback() {
  const minDays = (STORE.processingDaysMin || 1) + (STORE.shippingDaysBRMin || 5);
  const maxDays = (STORE.processingDaysMax || 3) + (STORE.shippingDaysBRMax || 12);
  const a = addBusinessDays(now, minDays);
  const b = addBusinessDays(now, maxDays);
  const fmt = (d) => `${String(d.getDate()).padStart(2, "0")} de ${PT_MONTHS[d.getMonth()]}`;
  return `${fmt(a)} a ${fmt(b)}`;
}

const ICONS = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  "chev-down": '<path d="m6 9 6 6 6-6"/>',
  "chev-right": '<path d="m9 18 6-6-6-6"/>',
  "chev-left": '<path d="m15 18-6-6 6-6"/>',
  "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  return: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  refresh: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  "check-circle": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
  sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.7 4.73a2 2 0 0 0 2 0L20.7 7"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
  zoom: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
  calendar: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 13h4M10 17h4"/>'
};

function sprite() {
  const syms = Object.entries(ICONS)
    .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${syms}</svg>`;
}

function icon(name, cls = "icon") {
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}

const LOGO_MARK =
  '<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
  '<defs><mask id="{mid}"><rect width="64" height="64" fill="#fff"/><circle cx="40" cy="24" r="14" fill="#000"/></mask></defs>' +
  '<rect width="64" height="64" rx="14" fill="#1F1A24"/>' +
  '<circle cx="30" cy="31" r="17" fill="#E0702A" mask="url(#{mid})"/>' +
  '<g fill="#FAF5ED"><ellipse cx="43.5" cy="46.5" rx="5.2" ry="4.4"/>' +
  '<circle cx="37.6" cy="40.6" r="2.1"/><circle cx="41.4" cy="37.4" r="2.1"/>' +
  '<circle cx="46" cy="37.6" r="2.1"/><circle cx="49.6" cy="41" r="2.1"/></g></svg>';

function logo(mid = "lm1") {
  return `<a class="logo" href="/" aria-label="${BRAND} — Página inicial">${LOGO_MARK.replace(/\{mid\}/g, mid)}<span class="logo-word">${BRAND}</span></a>`;
}

const NAV = [
  ["Comprar", "/#shop", "shop"],
  ["Sobre nós", "/sobre", "about"],
  ["Perguntas frequentes", "/faq", "faq"],
  ["Contato", "/contato", "contact"],
  ["Políticas", "/politicas", "policies"]
];

function normAsset(src) {
  return src.startsWith("/") ? src : "/" + src;
}

function productUrl(p) {
  return p.url || `/produto/${p.slug}`;
}

function productImg(p, i = 0, small = true) {
  const idx = Math.min(i, p.images.length - 1);
  const base = normAsset(p.images[idx].src);
  return `${base}${small ? "-600" : ""}.webp`;
}

function header(active) {
  const firstProduct = PRODUCTS[PRODUCT_KEYS[0]];
  const links = NAV.map(
    ([label, href, key]) =>
      `<li><a href="${href}"${key === active ? ' aria-current="page"' : ""}>${label}</a></li>`
  ).join("");

  const prodLinks = PRODUCT_KEYS.map((k) => {
    const p = PRODUCTS[k];
    return (
      `<li><a href="${productUrl(p)}">` +
      `<img src="${productImg(p)}" alt="" width="44" height="44" loading="lazy">` +
      `<span>${e(p.name)}<small data-price-for="${k}">${money(p.price)}</small></span></a></li>`
    );
  }).join("");

  return `
<a class="skip-link" href="#main">Pular para o conteúdo</a>
<div class="announce"><strong>${money(firstProduct.price)}</strong> · Compra segura · Frete grátis para <strong>todo o Brasil</strong> · Garantia de ${STORE.returnWindowDays} dias</div>
<header class="site-header">
  <div class="container header-inner">
    ${logo("lm-h")}
    <nav class="primary-nav" aria-label="Navegação principal"><ul>${links}</ul></nav>
    <button class="menu-toggle" type="button" data-menu-toggle aria-controls="site-drawer" aria-expanded="false">
      <span>Menu</span>${icon("menu")}
    </button>
  </div>
</header>
<div class="drawer-overlay" data-drawer-overlay></div>
<div class="drawer" id="site-drawer" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true" inert>
  <div class="drawer-head">
    ${logo("lm-d")}
    <button class="drawer-close" type="button" data-menu-close aria-label="Fechar menu">${icon("x")}</button>
  </div>
  <nav class="drawer-nav" aria-label="Menu móvel">
    <p class="drawer-label">Produtos</p>
    <ul class="drawer-products">${prodLinks}</ul>
    <p class="drawer-label">Hollowpaw</p>
    <ul>
      <li><a href="/#shop">Todas as fantasias ${icon("chev-right")}</a></li>
      <li><a href="/sobre">Sobre nós ${icon("chev-right")}</a></li>
      <li><a href="/faq">Perguntas frequentes ${icon("chev-right")}</a></li>
      <li><a href="/contato">Contato ${icon("chev-right")}</a></li>
    </ul>
    <p class="drawer-label">Políticas</p>
    <ul class="sub">
      <li><a href="/envio">Política de envio ${icon("chev-right")}</a></li>
      <li><a href="/devolucoes">Devoluções e reembolsos ${icon("chev-right")}</a></li>
      <li><a href="/privacidade">Política de privacidade ${icon("chev-right")}</a></li>
      <li><a href="/termos">Termos de uso ${icon("chev-right")}</a></li>
    </ul>
  </nav>
  <div class="drawer-foot">Dúvidas? E-mail: <a href="mailto:${STORE.supportEmail}">${STORE.supportEmail}</a></div>
</div>`;
}

function footer() {
  const firstProduct = PRODUCTS[PRODUCT_KEYS[0]];
  const shop = PRODUCT_KEYS.map(
    (k) => `<li><a href="${productUrl(PRODUCTS[k])}">${e(PRODUCTS[k].name)}</a></li>`
  ).join("");

  return `
<footer class="site-footer">
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        ${logo("lm-f")}
        <p>Fantasias de Halloween para gatos e cães pequenos. Seleção especial, informações claras e preço único de ${money(firstProduct.price)}.</p>
        <p class="footer-contact">Atendimento ao cliente: <a href="mailto:${STORE.supportEmail}">${STORE.supportEmail}</a><br>${e(STORE.supportHours)}</p>
      </div>
      <div class="footer-cols">
        <div class="footer-col"><h3>Produtos</h3><ul>${shop}<li><a href="/#shop">Todas as fantasias</a></li></ul></div>
        <div class="footer-col"><h3>Atendimento ao cliente</h3><ul>
          <li><a href="/faq">Perguntas frequentes</a></li>
          <li><a href="/contato">Contato</a></li>
          <li><a href="/envio">Envio e entrega</a></li>
          <li><a href="/devolucoes">Devoluções e reembolsos</a></li></ul></div>
        <div class="footer-col"><h3>Institucional</h3><ul>
          <li><a href="/sobre">Sobre nós</a></li>
          <li><a href="/privacidade">Política de privacidade</a></li>
          <li><a href="/termos">Termos de uso</a></li>
          <li><a href="/politicas">Todas as políticas</a></li></ul></div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; <span data-year>${CURRENT_YEAR}</span> ${e(STORE.legalName)}. Todos os direitos reservados.</span>
      <span>Todos os valores exibidos em Reais (BRL).</span>
    </div>
  </div>
</footer>`;
}

function scripts(extra = []) {
  const base = [
    "/config/products.js",
    "/config/store.js",
    "/config/checkout.js",
    "/config/tracking.js",
    "/js/tracking.js",
    "/js/main.js"
  ];
  return [...base, ...extra.map(normAsset)]
    .map((s) => `<script src="${s}?v=${ASSET_V}" defer></script>`)
    .join("\n");
}

function vercelAnalytics() {
  return (
    `<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>\n` +
    `<script defer src="/_vercel/insights/script.js" data-sdkn="${e(vaPkg.name)}" data-sdkv="${e(vaPkg.version)}"></script>`
  );
}

function vercelSpeedInsights() {
  return (
    `<script>window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };</script>\n` +
    `<script defer src="/_vercel/speed-insights/script.js" data-sdkn="${e(siPkg.name)}" data-sdkv="${e(siPkg.version)}"></script>`
  );
}

function tiktokPixel() {
  return `<!-- TikTok Pixel Code Start -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};


  ttq.load('DB477NJC77U2NTDCJ9JG');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- TikTok Pixel Code End -->`;
}

function page({
  canonicalPath,
  title,
  description,
  body,
  active = "",
  ogImage = null,
  ogType = "website",
  jsonld = [],
  extraScripts = [],
  noindex = false,
  preloadImg = null,
  bodyAttrs = "",
  extraHead = ""
}) {
  const cleanCanon = canonicalPath === "/" ? `${SITE}/` : `${SITE}/${canonicalPath.replace(/^\/+/, "")}`;
  const fullOgImage = ogImage
    ? (ogImage.startsWith("http") ? ogImage : `${SITE}${normAsset(ogImage)}`)
    : `${SITE}/assets/brand/og-home.jpg`;

  const ld = jsonld
    .map(([d, a]) => `<script type="application/ld+json"${a || ""}>${JSON.stringify(d)}</script>`)
    .join("");

  const pre = preloadImg
    ? `<link rel="preload" as="image" href="${preloadImg[0]}" imagesrcset="${preloadImg[1]}" fetchpriority="high">`
    : "";

  const robots = noindex
    ? '<meta name="robots" content="noindex, follow">'
    : '<meta name="robots" content="index, follow, max-image-preview:large">';

  return `<!DOCTYPE html>
<html lang="pt-BR" data-root="/">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(title)}</title>
<meta name="description" content="${e(description)}">
${robots}
<link rel="canonical" href="${cleanCanon}">
<meta name="theme-color" content="#241d2b">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${cleanCanon}">
<meta property="og:image" content="${fullOgImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(description)}">
<meta name="twitter:image" content="${fullOgImage}">
${extraHead}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
${pre}
<link rel="stylesheet" href="/css/main.css?v=${ASSET_V}">
<link rel="stylesheet" href="/css/responsive.css?v=${ASSET_V}">
${ld}
${tiktokPixel()}
</head>
<body${bodyAttrs}>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1576880640332577&amp;ev=PageView&amp;noscript=1" alt=""/></noscript>
${sprite()}
${header(active)}
${body}
${footer()}
${scripts(extraScripts)}
${vercelAnalytics()}
${vercelSpeedInsights()}
</body>
</html>
`;
}

function gallery(p) {
  const slides = [];
  const dots = [];
  const thumbs = [];
  const n = p.images.length;

  p.images.forEach((im, i) => {
    const base = normAsset(im.src);
    const full = `${base}.webp`;
    const small = `${base}-600.webp`;
    const wf = getWebpWidth(full, 1200);
    const ws = getWebpWidth(small, 600);
    const srcset = wf !== ws ? `${small} ${ws}w, ${full} ${wf}w` : `${full} ${wf}w`;
    const load = i === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"';

    slides.push(
      `<div class="gallery-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} de ${n}">` +
      `<button type="button" aria-label="Ampliar imagem ${i + 1} de ${n}">` +
      `<img src="${small}" srcset="${srcset}" width="${ws}" height="${ws}" alt="${e(im.alt)}" data-full="${full}" ${load}></button></div>`
    );
    dots.push(`<button type="button" data-gallery-dot aria-label="Mostrar imagem ${i + 1}"></button>`);
    thumbs.push(
      `<button type="button" data-gallery-thumb aria-label="Mostrar imagem ${i + 1}">` +
      `<img src="${small}" alt="" width="120" height="120" loading="lazy" decoding="async"></button>`
    );
  });

  return `
<div class="gallery" data-gallery aria-roledescription="carrossel" aria-label="Fotos de ${e(p.name)}">
  <div class="gallery-track" tabindex="0" aria-label="Imagens do produto, use as setas para navegar">${slides.join("")}</div>
  <span class="gallery-zoom-hint">${icon("zoom")}Toque para ampliar</span>
  <span class="gallery-counter" data-gallery-counter aria-hidden="true">1 / ${n}</span>
  <button class="gallery-arrow prev" type="button" aria-label="Imagem anterior">${icon("chev-left")}</button>
  <button class="gallery-arrow next" type="button" aria-label="Próxima imagem">${icon("chev-right")}</button>
</div>
<div class="gallery-dots" role="group" aria-label="Escolher imagem">${dots.join("")}</div>
<div class="gallery-thumbs" role="group" aria-label="Escolher imagem">${thumbs.join("")}</div>`;
}

function buyButton(pid, idAttr = "", extraCls = "") {
  return (
    `<button type="button" class="btn btn-primary btn-block btn-lg ${extraCls}" data-buy="${pid}"${idAttr}>` +
    `${icon("lock")}<span data-btn-label data-default="Comprar agora">Comprar agora</span></button>`
  );
}

function trustGrid() {
  return `
<ul class="trust-grid" aria-label="Garantias de compra segura">
  <li>${icon("lock")}Compra segura</li>
  <li>${icon("truck")}Envio para todo o Brasil</li>
  <li>${icon("return")}Devolução em até ${STORE.returnWindowDays} dias</li>
  <li>${icon("chat")}Atendimento ao cliente</li>
</ul>`;
}

function accordionItem(iconName, title, body, open = false, id = "") {
  return (
    `<details${open ? " open" : ""}${id ? ` id="${id}"` : ""}>` +
    `<summary><span class="sum-left">${icon(iconName)}${title}</span>${icon("chev-down", "icon chev")}</summary>` +
    `<div class="acc-body">${body}</div></details>`
  );
}

function faqItems(items, idPrefix = "") {
  return items
    .map((item, i) => {
      const [q, a] = Array.isArray(item) ? item : [item.q, item.a];
      const idAttr = idPrefix ? ` id="${idPrefix}${i + 1}"` : "";
      return (
        `<details${idAttr}><summary><span class="sum-left">${e(q)}</span>${icon("chev-down", "icon chev")}</summary>` +
        `<div class="acc-body"><p>${a}</p></div></details>`
      );
    })
    .join("");
}

function shippingReturnsBlock() {
  return (
    `<p><strong>Preparação do pedido:</strong> ${STORE.processingDaysMin} a ${STORE.processingDaysMax} dias úteis após a confirmação da compra.</p>` +
    `<p><strong>Entrega estimada no Brasil:</strong> ${STORE.shippingDaysBRMin} a ${STORE.shippingDaysBRMax} dias úteis após o envio (prazo máximo de até ${STORE.maxDeliveryDays} dias úteis com frete grátis).</p>` +
    `<p>Você receberá o código de rastreamento por e-mail assim que o pedido for enviado.</p>` +
    `<p><strong>Trocas e devoluções:</strong> direito de arrependimento de ${STORE.cdcReturnDays} dias pelo CDC e até ${STORE.returnWindowDays} dias após a entrega para itens sem uso. ` +
    `<a href="/envio">Política de envio</a> · <a href="/devolucoes">Política de devolução</a></p>`
  );
}

function normalizeProductDetails(p) {
  const d = p.details || {};
  return {
    kicker: d.kicker || "Fantasia para gatos e cães pequenos · Ajuste confortável",
    benefitsTitle: d.benefitsTitle || "Por que você vai amar",
    benefits: d.benefits || [
      ["paw", "Conforto e liberdade", "Modelagem leve que permite ao seu pet caminhar e posar para fotos com tranquilidade."],
      ["sparkles", "Acabamento caprichado", "Peça selecionada para fotos de Halloween incríveis."]
    ],
    howTitle: d.howTitle || "Como vestir",
    how: d.how || [
      ["Posicione a peça", "Coloque suavemente a fantasia no seu pet."],
      ["Ajuste com conforto", "Regule o fechamento sem apertar."]
    ],
    honestNote: d.honestNote || "<strong>Dica de uso:</strong> Supervisione sempre seu pet durante o uso da fantasia.",
    specs: d.specs || [["Produto", p.name], ["Indicação", "Gatos e cães de pequeno porte"]],
    included: d.included || [`1× ${p.name}`],
    includedNote: d.includedNote || "Pronto para vestir assim que sair da embalagem.",
    dimensionsInfo: d.dimensionsInfo || "<p>Modelagem ajustável para gatos adultos e cães de pequeno porte.</p>",
    care: d.care || "<p>Lave à mão com água fria e sabão neutro. Seque à sombra.</p>",
    faq: d.faq || [
      ["Serve em gatos e cães pequenos?", "Sim! Modelagem projetada para gatos adultos e cães de pequeno porte."]
    ],
    finalTitle: d.finalTitle || `Garanta ${p.name} para o Halloween`,
    homeHighlight: d.homeHighlight || {
      text: p.shortDescription,
      bullets: ["Fácil de vestir", "Confortável para fotos", "Envio para todo o Brasil"],
      img: 0
    }
  };
}

function productPage(pid) {
  const p = PRODUCTS[pid];
  const d = normalizeProductDetails(p);
  const canonPath = `produto/${p.slug}`;
  const fullUrl = `${SITE}/${canonPath}`;
  const price = money(p.price);

  const benefits = d.benefits
    .map(([ic, t, desc]) => `<li class="benefit"><span class="benefit-icon">${icon(ic)}</span><div><h3>${e(t)}</h3><p>${desc}</p></div></li>`)
    .join("");
  const steps = d.how.map(([t, desc]) => `<li><div><strong>${e(t)}</strong>${desc}</div></li>`).join("");
  const specs = d.specs.map(([a, b]) => `<li><span>${e(a)}</span><span>${b}</span></li>`).join("");
  const included = d.included.map((x) => `<li>${icon("check-circle")}<span>${x}</span></li>`).join("");

  const acc = [
    accordionItem("info", "Especificações", `<ul class="spec-list">${specs}</ul>`, true),
    accordionItem("ruler", "Medidas e dimensões", d.dimensionsInfo, false, "medidas-produto"),
    accordionItem("package", "O que está incluído", `<ul class="included">${included}</ul><p class="fine">${d.includedNote}</p>`),
    accordionItem("truck", "Envio e devoluções", shippingReturnsBlock()),
    accordionItem("heart", "Cuidados e segurança", d.care)
  ].join("");

  const others = PRODUCT_KEYS.filter((k) => k !== pid);
  const cross = others
    .map((k) => {
      const op = PRODUCTS[k];
      return (
        `<a class="product-card" href="${productUrl(op)}">` +
        `<img src="${productImg(op)}" alt="${e(op.images[0].alt)}" width="600" height="600" loading="lazy" decoding="async">` +
        `<div class="product-card-body"><h3>${e(op.name)}</h3><p class="pc-sub">${e(op.subtitle)}</p>` +
        `<div class="pc-row"><span class="price" data-price-for="${k}">${money(op.price)}</span>` +
        `<span class="pc-link">Ver produto ${icon("arrow-right")}</span></div></div></a>`
      );
    })
    .join("");

  const firstBase = normAsset(p.images[0].src);
  const wf = getWebpWidth(`${firstBase}.webp`, 1200);
  const ws = getWebpWidth(`${firstBase}-600.webp`, 600);
  const preload = [
    `${firstBase}-600.webp`,
    wf !== ws ? `${firstBase}-600.webp ${ws}w, ${firstBase}.webp ${wf}w` : `${firstBase}.webp ${wf}w`
  ];

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.name} – ${p.subtitle}`,
    description: p.shortDescription,
    sku: p.sku,
    image: p.images.map((im) => `${SITE}${normAsset(im.src)}.webp`),
    brand: { "@type": "Brand", name: BRAND },
    category: "Animais e Pet Shop > Acessórios para Pets > Fantasias para Pets",
    offers: {
      "@type": "Offer",
      url: fullUrl,
      priceCurrency: "BRL",
      price: Number(p.price).toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: BRAND },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: ["BR"],
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: STORE.returnWindowDays,
        returnMethod: "https://schema.org/ReturnByMail"
      }
    }
  };

  const crumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Produtos", item: `${SITE}/#shop` },
      { "@type": "ListItem", position: 3, name: p.name, item: fullUrl }
    ]
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: d.faq.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: stripTags(a) }
    }))
  };

  const body = `
<main id="main" class="pdp" data-product-id="${pid}">
  <div class="container">
    <nav class="breadcrumb" aria-label="Navegação estrutural"><ol>
      <li><a href="/">Início</a></li><li><a href="/#shop">Produtos</a></li><li aria-current="page">${e(p.name)}</li></ol></nav>
    <div class="pdp-grid">
      <div class="pdp-media">${gallery(p)}</div>
      <div class="pdp-info">
        <p class="pdp-kicker">${icon("moon")} ${e(d.kicker)}</p>
        <h1 class="pdp-title">${e(p.name)}</h1>
        <p class="pdp-subtitle">${e(p.subtitle)}</p>
        <div class="pdp-price-row">
          <span class="price" data-price-for="${pid}">${price}</span>
          <span class="price-note">Frete grátis para todo o Brasil · Envio rastreado</span>
        </div>
        <p class="pdp-pitch">${e(p.shortDescription)}</p>
        <div class="buy-box">
          ${buyButton(pid, ' id="main-buy"')}
          <p class="buy-note">${icon("shield")}Compra segura · Envio para todo o Brasil com código de rastreamento</p>
        </div>
        ${trustGrid()}
        <div class="delivery">${icon("calendar")}<div><strong>Previsão de entrega no Brasil: <span data-delivery-estimate>${deliveryFallback()}</span></strong>
          <span>Envio rastreado em até ${STORE.maxDeliveryDays} dias úteis. <a href="/envio">Detalhes do envio</a></span></div></div>
      </div>
    </div>

    <div class="pdp-lower">
      <div>
        <section class="pdp-section" aria-labelledby="why-h">
          <h2 id="why-h">${e(d.benefitsTitle)}</h2>
          <ul class="benefits">${benefits}</ul>
        </section>
        <section class="pdp-section" aria-labelledby="how-h">
          <h2 id="how-h">${e(d.howTitle)}</h2>
          <ol class="how-steps">${steps}</ol>
          <div class="note-card">${icon("eye")}<div>${d.honestNote}</div></div>
        </section>
      </div>
      <div>
        <section class="pdp-section" aria-labelledby="details-h">
          <h2 id="details-h">Descrição e especificações</h2>
          <div class="accordion">${acc}</div>
        </section>
        <section class="pdp-section" aria-labelledby="faq-h">
          <h2 id="faq-h">Perguntas frequentes</h2>
          <div class="accordion" data-single>${faqItems(d.faq)}</div>
          <p class="fine" style="margin-top:12px">Mais respostas em nossas <a href="/faq">Perguntas frequentes</a> ou pelo e-mail <a href="mailto:${STORE.supportEmail}">${STORE.supportEmail}</a>.</p>
        </section>
      </div>
    </div>

    <section class="final-cta" data-hide-sticky aria-labelledby="final-h">
      <img src="${productImg(p)}" alt="" width="112" height="112" loading="lazy" decoding="async">
      <h2 id="final-h">${e(d.finalTitle)}</h2>
      <p>${e(p.name)} · <span class="price" data-price-for="${pid}">${price}</span></p>
      ${buyButton(pid, "", "final-buy")}
      <p class="buy-note">${icon("shield")}Compra segura · Devolução em até ${STORE.returnWindowDays} dias · Atendimento ao cliente</p>
    </section>

    <section class="pdp-section" data-hide-sticky aria-labelledby="more-h" style="padding-bottom:48px">
      <h2 id="more-h">Mais produtos da ${BRAND}</h2>
      <div class="mini-cards">${cross}</div>
    </section>
  </div>
</main>

<div class="sticky-cta" data-sticky-cta aria-hidden="true" inert>
  <img src="${productImg(p)}" alt="" width="44" height="44" loading="lazy">
  <div class="sc-info"><div class="sc-name">${e(p.name)}</div>
    <div><span class="sc-price" data-price-for="${pid}">${price}</span></div></div>
  <button type="button" class="btn btn-primary" data-buy="${pid}"><span data-btn-label data-default="Comprar agora">Comprar agora</span></button>
</div>

<dialog class="lightbox" id="lightbox" aria-label="Visualizador de imagens">
  <div class="lightbox-inner">
    <div class="lightbox-bar"><span data-lb-count></span>
      <button type="button" class="lightbox-close" data-lb-close aria-label="Fechar visualizador de imagens">${icon("x")}</button></div>
    <div class="lightbox-stage"><img src="" alt=""></div>
    <div class="lightbox-nav">
      <button type="button" data-lb-prev aria-label="Imagem anterior">${icon("chev-left")}</button>
      <button type="button" data-lb-next aria-label="Próxima imagem">${icon("chev-right")}</button>
    </div>
  </div>
</dialog>`;

  const seoTitle = (p.seo && p.seo.title) || `${p.name} | ${BRAND}`;
  const seoDesc = (p.seo && p.seo.description) || p.shortDescription;
  const ogImg = (p.seo && p.seo.ogImage) || p.mainImage || `${firstBase}.webp`;
  const extraHead =
    `<meta property="product:price:amount" content="${Number(p.price).toFixed(2)}">\n` +
    `<meta property="product:price:currency" content="BRL">`;

  return page({
    canonicalPath: canonPath,
    title: seoTitle,
    description: seoDesc,
    body,
    active: "shop",
    ogImage: ogImg,
    ogType: "product",
    jsonld: [
      [productLd, ` id="product-jsonld" data-product="${pid}"`],
      [crumbsLd, ""],
      [faqLd, ""]
    ],
    extraScripts: ["/js/product.js", "/js/faq.js"],
    preloadImg: preload,
    extraHead
  });
}

function homePage() {
  const firstProduct = PRODUCTS[PRODUCT_KEYS[0]];
  const secondProduct = PRODUCTS[PRODUCT_KEYS[1]] || firstProduct;

  const cards = PRODUCT_KEYS.map((k) => {
    const p = PRODUCTS[k];
    return (
      `<a class="product-card" href="${productUrl(p)}">` +
      `<img src="${productImg(p)}" alt="${e(p.images[0].alt)}" width="600" height="600" loading="lazy" decoding="async">` +
      `<div class="product-card-body"><h3>${e(p.name)}</h3><p class="pc-sub">${e(p.subtitle)}</p>` +
      `<div class="pc-row"><span class="price" data-price-for="${k}">${money(p.price)}</span>` +
      `<span class="pc-link">Ver produto ${icon("arrow-right")}</span></div></div></a>`
    );
  }).join("");

  const why = C.HOME_WHY.map(
    ([ic, t, d]) => `<div class="why-card"><span class="benefit-icon">${icon(ic)}</span><div><h3>${e(t)}</h3><p>${d}</p></div></div>`
  ).join("");

  const highlights = PRODUCT_KEYS.map((k) => {
    const p = PRODUCTS[k];
    const d = normalizeProductDetails(p);
    const h = d.homeHighlight;
    const imgIdx = h.img || 0;
    const bullets = h.bullets.map((b) => `<li>${icon("check")}<span>${b}</span></li>`).join("");
    return `
<article class="highlight">
  <img src="${productImg(p, imgIdx)}" alt="${e(p.images[imgIdx].alt)}" width="600" height="600" loading="lazy" decoding="async">
  <div><h3>${e(p.name)}</h3><p>${e(h.text)}</p><ul>${bullets}</ul>
    <div class="hl-row"><span class="price" data-price-for="${k}">${money(p.price)}</span>
    <a class="btn btn-primary" href="${productUrl(p)}">Ver produto ${icon("arrow-right")}</a></div></div>
</article>`;
  }).join("");

  const conf = C.homeConfidence(STORE)
    .map(([ic, t, d]) => `<div class="conf-item"><span class="benefit-icon">${icon(ic)}</span><div><h3>${e(t)}</h3><p>${d}</p></div></div>`)
    .join("");

  const faq = faqItems(C.homeFaq(STORE));
  const thumbs = PRODUCT_KEYS.map(
    (k) => `<a href="${productUrl(PRODUCTS[k])}" aria-label="${e(PRODUCTS[k].name)}"><img src="${productImg(PRODUCTS[k])}" alt="" width="84" height="84" loading="lazy"></a>`
  ).join("");

  const heroSrc = normAsset(firstProduct.images[0].src);
  const storySrc = normAsset(secondProduct.images[0].src);

  const body = `
<main id="main">
  <section class="hero" aria-labelledby="hero-h">
    <div class="hero-media">
      <img src="${heroSrc}.webp" srcset="${heroSrc}-600.webp 600w, ${heroSrc}.webp 1200w"
        width="1200" height="1200" alt="${e(firstProduct.images[0].alt)}" fetchpriority="high">
    </div>
    <div class="hero-copy">
      <span class="eyebrow">Coleção Halloween ${CURRENT_YEAR}</span>
      <h1 id="hero-h">Fantasias de Halloween para <em>gatos e cães pequenos</em></h1>
      <p>Fantasia de Halloween Divertida para Pets, Roupa de freira para pet e A Aranha Felpuda. Fáceis de vestir, feitas para fotos incríveis e com preço único: <strong data-price-for="product1">${money(firstProduct.price)}</strong> cada.</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lg" href="#shop">Comprar agora ${icon("arrow-right")}</a>
        <a class="btn btn-outline btn-lg" href="${productUrl(firstProduct)}">Ver ${e(firstProduct.name)}</a>
      </div>
      <ul class="hero-points">
        <li>${icon("lock")}Compra segura</li><li>${icon("truck")}Envio para todo o Brasil</li><li>${icon("return")}Garantia de ${STORE.returnWindowDays} dias</li>
      </ul>
    </div>
  </section>

  <section class="section" id="shop" aria-labelledby="shop-h">
    <div class="container">
      <div class="section-head"><span class="eyebrow">Produtos</span><h2 id="shop-h">Escolha o visual de Halloween do seu pet</h2>
        <p>Fantasias exclusivas por ${money(firstProduct.price)} cada. Toque em um produto para ver fotos e detalhes.</p></div>
      <div class="product-cards">${cards}</div>
    </div>
  </section>

  <section class="section section-alt" aria-labelledby="why-h">
    <div class="container">
      <div class="section-head"><span class="eyebrow">Por que você vai amar</span><h2 id="why-h">Uma loja especializada que preza pela clareza</h2></div>
      <div class="why-grid">${why}</div>
    </div>
  </section>

  <section class="section" aria-labelledby="story-h">
    <div class="container story">
      <div class="story-img"><img src="${storySrc}.webp" alt="${e(secondProduct.images[0].alt)}" width="800" height="800" loading="lazy" decoding="async"></div>
      <div>
        <span class="eyebrow">Sobre nós</span>
        <h2 id="story-h">${e(C.STORY.title)}</h2>
        ${C.STORY.html}
        <a class="btn btn-outline" href="/sobre">Saiba mais sobre a ${BRAND}</a>
      </div>
    </div>
  </section>

  <section class="section section-dark" aria-labelledby="hl-h">
    <div class="container">
      <div class="section-head"><span class="eyebrow">Características</span><h2 id="hl-h" style="color:#fff">O que torna cada fantasia especial</h2>
        <p>Um resumo rápido. As especificações completas estão na página de cada produto.</p></div>
      <div class="highlights-wrap">${highlights}</div>
    </div>
  </section>

  <section class="section" aria-labelledby="conf-h">
    <div class="container">
      <div class="section-head"><span class="eyebrow">Compra segura</span><h2 id="conf-h">Tudo o que você precisa saber antes de pedir</h2></div>
      <div class="confidence">${conf}</div>
    </div>
  </section>

  <section class="section section-alt" aria-labelledby="faq-h">
    <div class="container" style="max-width:820px">
      <div class="section-head"><span class="eyebrow">Perguntas frequentes</span><h2 id="faq-h">Dúvidas comuns</h2></div>
      <div class="accordion" data-single>${faq}</div>
      <p style="margin-top:20px"><a class="btn btn-outline" href="/faq">Ver todas as perguntas frequentes</a></p>
    </div>
  </section>

  <section class="section section-dark cta-band" aria-labelledby="cta-h">
    <div class="container">
      <h2 id="cta-h">Pronto para o Halloween?</h2>
      <p>Escolha a fantasia ideal e faça seu pedido com segurança. Qualquer modelo por ${money(firstProduct.price)}.</p>
      <div class="mini-thumbs">${thumbs}</div>
      <a class="btn btn-primary btn-lg" href="#shop">Comprar agora ${icon("arrow-right")}</a>
    </div>
  </section>
</main>`;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: `${SITE}/`,
    logo: `${SITE}/assets/brand/icon-512.png`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Atendimento ao cliente",
      email: STORE.supportEmail,
      availableLanguage: "Portuguese"
    }
  };
  const siteLd = { "@context": "https://schema.org", "@type": "WebSite", name: BRAND, url: `${SITE}/` };

  return page({
    canonicalPath: "/",
    title: `${BRAND} – Fantasias de Halloween para Gatos e Cães Pequenos`,
    description: `Fantasias de Halloween para gatos e cães pequenos: Fantasia de Halloween Divertida para Pets, Roupa de freira para pet e A Aranha Felpuda. ${money(firstProduct.price)} cada com envio para todo o Brasil.`,
    body,
    active: "shop",
    jsonld: [
      [orgLd, ""],
      [siteLd, ""]
    ],
    extraScripts: ["/js/faq.js"],
    preloadImg: [`${heroSrc}.webp`, `${heroSrc}-600.webp 600w, ${heroSrc}.webp 1200w`]
  });
}

function contentPage(pg) {
  let htmlBody = pg.body;
  if (pg.slug === "faq" && pg.groups) {
    htmlBody =
      pg.groups
        .map(
          ([g, gid, items], i) =>
            `<section class="faq-group" aria-labelledby="fg-${i}"><h2 id="fg-${i}">${e(g)}</h2><div class="accordion">${faqItems(items, `faq-${gid}-`)}</div></section>`
        )
        .join("") + pg.body;
  }

  const jsonld = [];
  if (pg.faqLd) {
    jsonld.push([
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: pg.faqLd.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: stripTags(a) }
        }))
      },
      ""
    ]);
  }

  const body = `
<main id="main">
  <div class="container">
    <nav class="breadcrumb" aria-label="Navegação estrutural"><ol><li><a href="/">Início</a></li><li aria-current="page">${e(pg.title)}</li></ol></nav>
    <header class="page-hero"><h1>${e(pg.title)}</h1>${pg.intro ? `<p>${pg.intro}</p>` : ""}</header>
    ${pg.wide ? htmlBody : `<div class="prose">${htmlBody}</div>`}
  </div>
</main>`;

  const canon = pg.cleanPath ? `/${pg.cleanPath}` : `/pages/${pg.slug}.html`;
  return page({
    canonicalPath: canon,
    title: pg.seoTitle,
    description: pg.seoDesc,
    body,
    active: pg.active || "",
    jsonld,
    noindex: !!pg.noindex,
    extraScripts: pg.scripts || [],
    bodyAttrs: pg.bodyAttrs || ""
  });
}

function writePublicFile(relPath, content) {
  const fullPath = path.join(PUBLIC_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function build() {
  const sitemapUrls = [{ loc: `${SITE}/`, priority: "1.0" }];

  // 1. Home
  const homeHtml = homePage();
  writePublicFile("index.html", homeHtml);

  // 2. Produtos (/produto/<slug>/index.html, /produto/<slug>.html e fallback /products/<legacy>.html)
  PRODUCT_KEYS.forEach((pid) => {
    const p = PRODUCTS[pid];
    const html = productPage(pid);
    writePublicFile(`produto/${p.slug}/index.html`, html);
    writePublicFile(`produto/${p.slug}.html`, html);
    if (Array.isArray(p.legacySlugs)) {
      p.legacySlugs.forEach((leg) => {
        writePublicFile(`products/${leg}.html`, html);
      });
    }
    sitemapUrls.push({ loc: `${SITE}/produto/${p.slug}`, priority: "0.9" });
  });

  // 3. Páginas institucionais, entrega e obrigado
  const pages = C.contentPages(STORE, PRODUCTS, money);
  pages.forEach((pg) => {
    const html = contentPage(pg);
    writePublicFile(`pages/${pg.slug}.html`, html);
    if (pg.cleanPath) {
      writePublicFile(`${pg.cleanPath}/index.html`, html);
      writePublicFile(`${pg.cleanPath}.html`, html);
    }
    if (!pg.noindex && pg.cleanPath) {
      sitemapUrls.push({ loc: `${SITE}/${pg.cleanPath}`, priority: "0.5" });
    }
  });

  // 4. Página 404
  const nfBody = `
<main id="main"><div class="container notfound">
  <h1>Esta página desapareceu na neblina</h1>
  <p>A página que você está procurando não existe ou foi movida.</p>
  <p><a class="btn btn-primary" href="/">Voltar para o início</a></p>
</div></main>`;
  const nfHtml = page({
    canonicalPath: "/404.html",
    title: `Página não encontrada | ${BRAND}`,
    description: "Página não encontrada.",
    body: nfBody,
    noindex: true
  });
  writePublicFile("404.html", nfHtml);

  // 5. Sitemap.xml
  const smLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];
  sitemapUrls.forEach((u) => {
    smLines.push(`  <url><loc>${u.loc}</loc><lastmod>${TODAY_ISO}</lastmod><priority>${u.priority}</priority></url>`);
  });
  smLines.push("</urlset>\n");
  writePublicFile("sitemap.xml", smLines.join("\n"));

  // 6. Robots.txt
  const robotsTxt = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /informacoes-entrega",
    "Disallow: /obrigado",
    "Disallow: /pages/thank-you.html",
    "Disallow: /pages/checkout.html",
    "Disallow: /pages/informacoes-entrega.html",
    "Disallow: /api/",
    "",
    `Sitemap: ${SITE}/sitemap.xml`,
    ""
  ].join("\n");
  writePublicFile("robots.txt", robotsTxt);

  console.log(`[Hollowpaw Build] Concluído com sucesso (${PRODUCT_KEYS.length} produtos, ${pages.length} páginas, sitemap.xml e robots.txt gerados em public/).`);
}

if (require.main === module) {
  build();
}

module.exports = { build };
