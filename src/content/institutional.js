/* ==========================================================================
   HOLLOWPAW — CONTEÚDO INSTITUCIONAL, HOME, ENTREGA E PÓS-COMPRA (pt-BR)
   ========================================================================== */
"use strict";

const HOME_WHY = [
  ["paw", "Conforto em primeiro lugar", "Modelagens pensadas para não prender as patas nem cobrir o focinho, ideais para fotos rápidas e passeios tranquilos."],
  ["ruler", "Ajuste fácil e prático", "Peças com tiras reguláveis e caimento leve para vestir seu gato ou cão pequeno em poucos segundos."],
  ["tag", "Preço único: R$ 29,90", "Sem pegadinhas, sem descontos falsos e sem taxas ocultas. Qualquer uma das três fantasias custa R$ 29,90."],
  ["shield", "Compra segura no Brasil", "Pedido protegido com frete grátis para todo o Brasil e código de rastreamento enviado por e-mail."]
];

const STORY = {
  title: "Uma coleção enxuta, feita para fotos inesquecíveis",
  html:
    "<p>Criamos a Hollowpaw com uma ideia simples: escolher apenas as fantasias de Halloween mais criativas e fotogênicas para gatos e cães pequenos, apresentando cada detalhe com total transparência.</p>" +
    "<p>Em vez de centenas de produtos confusos, oferecemos três modelos selecionados — <strong>Fantasia de Halloween Divertida para Pets</strong>, <strong>Roupa de freira para pet</strong> e <strong>A Aranha Felpuda</strong> — todos pelo mesmo valor de <strong>R$ 29,90</strong>, com fotos reais das peças e atendimento dedicado em português.</p>"
};

function homeConfidence(store) {
  return [
    ["lock", "Ambiente de compra seguro", "Seus dados são protegidos com criptografia durante todas as etapas do pedido."],
    ["truck", "Envio para todo o Brasil", `Despacho em ${store.processingDaysMin} a ${store.processingDaysMax} dias úteis e entrega estimada em até ${store.maxDeliveryDays} dias úteis com rastreamento.`],
    ["return", `Devolução garantida (${store.returnWindowDays} dias)`, `Direito de arrependimento assegurado pelo CDC (${store.cdcReturnDays} dias) e política ampliada de ${store.returnWindowDays} dias para trocas e devoluções.`],
    ["chat", "Atendimento humano em português", `Dúvidas sobre nossos produtos ou entrega? Fale conosco pelo e-mail <a href="mailto:${store.supportEmail}">${store.supportEmail}</a>.`]
  ];
}

function homeFaq(store) {
  return [
    [
      "Qual é o valor das fantasias?",
      "Todas as três fantasias custam <strong>R$ 29,90</strong> cada, com frete grátis para todo o Brasil."
    ],
    [
      "As fantasias servem em gatos e cães pequenos?",
      "Sim! Nossos três modelos — <em>Fantasia de Halloween Divertida para Pets</em>, <em>Roupa de freira para pet</em> e <em>A Aranha Felpuda</em> — possuem ajuste prático projetado para gatos adultos e cães de pequeno porte."
    ],
    [
      "Qual é o prazo de entrega para o Brasil?",
      `Os pedidos são preparados em ${store.processingDaysMin} a ${store.processingDaysMax} dias úteis. O prazo estimado de entrega é de ${store.shippingDaysBRMin} a ${store.shippingDaysBRMax} dias úteis após o envio (prazo máximo de até ${store.maxDeliveryDays} dias úteis). Você recebe o código de rastreamento por e-mail.`
    ],
    [
      "Como funcionam as trocas e devoluções?",
      `Você conta com o direito de arrependimento de ${store.cdcReturnDays} dias corridos previsto no Código de Defesa do Consumidor, além da nossa garantia de até ${store.returnWindowDays} dias após o recebimento para solicitar troca ou reembolso de itens sem uso.`
    ]
  ];
}

function brazilStatesOptions() {
  const states = [
    ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"],
    ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"],
    ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"],
    ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
    ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
    ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"],
    ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"]
  ];
  return '<option value="">Selecione seu estado</option>' + states.map(([uf, nome]) => `<option value="${uf}">${nome} (${uf})</option>`).join("");
}

function deliveryInfoBody(store, products, money) {
  const p1 = products.product1 || Object.values(products)[0];
  const stateOpts = brazilStatesOptions();
  const imgSrc = (p1.images[0].src.startsWith("/") ? p1.images[0].src : "/" + p1.images[0].src) + "-600.webp";
  return `
<div class="checkout-wrap" data-delivery-page>
  <div style="max-width:640px;margin:0 auto">
    <div class="checkout-card" style="margin-bottom:16px">
      <div class="summary-product">
        <img id="dl-summary-img" src="${imgSrc}" alt="${p1.images[0].alt}" width="72" height="72">
        <div>
          <h3 id="dl-summary-name">${p1.name}</h3>
          <p id="dl-summary-sub">${p1.subtitle}</p>
        </div>
      </div>
      <ul class="summary-totals" style="margin-top:12px">
        <li><span>Preço</span><strong id="dl-summary-price" data-price-for="${p1.id}">${money(p1.price)}</strong></li>
        <li><span>Frete</span><span class="badge-free">Grátis</span></li>
        <li class="total-row"><span>Total</span><span id="dl-summary-total" data-price-for="${p1.id}">${money(p1.price)}</span></li>
      </ul>
    </div>

    <div class="checkout-card">
      <div class="error-banner" id="dl-error-banner" role="alert" hidden>
        <strong>Não foi possível continuar. Tente novamente.</strong>
      </div>

      <form id="delivery-info-form" novalidate>
        <div class="form-field">
          <label for="dl-name">Nome completo</label>
          <input type="text" id="dl-name" name="fullname" autocomplete="name" placeholder="Digite seu nome completo" data-required>
          <div class="form-error">Informe seu nome completo.</div>
        </div>

        <div class="form-field">
          <label for="dl-email">E-mail</label>
          <input type="email" id="dl-email" name="email" autocomplete="email" placeholder="Digite seu e-mail" data-required>
          <div class="form-error">Informe um e-mail válido.</div>
        </div>

        <div class="form-row-2">
          <div class="form-field">
            <label for="dl-phone">Telefone / WhatsApp</label>
            <input type="tel" id="dl-phone" name="phone" autocomplete="tel" placeholder="(00) 00000-0000" inputmode="numeric" data-required>
            <div class="form-error">Informe seu telefone.</div>
          </div>

          <div class="form-field">
            <label for="dl-cep">CEP</label>
            <input type="text" id="dl-cep" name="cep" autocomplete="postal-code" placeholder="00000-000" inputmode="numeric" data-required>
            <div class="form-error">Informe um CEP válido.</div>
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-field">
            <label for="dl-state">Estado</label>
            <select id="dl-state" name="state" autocomplete="address-level1" data-required>${stateOpts}</select>
            <div class="form-error">Selecione seu estado.</div>
          </div>

          <div class="form-field">
            <label for="dl-city">Cidade</label>
            <input type="text" id="dl-city" name="city" autocomplete="address-level2" placeholder="Digite sua cidade" data-required>
            <div class="form-error">Informe sua cidade.</div>
          </div>
        </div>

        <div class="form-field">
          <label for="dl-street">Endereço</label>
          <input type="text" id="dl-street" name="street" autocomplete="street-address" placeholder="Digite seu endereço" data-required>
          <div class="form-error">Informe seu endereço.</div>
        </div>

        <div class="form-row-2">
          <div class="form-field">
            <label for="dl-number">Número</label>
            <input type="text" id="dl-number" name="number" placeholder="Digite o número" data-required>
            <div class="form-error">Informe o número.</div>
          </div>

          <div class="form-field">
            <label for="dl-complement">Complemento <span class="field-tag">(opcional)</span></label>
            <input type="text" id="dl-complement" name="complement" placeholder="Opcional">
          </div>
        </div>

        <div class="form-field">
          <label for="dl-neighborhood">Bairro</label>
          <input type="text" id="dl-neighborhood" name="neighborhood" placeholder="Digite seu bairro" data-required>
          <div class="form-error">Informe seu bairro.</div>
        </div>

        <p class="fine" style="margin:16px 0;color:var(--ink-2)">Após preencher seus dados, você será direcionado para a página segura de pagamento.</p>

        <button type="submit" class="btn btn-primary btn-block btn-lg" id="dl-submit-btn">
          <span id="dl-submit-label">CONTINUAR PARA PAGAMENTO</span>
        </button>
      </form>
    </div>
  </div>
</div>`;
}

function thankYouBody(store, products, money) {
  const p2 = products.product2 || products.product1 || Object.values(products)[0];
  return `
<div class="checkout-wrap">
  <div class="checkout-card" style="max-width:720px;margin:0 auto">
    <p class="eyebrow" style="margin-bottom:6px">Pedido confirmado</p>
    <h2 style="font-size:26px;margin-bottom:8px">Obrigado pela sua compra!</h2>
    <p style="color:var(--ink-2)">Seu pedido <strong id="ty-order-id">HP-849201</strong> foi confirmado com sucesso e já está sendo preparado para envio.</p>

    <ul class="spec-list" style="margin:18px 0">
      <li><span>Produto</span><span id="ty-product-name">${p2.name}</span></li>
      <li><span>Frete</span><span>Grátis para todo o Brasil</span></li>
      <li><span>Valor total</span><span id="ty-total">${money(p2.price)}</span></li>
      <li><span>Endereço de entrega</span><span id="ty-address">Endereço informado na etapa de entrega</span></li>
      <li><span>Prazo estimado de entrega</span><span>Até ${store.maxDeliveryDays} dias úteis</span></li>
    </ul>

    <div class="email-preview" aria-labelledby="email-prev-h">
      <div class="email-preview-head">
        <div id="email-prev-h"><strong>Confirmação enviada por e-mail</strong></div>
        <div><strong>Assunto:</strong> Seu pedido foi confirmado — entrega em até 15 dias úteis</div>
      </div>
      <p>Obrigado pela sua compra!</p>
      <p>Seu pedido foi confirmado com sucesso e já está sendo preparado para envio.</p>
      <p><strong>📦 INFORMAÇÕES DE ENTREGA</strong></p>
      <p>Seu produto será enviado para o endereço informado durante o checkout.</p>
      <p><strong>Prazo estimado de entrega:</strong><br>Até 15 dias úteis.</p>
      <p>Seu pedido será entregue diretamente no endereço informado no momento da compra.</p>
      <p>Acompanhe seu e-mail para receber eventuais atualizações sobre o envio.</p>
      <p>Obrigado por comprar conosco!</p>
      <p style="margin-bottom:0">Atenciosamente,<br><strong>Equipe de Suporte Hollowpaw</strong></p>
    </div>

    <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap">
      <a class="btn btn-primary" href="/">Voltar para o início</a>
      <a class="btn btn-outline" href="/contato">Falar com o atendimento</a>
    </div>
  </div>
</div>`;
}

function contentPages(store, products, money) {
  const p1 = products.product1 || Object.values(products)[0];
  const faqGroups = [
    ["Pedidos e Produtos", "produtos", [
      ["Qual é o preço das fantasias?", `Todas as três fantasias da coleção custam ${money(p1.price)} cada. Não trabalhamos com taxas ocultas nem descontos artificiais.`],
      ["As fantasias servem em gatos e cães pequenos?", "Sim! Nossos três modelos — Fantasia de Halloween Divertida para Pets, Roupa de freira para pet e A Aranha Felpuda — possuem ajuste prático projetado para gatos adultos e cães de pequeno porte."],
      ["As fantasias são confortáveis e seguras?", "Sim! Selecionamos modelagens leves que deixam o focinho e as patas livres. Recomendamos sempre supervisionar seu pet enquanto ele estiver vestindo qualquer fantasia."],
      ["O que vem incluído em cada produto?", "Na página de cada fantasia há a seção 'O que está incluído' listando exatamente cada item que vai na embalagem."]
    ]],
    ["Pagamento e Segurança", "pagamento", [
      ["Como funciona o pagamento?", "Todos os pedidos são processados em Reais (BRL) em ambiente seguro e criptografado."],
      ["É seguro comprar na Hollowpaw?", "Sim! Toda a finalização da compra utiliza conexão segura e criptografado para proteger seus dados pessoais."]
    ]],
    ["Envio, Entrega e Devoluções", "envio", [
      ["Qual é o prazo de entrega para o Brasil?", `Os pedidos são preparados e despachados em ${store.processingDaysMin} a ${store.processingDaysMax} dias úteis. A entrega estimada ocorre em ${store.shippingDaysBRMin} a ${store.shippingDaysBRMax} dias úteis após o envio (prazo total de até ${store.maxDeliveryDays} dias úteis).`],
      ["Receberei código de rastreamento?", "Sim! Assim que o pedido for despachado, enviaremos o código de rastreamento para o seu e-mail."],
      ["Como funciona a política de trocas e devoluções?", `Respeitamos integralmente o Código de Defesa do Consumidor (direito de arrependimento em até ${store.cdcReturnDays} dias corridos após o recebimento) e oferecemos até ${store.returnWindowDays} dias para solicitar troca ou devolução de produtos sem uso.`]
    ]]
  ];
  const allFaqLd = faqGroups.flatMap(([, , items]) => items);

  return [
    {
      slug: "about",
      cleanPath: "sobre",
      active: "about",
      title: "Sobre nós",
      intro: "Uma marca dedicada a criar momentos divertidos de Halloween para gatos e cães pequenos, com transparência em cada detalhe.",
      seoTitle: "Sobre Nós | Hollowpaw",
      seoDesc: "Conheça a Hollowpaw: fantasias de Halloween para gatos e cães pequenos com preço único de R$ 29,90.",
      body: `
<h2>Por que criamos a Hollowpaw</h2>
<p>Quem tem gato ou cachorro pequeno sabe como é difícil encontrar uma fantasia de Halloween que realmente vista bem, não incomode o animal e tenha informações claras. Muitas lojas mostram centenas de opções genéricas sem explicar como a peça funciona na prática.</p>
<p>Na <strong>Hollowpaw</strong>, decidimos fazer o oposto: selecionamos apenas três fantasias exclusivas — <em>Fantasia de Halloween Divertida para Pets</em>, <em>Roupa de freira para pet</em> e <em>A Aranha Felpuda</em> — e documentamos cada detalhe e material com clareza.</p>

<h2>Nosso compromisso com você e seu pet</h2>
<ul class="policy-summary">
  <li><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg><span><strong>Conforto em primeiro lugar:</strong> peças leves que não cobrem o focinho nem prendem os movimentos das patas.</span></li>
  <li><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg><span><strong>Preço único e transparente:</strong> qualquer fantasia da loja custa <strong>${money(p1.price)}</strong>, sem taxas surpresa.</span></li>
  <li><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg><span><strong>Atendimento humano em português:</strong> suporte ágil por e-mail para tirar dúvidas antes e depois da compra.</span></li>
</ul>

<div class="callout">
  <p>Quer falar com a nossa equipe? Envie uma mensagem na página de <a href="/contato">Contato</a> ou escreva diretamente para <a href="mailto:${store.supportEmail}">${store.supportEmail}</a>.</p>
</div>`
    },
    {
      slug: "faq",
      cleanPath: "faq",
      active: "faq",
      title: "Perguntas frequentes",
      intro: "Tire suas dúvidas sobre nossos produtos, prazos de entrega no Brasil e devoluções.",
      seoTitle: "Perguntas Frequentes (FAQ) | Hollowpaw",
      seoDesc: "Respostas para as dúvidas mais comuns sobre as fantasias para pets da Hollowpaw, frete e devoluções.",
      groups: faqGroups,
      faqLd: allFaqLd,
      scripts: ["/js/faq.js"],
      body: `
<div class="callout">
  <p>Não encontrou o que procurava? Fale com nosso atendimento na página de <a href="/contato">Contato</a> ou pelo e-mail <a href="mailto:${store.supportEmail}">${store.supportEmail}</a>.</p>
</div>`
    },
    {
      slug: "contact",
      cleanPath: "contato",
      active: "contact",
      wide: true,
      title: "Contato e Atendimento ao Cliente",
      intro: "Precisa de ajuda com seu pedido? Nossa equipe responde em até 1 dia útil.",
      seoTitle: "Contato e Atendimento ao Cliente | Hollowpaw",
      seoDesc: "Entre em contato com o atendimento ao cliente da Hollowpaw. Suporte em português por e-mail e formulário de contato.",
      body: `
<div class="contact-grid">
  <div class="contact-card">
    <h2>Canais de atendimento</h2>
    <p>Estamos à disposição para ajudar com dúvidas sobre produtos, envio e trocas.</p>
    <div class="contact-line">
      <svg class="icon" aria-hidden="true"><use href="#i-mail"/></svg>
      <div>
        <strong>E-mail de suporte</strong>
        <a href="mailto:${store.supportEmail}" data-support-email>${store.supportEmail}</a>
      </div>
    </div>
    <div class="contact-line">
      <svg class="icon" aria-hidden="true"><use href="#i-clock"/></svg>
      <div>
        <strong>Horário de atendimento</strong>
        <span>${store.supportHours}</span>
      </div>
    </div>
    <div class="contact-line">
      <svg class="icon" aria-hidden="true"><use href="#i-chat"/></svg>
      <div>
        <strong>Prazo de resposta</strong>
        <span>Respondemos ${store.responseTime}.</span>
      </div>
    </div>
  </div>

  <div class="contact-card">
    <h2>Envie uma mensagem</h2>
    <form data-contact-form novalidate>
      <div class="form-field">
        <label for="ct-name">Nome completo <span class="field-tag">(Obrigatório)</span></label>
        <input type="text" id="ct-name" name="name" placeholder="Digite seu nome completo" autocomplete="name" data-required>
        <div class="form-error">Informe seu nome completo.</div>
      </div>
      <div class="form-field">
        <label for="ct-email">E-mail <span class="field-tag">(Obrigatório)</span></label>
        <input type="email" id="ct-email" name="email" placeholder="Digite seu e-mail" autocomplete="email" data-required>
        <div class="form-error">Informe um e-mail válido.</div>
      </div>
      <div class="form-field">
        <label for="ct-order">Número do pedido <span class="field-tag">(Opcional)</span></label>
        <input type="text" id="ct-order" name="order" placeholder="Ex.: HP-849201 (Opcional)">
      </div>
      <div class="form-field">
        <label for="ct-msg">Mensagem <span class="field-tag">(Obrigatório)</span></label>
        <textarea id="ct-msg" name="message" placeholder="Como podemos ajudar você?" data-required></textarea>
        <div class="form-error">Por favor, escreva sua mensagem.</div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Enviar mensagem</button>
      <p class="form-status" data-form-status hidden></p>
    </form>
  </div>
</div>`
    },
    {
      slug: "shipping",
      cleanPath: "envio",
      active: "policies",
      title: "Política de Envio e Entrega",
      intro: "Informações claras sobre preparação do pedido, prazos de entrega para todo o Brasil e código de rastreamento.",
      seoTitle: "Política de Envio e Entrega | Hollowpaw",
      seoDesc: "Saiba como funciona o envio da Hollowpaw para todo o Brasil: prazos de preparação, entrega estimada e rastreamento.",
      body: `
<p class="meta">Última atualização: ${store.policyEffectiveDate}</p>
<ul class="policy-summary">
  <li><svg class="icon" aria-hidden="true"><use href="#i-package"/></svg><span><strong>Preparação do pedido:</strong> ${store.processingDaysMin} a ${store.processingDaysMax} dias úteis após a confirmação do pedido.</span></li>
  <li><svg class="icon" aria-hidden="true"><use href="#i-truck"/></svg><span><strong>Prazo estimado de entrega no Brasil:</strong> ${store.shippingDaysBRMin} a ${store.shippingDaysBRMax} dias úteis após o envio (prazo total de até ${store.maxDeliveryDays} dias úteis).</span></li>
  <li><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg><span><strong>Frete grátis:</strong> disponível para todas as regiões do Brasil nas compras pelo site.</span></li>
</ul>

<h2>1. Processamento e despacho</h2>
<p>Todos os pedidos são conferidos, embalados e despachados em até <strong>${store.processingDaysMin} a ${store.processingDaysMax} dias úteis</strong> (excluindo sábados, domingos e feriados) após a confirmação da compra.</p>

<h2>2. Prazo estimado de entrega</h2>
<p>Realizamos entregas em todo o território nacional (Brasil). Após a postagem, o prazo médio de trânsito é de <strong>${store.shippingDaysBRMin} a ${store.shippingDaysBRMax} dias úteis</strong>, podendo chegar a até <strong>${store.maxDeliveryDays} dias úteis</strong> dependendo da localidade.</p>

<h2>3. Acompanhamento e rastreio</h2>
<p>Assim que seu pedido for enviado, você receberá um e-mail com o código de rastreamento e as instruções para acompanhar cada etapa da entrega até o endereço cadastrado.</p>

<h2>4. Endereço incorreto ou ausência no recebimento</h2>
<p>Certifique-se de preencher corretamente o CEP, endereço, número e complemento. Caso perceba algum erro logo após o pedido, entre em contato imediatamente pelo e-mail <a href="mailto:${store.supportEmail}">${store.supportEmail}</a>.</p>`
    },
    {
      slug: "returns",
      cleanPath: "devolucoes",
      active: "policies",
      title: "Política de Trocas, Devoluções e Reembolso",
      intro: "Transparência e respeito ao Código de Defesa do Consumidor em todas as etapas da sua compra.",
      seoTitle: "Política de Trocas e Devoluções | Hollowpaw",
      seoDesc: "Conheça nossa política de trocas, devoluções e reembolsos em conformidade com o Código de Defesa do Consumidor brasileiro.",
      body: `
<p class="meta">Última atualização: ${store.policyEffectiveDate}</p>
<ul class="policy-summary">
  <li><svg class="icon" aria-hidden="true"><use href="#i-return"/></svg><span><strong>Direito de arrependimento (CDC):</strong> até ${store.cdcReturnDays} dias corridos após o recebimento para desistir da compra com reembolso integral.</span></li>
  <li><svg class="icon" aria-hidden="true"><use href="#i-shield"/></svg><span><strong>Prazo ampliado Hollowpaw:</strong> até ${store.returnWindowDays} dias corridos após a entrega para solicitar troca ou devolução de itens sem uso.</span></li>
  <li><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg><span><strong>Produto com defeito ou incorreto:</strong> reenvio sem custo ou reembolso total.</span></li>
</ul>

<h2>1. Condições para troca ou devolução</h2>
<p>Para solicitar a troca ou devolução, o produto deve estar sem sinais de uso, sem odores, não lavado e acompanhado de todos os acessórios e embalagem original.</p>

<h2>2. Como solicitar</h2>
<p>Envie um e-mail para <a href="mailto:${store.supportEmail}">${store.supportEmail}</a> informando o número do pedido, o nome completo e o motivo da solicitação. Nossa equipe responderá ${store.responseTime} com as instruções de postagem.</p>

<h2>3. Prazo e forma de reembolso</h2>
<p>Após o recebimento e conferência do item devolvido, o reembolso integral é processado pelo mesmo meio utilizado na compra em até 5 dias úteis.</p>`
    },
    {
      slug: "privacy",
      cleanPath: "privacidade",
      active: "policies",
      title: "Política de Privacidade (LGPD)",
      intro: "Como coletamos, utilizamos e protegemos seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).",
      seoTitle: "Política de Privacidade | Hollowpaw",
      seoDesc: "Política de Privacidade da Hollowpaw em conformidade com a LGPD brasileira.",
      body: `
<p class="meta">Vigência: ${store.policyEffectiveDate}</p>
<h2>1. Dados que coletamos</h2>
<p>Coletamos apenas as informações estritamente necessárias para processar e entregar o seu pedido com segurança:</p>
<ul>
  <li><strong>Dados cadastrais e de entrega:</strong> nome completo, e-mail, telefone e endereço postal completo.</li>
  <li><strong>Dados de navegação:</strong> endereço IP, tipo de dispositivo e parâmetros de campanha (UTM) para melhoria da experiência na loja.</li>
</ul>

<h2>2. Finalidade do uso dos dados</h2>
<p>Utilizamos seus dados exclusivamente para: processar e enviar seu pedido, enviar a confirmação e atualizações de entrega por e-mail, prestar atendimento ao cliente e cumprir obrigações legais no Brasil.</p>

<h2>3. Seus direitos segundo a LGPD</h2>
<p>A qualquer momento, você pode solicitar a confirmação de tratamento, acesso, correção ou exclusão dos seus dados pessoais enviando um e-mail para <a href="mailto:${store.supportEmail}">${store.supportEmail}</a>.</p>`
    },
    {
      slug: "terms",
      cleanPath: "termos",
      active: "policies",
      title: "Termos de Uso",
      intro: "Condições gerais de navegação, compra e utilização da loja Hollowpaw.",
      seoTitle: "Termos de Uso | Hollowpaw",
      seoDesc: "Leia os Termos de Uso e condições de compra da loja Hollowpaw Brasil.",
      body: `
<p class="meta">Vigência: ${store.policyEffectiveDate}</p>
<h2>1. Objeto</h2>
<p>Estes Termos de Uso regulam o acesso e as compras realizadas no site da <strong>${store.legalName}</strong>. Ao realizar um pedido, o cliente declara ter lido e concordado com estas condições e com nossas políticas de envio, trocas e privacidade.</p>

<h2>2. Produtos e preços</h2>
<p>Todos os preços exibidos no site estão em <strong>Reais (BRL)</strong>. O valor vigente de cada fantasia é de <strong>${money(p1.price)}</strong>.</p>

<h2>3. Uso seguro das fantasias para pets</h2>
<p>Nossas fantasias são itens recreativos para uso supervisionado em gatos e cães pequenos. Nunca deixe seu pet desacompanhado vestindo fantasias ou acessórios e retire a peça imediatamente caso note qualquer desconforto.</p>

<h2>4. Legislação aplicável</h2>
<p>Estes Termos são regidos pelas ${store.governingLaw}, incluindo o Código de Defesa do Consumidor (Lei nº 8.078/1990).</p>`
    },
    {
      slug: "policies",
      cleanPath: "politicas",
      active: "policies",
      title: "Políticas da Loja",
      intro: "Acesse rapidamente todas as nossas políticas de envio, devoluções, privacidade e termos de uso.",
      seoTitle: "Políticas da Loja | Hollowpaw",
      seoDesc: "Central de políticas da Hollowpaw: Política de Envio, Trocas e Devoluções, Privacidade (LGPD) e Termos de Uso.",
      body: `
<ul class="policy-summary">
  <li><svg class="icon" aria-hidden="true"><use href="#i-truck"/></svg><div><strong><a href="/envio">Política de Envio e Entrega</a></strong><br>Preparação em ${store.processingDaysMin} a ${store.processingDaysMax} dias úteis, frete grátis e entrega em até ${store.maxDeliveryDays} dias úteis em todo o Brasil.</div></li>
  <li><svg class="icon" aria-hidden="true"><use href="#i-return"/></svg><div><strong><a href="/devolucoes">Política de Trocas, Devoluções e Reembolso</a></strong><br>Direito de arrependimento do CDC (${store.cdcReturnDays} dias) e garantia de até ${store.returnWindowDays} dias para itens sem uso.</div></li>
  <li><svg class="icon" aria-hidden="true"><use href="#i-lock"/></svg><div><strong><a href="/privacidade">Política de Privacidade (LGPD)</a></strong><br>Como protegemos seus dados pessoais e de entrega.</div></li>
  <li><svg class="icon" aria-hidden="true"><use href="#i-file"/></svg><div><strong><a href="/termos">Termos de Uso</a></strong><br>Regras gerais de compra, preços em Reais (BRL) e orientações de uso seguro para o seu pet.</div></li>
</ul>`
    },
    {
      slug: "informacoes-entrega",
      cleanPath: "informacoes-entrega",
      active: "shop",
      wide: true,
      noindex: true,
      title: "Informações de entrega",
      intro: "Preencha seus dados para continuar com seu pedido.",
      seoTitle: "Informações de Entrega | Hollowpaw",
      seoDesc: "Preencha seus dados de entrega para continuar com seu pedido na Hollowpaw.",
      scripts: ["/js/delivery.js"],
      body: deliveryInfoBody(store, products, money)
    },
    {
      slug: "checkout",
      cleanPath: null,
      active: "shop",
      wide: true,
      noindex: true,
      title: "Informações de entrega",
      intro: "Preencha seus dados para continuar com seu pedido.",
      seoTitle: "Informações de Entrega | Hollowpaw",
      seoDesc: "Preencha seus dados de entrega para continuar com seu pedido na Hollowpaw.",
      scripts: ["/js/delivery.js"],
      body: deliveryInfoBody(store, products, money)
    },
    {
      slug: "thank-you",
      cleanPath: "obrigado",
      active: "",
      wide: true,
      noindex: true,
      bodyAttrs: ' data-page="thank-you"',
      title: "Pedido confirmado",
      intro: "Seu pedido foi confirmado e já está em preparação.",
      seoTitle: "Pedido Confirmado | Hollowpaw",
      seoDesc: "Confirmação do seu pedido na Hollowpaw.",
      scripts: ["/js/checkout.js"],
      body: thankYouBody(store, products, money)
    }
  ];
}

module.exports = {
  HOME_WHY,
  STORY,
  homeConfidence,
  homeFaq,
  contentPages
};
