/**
 * HOLLOWPAW — Servidor de Desenvolvimento Local Compatível com Vercel
 * ===================================================================
 * Emula exatamente o comportamento da Vercel localmente:
 *   - Serve arquivos estáticos de `public/`
 *   - Suporta URLs limpas (/produto/headless-rider, /sobre, /faq, etc.)
 *   - Aplica redirects permanentes das URLs legadas definidas em `vercel.json`
 *   - Executa as Serverless Functions de `/api/*`
 *   - Retorna `public/404.html` com status 404 para rotas inexistentes
 */
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const API_DIR = path.join(ROOT_DIR, "api");
const VERCEL_JSON = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "vercel.json"), "utf8"));

const PORT = Number(process.env.PORT || 8080);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

const API_ROUTES = {
  "/api/tracking/event": path.join(API_DIR, "tracking", "event.js"),
  "/api/tiktok/events": path.join(API_DIR, "tiktok", "events.js"),
  "/api/bravopay/transactions": path.join(API_DIR, "bravopay", "transactions.js"),
  "/api/orders/session": path.join(API_DIR, "orders", "session.js"),
  "/api/orders/status": path.join(API_DIR, "orders", "status.js"),
  "/api/orders/ack-browser-purchase": path.join(API_DIR, "orders", "ack-browser-purchase.js"),
  "/api/webhooks/payment": path.join(API_DIR, "webhooks", "payment.js"),
  "/api/webhooks/bravo": path.join(API_DIR, "webhooks", "bravo.js")
};

function resolvePublicFile(urlPath) {
  const safeRel = decodeURIComponent(urlPath).replace(/^\/+/, "");
  const direct = path.join(PUBLIC_DIR, safeRel);

  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
    return direct;
  }
  const indexInDir = path.join(direct, "index.html");
  if (fs.existsSync(indexInDir) && fs.statSync(indexInDir).isFile()) {
    return indexInDir;
  }
  const withHtml = `${direct}.html`;
  if (fs.existsSync(withHtml) && fs.statSync(withHtml).isFile()) {
    return withHtml;
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(req.url, `http://${req.headers.host || " hollowpaw.local"}`);
    const pathname = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/+$/, "") : parsed.pathname;

    // 1. Serverless API Routes (/api/*)
    if (API_ROUTES[pathname]) {
      const handler = require(API_ROUTES[pathname]);
      return await handler(req, res);
    }

    // 1b. Emulação local de /_vercel/insights/script.js e /_vercel/speed-insights/script.js (na Vercel são servidos pela Edge Network)
    if (pathname === "/_vercel/insights/script.js") {
      const stub = "window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};\n";
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.setHeader("Content-Length", Buffer.byteLength(stub));
      res.setHeader("Connection", "close");
      return res.end(stub);
    }
    if (pathname === "/_vercel/speed-insights/script.js") {
      const stub = "window.si=window.si||function(){(window.siq=window.siq||[]).push(arguments)};\n";
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.setHeader("Content-Length", Buffer.byteLength(stub));
      res.setHeader("Connection", "close");
      return res.end(stub);
    }

    // 2. Redirects configurados no vercel.json
    for (const r of VERCEL_JSON.redirects || []) {
      if (r.source === pathname) {
        const dest = r.destination + (parsed.search || "");
        res.statusCode = r.permanent ? 308 : 307;
        res.setHeader("Location", dest);
        res.setHeader("Connection", "close");
        return res.end();
      }
    }

    // 3. Arquivos estáticos e Clean URLs em public/
    const file = resolvePublicFile(pathname);
    if (file) {
      const ext = path.extname(file).toLowerCase();
      const mime = MIME_TYPES[ext] || "application/octet-stream";
      const data = fs.readFileSync(file);
      res.statusCode = 200;
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Length", data.length);
      res.setHeader("Connection", "close");
      return res.end(data);
    }

    // 4. Página 404 personalizada
    const notFoundFile = path.join(PUBLIC_DIR, "404.html");
    if (fs.existsSync(notFoundFile)) {
      const nfData = fs.readFileSync(notFoundFile);
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Length", nfData.length);
      res.setHeader("Connection", "close");
      return res.end(nfData);
    }

    res.statusCode = 404;
    res.setHeader("Connection", "close");
    res.end("Not Found");
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Connection", "close");
    res.end(JSON.stringify({ ok: false, error: String(err.message || err) }));
  }
});

server.listen(PORT, () => {
  console.log(`[Hollowpaw Dev Server] Rodando na porta ${PORT}`);
});
