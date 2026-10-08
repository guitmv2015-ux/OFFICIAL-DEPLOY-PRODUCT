# Hollowpaw — Loja Autônoma Otimizada para Vercel

Aplicação web de e-commerce (`pt-BR`, `BRL`, `R$ 29,90`) estruturada para deploy direto na **Vercel** com páginas estáticas de alta performance (`public/`) e **Vercel Serverless Functions** (`api/`) para Meta Conversions API (CAPI), atribuição UTMify e validação idempotente de pagamento via Webhook.

---

## Estrutura do Projeto

```text
/
├── public/                        # Diretório estático publicado pela Vercel
│   ├── assets/
│   │   ├── brand/                 # Logo, ícone e Open Graph da marca
│   │   ├── fonts/                 # Fonte Fraunces (.woff2)
│   │   └── products/              # Imagens WebP organizadas por produto
│   │       ├── headless-rider/
│   │       ├── holy-habit/
│   │       └── creepy-crawler/
│   ├── config/
│   │   ├── products.js            # FONTE ÚNICA DA VERDADE DOS PRODUTOS
│   │   ├── store.js               # Dados gerais da loja (prazos, suporte, domínio)
│   │   ├── checkout.js            # Links de checkout mapeados dinamicamente
│   │   └── tracking.js            # Configuração pública do Meta Pixel (sem secrets)
│   ├── css/
│   │   ├── main.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── main.js
│   │   ├── product.js
│   │   ├── delivery.js
│   │   ├── checkout.js
│   │   ├── faq.js
│   │   └── tracking.js
│   ├── produto/                   # Páginas estáticas geradas com URLs amigáveis
│   │   ├── headless-rider/
│   │   ├── fantasia-freira/
│   │   └── creepy-crawler/
│   ├── pages/                     # Páginas institucionais, entrega e pós-compra
│   ├── index.html
│   ├── 404.html
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   └── content/
│       └── institutional.js       # Conteúdo das páginas institucionais
├── scripts/
│   ├── build.js                   # Gerador estático zero-dependência (npm run build)
│   └── dev-server.js              # Servidor local que emula Vercel + /api/*
├── api/                           # Vercel Serverless Functions (Node.js)
│   ├── _lib/tracking-core.js
│   ├── tracking/event.js          # POST /api/tracking/event (Meta CAPI com event_id)
│   ├── orders/session.js          # POST /api/orders/session (Atribuição + Entrega)
│   ├── orders/status.js           # GET  /api/orders/status  (Validação de Purchase)
│   ├── orders/ack-browser-purchase.js
│   └── webhooks/
│       ├── payment.js             # POST /api/webhooks/payment
│       └── bravo.js               # POST /api/webhooks/bravo
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

---

## Passo a Passo: Desenvolvimento e Deploy

### 1. Clonar o projeto
```bash
git clone <URL_DO_REPOSITORIO>
cd HALLOWENPETSHOP
```

### 2. Instalar dependências
O projeto não possui dependências pesadas de terceiros; roda nativamente em Node.js (`>= 18`):
```bash
npm install
```

### 3. Configurar `.env` (Desenvolvimento Local)
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```
Preencha as variáveis no `.env` (nunca faça commit do arquivo `.env`).

### 4. Rodar localmente
```bash
npm run dev
```
O comando executa `npm run build` automaticamente e inicia o servidor local compatível com Vercel (arquivos estáticos + URLs limpas + rotas `/api/*`) na porta `8080`.

### 5. Gerar build de produção
```bash
npm run build
```
Regenera todas as páginas HTML, `sitemap.xml` e `robots.txt` dentro de `public/` a partir de `public/config/products.js`.

### 6. Fazer Deploy na Vercel
1. Suba o repositório para o **GitHub**.
2. No painel da **Vercel**, clique em **Add New... → Project** e importe o repositório.
3. A Vercel detectará automaticamente o `vercel.json`:
   - **Build Command**: `npm run build`
   - **Output Directory**: `public`
4. Clique em **Deploy**.

### 7. Configurar Environment Variables na Vercel
No painel do projeto na Vercel (**Settings → Environment Variables**), cadastre:
- `META_PIXEL_ID` = `1576880640332577`
- `META_CAPI_ACCESS_TOKEN` = *(Token da API de Conversões da Meta)*
- `META_TEST_EVENT_CODE` = *(Opcional — código de teste do Gerenciador de Eventos)*
- `UTMIFY_API_TOKEN` = *(Token de credencial de API da UTMify)*
- `BRAVO_WEBHOOK_SECRET` = *(Segredo de validação do Webhook de pagamento, se aplicável)*

### 8. Configurar Domínio
1. Em **Settings → Domains** na Vercel, adicione o seu domínio (ex.: `www.hollowpaw.com.br`).
2. Caso altere o domínio principal, atualize `siteUrl` em `public/config/store.js` (ou defina a variável de ambiente `SITE_URL` na Vercel) e faça um novo deploy para atualizar as tags canônicas e o `sitemap.xml`.

### 9. Testar Checkout e Tracking
- **Jornada de Checkout**:
  - Produto 1 (`/produto/headless-rider`) → `"Comprar agora"` → `/informacoes-entrega?produto=product1` → `"CONTINUAR PARA PAGAMENTO"` → `https://pagseguropix.org/c/fantasia-halloween-divertida-pets`
  - Produto 2 (`/produto/fantasia-freira`) → `"Comprar agora"` → `/informacoes-entrega?produto=product2` → `"CONTINUAR PARA PAGAMENTO"` → `https://pagseguropix.org/c/offer-2-prod-2`
  - Produto 3 (`/produto/creepy-crawler`) → `"Comprar agora"` → `/informacoes-entrega?produto=product3` → `"CONTINUAR PARA PAGAMENTO"` → `https://pagseguropix.org/c/fantasia-de-aranha-para-caes-e-gatos-halloween`
- **Webhook de Confirmação de Pagamento (`Purchase`)**:
  - Configure o gateway para enviar POST para `https://SEU-DOMINIO/api/webhooks/bravo` (ou `/api/webhooks/payment`).
  - O evento `Purchase` só é disparado quando o webhook confirma pagamento aprovado (`paid` / `approved`).

---

## Como Adicionar um Novo Produto (Ex.: Produto 4)

Não é necessário duplicar HTML nem editar múltiplos arquivos. Todo o catálogo fica centralizado em **`public/config/products.js`**.

1. **Adicione as imagens do produto** na pasta:
   ```text
   public/assets/products/<slug-do-novo-produto>/
   ```
   Para cada foto, inclua a versão principal (`foto-1.webp`) e a miniatura (`foto-1-600.webp`).

2. **Cadastre o produto em `public/config/products.js`**:
   Adicione uma nova chave (ex.: `product4`) dentro de `PRODUCTS`:
   ```js
   product4: {
     id: "product4",
     sku: "HP-NOVO-04",
     slug: "fantasia-abobora",
     url: "/produto/fantasia-abobora",
     name: "Fantasia de Abóbora para Pets",
     subtitle: "Fantasia Leve para Gatos e Cães Pequenos",
     price: 29.90,
     currency: "BRL",
     category: "Fantasia para Pets",
     shortDescription: "Descrição curta da fantasia exibida no topo da página do produto.",
     mainImage: "/assets/products/fantasia-abobora/foto-1.webp",
     images: [
       { src: "/assets/products/fantasia-abobora/foto-1", alt: "Descrição da foto 1" },
       { src: "/assets/products/fantasia-abobora/foto-2", alt: "Descrição da foto 2" }
     ],
     externalCheckoutUrl: "https://pagseguropix.org/c/link-do-checkout-produto-4",
     tracking: {
       contentId: "HP-NOVO-04",
       contentType: "product",
       contentName: "Fantasia de Abóbora para Pets",
       value: 29.90,
       currency: "BRL"
     },
     seo: {
       title: "Fantasia de Abóbora para Pets | Hollowpaw",
       description: "Fantasia de Abóbora para gatos e cães pequenos por R$ 29,90.",
       ogImage: "/assets/products/fantasia-abobora/foto-1.webp"
     }
   }
   ```

3. **Publique**:
   - Localmente: rode `npm run build`
   - Na Vercel: basta fazer `git commit` e `git push`. A Vercel executará `npm run build` automaticamente e criará `/produto/fantasia-abobora`, incluindo o novo produto na Home, no menu, no rodapé, no checkout, no Meta Pixel e no `sitemap.xml`.
