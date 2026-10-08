/* ==========================================================================
   HOLLOWPAW — CONFIGURAÇÃO CENTRAL DE PRODUTOS (FONTE ÚNICA DA VERDADE)
   ==========================================================================
   COMO ADICIONAR UM NOVO PRODUTO (EX.: PRODUTO 4):
   1. Coloque as imagens em: /public/assets/products/<slug-do-produto>/
   2. Adicione um novo bloco em window.PRODUCTS abaixo (ex.: "product4": { ... })
   3. Execute `npm run build` (no Vercel isso ocorre automaticamente no git push).
      O script de build criará automaticamente a página /produto/<slug>, atualizará
      a Home, o menu, o rodapé, os cards relacionados e o sitemap.xml.
   ========================================================================== */
(function (root) {
  "use strict";

  var PRODUCTS = {
    product1: {
      id: "product1",
      sku: "HP-RIDER-01",
      slug: "headless-rider",
      legacySlugs: ["product-1"],
      url: "/produto/headless-rider",
      name: "Fantasia de Halloween Divertida para Pets",
      subtitle: "Fantasia de Peitoral com Guia para Gatos e Cães Pequenos",
      price: 29.90,
      currency: "BRL",
      category: "Fantasia para Pets",
      shortDescription: "Um pequeno cavaleiro sem cabeça cavalga nas costas do seu pet, segurando uma abóbora de Halloween. Fixado em um peitoral ajustável com guia, não cobre a cabeça, o rosto nem as patas.",
      mainImage: "/assets/products/headless-rider/headless-rider-1.webp",
      images: [
        { src: "/assets/products/headless-rider/headless-rider-1", alt: "Gato branco caminhando em piso de madeira usando a Fantasia de Halloween Divertida para Pets segurando uma abóbora de Halloween" },
        { src: "/assets/products/headless-rider/headless-rider-2", alt: "Gato creme usando a Fantasia de Halloween Divertida para Pets cercado por abóboras esculpidas e velas" },
        { src: "/assets/products/headless-rider/headless-rider-3", alt: "Detalhes das peças da Fantasia de Halloween Divertida para Pets: peitoral e guia em fita de nylon resistente, boneco em PLA liso e pingente de abóbora fosco" },
        { src: "/assets/products/headless-rider/headless-rider-4", alt: "Fantasia de Halloween Divertida para Pets com fivelas ajustáveis do peitoral e pingente de abóbora sobre uma mesa" },
        { src: "/assets/products/headless-rider/headless-rider-5", alt: "Gato laranja com guia usando a Fantasia de Halloween Divertida para Pets em uma feira de Halloween ao ar livre" },
        { src: "/assets/products/headless-rider/headless-rider-6", alt: "Dimensões da Fantasia de Halloween Divertida para Pets: 15 cm de altura, 12,7 cm de comprimento e 11,4 cm de largura" }
      ],
      externalCheckoutUrl: "https://pagseguropix.org/c/fantasia-halloween-divertida-pets",
      tracking: {
        contentId: "HP-RIDER-01",
        contentType: "product",
        contentName: "Fantasia de Halloween Divertida para Pets",
        value: 29.90,
        currency: "BRL"
      },
      seo: {
        title: "Fantasia de Halloween Divertida para Pets | Hollowpaw",
        description: "Fantasia de Halloween Divertida para Pets para gatos e cães pequenos. Acompanha guia em nylon e pingente de abóbora por R$ 29,90.",
        ogImage: "/assets/products/headless-rider/headless-rider-1.webp"
      },
      details: {
        badge: "Mais vendido",
        kicker: "Fantasia de peitoral com guia · Ajuste regulável",
        benefitsTitle: "Por que você vai amar",
        benefits: [
          ["paw", "Rosto e patas 100% livres", "Diferente de roupinhas fechadas, nada cobre a cabeça, as orelhas ou as patas do seu pet."],
          ["sliders", "Peitoral regulável com guia inclusa", "Fitas em nylon resistente com fivelas de ajuste rápido e guia combinando para passeios e fotos."],
          ["camera", "Ilusão divertida em movimento", "Conforme o seu pet caminha, o cavaleiro segurando a abóbora parece cavalgar de verdade."],
          ["sparkles", "Acabamento leve e detalhado", "Boneco moldado em PLA liso com pingente de abóbora em acabamento fosco."]
        ],
        howTitle: "Como vestir em 3 passos",
        how: [
          ["Ajuste as fivelas", "Solte levemente as tiras de nylon antes de posicionar a sela sobre o dorso do seu pet."],
          ["Feche no pescoço e no peito", "Prenda as fivelas deixando espaço para passar dois dedos entre a tira e o pelo, garantindo conforto."],
          ["Conecte a guia e aproveite", "Prenda a guia inclusa na argola metálica e registre as melhores fotos de Halloween."]
        ],
        honestNote: "<strong>Nota de transparência:</strong> O boneco do cavaleiro (15 cm de altura) é feito em PLA leve e firme. Recomendamos ajustar o peitoral para que fique rente ao dorso do pet, evitando que incline para os lados durante a caminhada.",
        specs: [
          ["Produto", "Fantasia de Halloween Divertida para Pets"],
          ["Material do peitoral", "Fita de nylon resistente ao desgaste"],
          ["Material do boneco", "PLA liso com pingente de abóbora fosco"],
          ["Dimensões do cavaleiro", "15 cm (altura) × 12,7 cm (comp.) × 11,4 cm (larg.)"],
          ["Ajuste", "Peitoral com fivelas reguláveis no pescoço e tórax"],
          ["Indicação", "Gatos e cães de pequeno porte"]
        ],
        included: [
          "1× Fantasia de Halloween Divertida para Pets (15 cm de altura)",
          "1× Pingente de abóbora de Halloween fosco",
          "1× Peitoral ajustável em fita de nylon",
          "1× Guia em fita de nylon combinando"
        ],
        includedNote: "Tudo o que você precisa para vestir e fotografar já vem na embalagem.",
        dimensionsInfo: "<p>Esta fantasia possui <strong>peitoral ajustável</strong> por fivelas nas tiras de nylon, indicado para gatos adultos e cães de pequeno porte.</p><div class=\"table-wrap\"><table class=\"spec-table\"><thead><tr><th>Componente</th><th>Medida</th></tr></thead><tbody><tr><td>Altura do cavaleiro</td><td>15 cm</td></tr><tr><td>Comprimento da base</td><td>12,7 cm</td></tr><tr><td>Largura da sela</td><td>11,4 cm</td></tr><tr><td>Ajuste do peitoral</td><td>Tiras reguláveis por fivela (pescoço e tórax)</td></tr></tbody></table></div><p class=\"fine\">Dica: confira o dorso do seu pet para confirmar que a sela de 12,7 cm acomoda-se confortavelmente nas costas.</p>",
        care: "<p>Limpe o boneco e o pingente com pano macio levemente umedecido. As tiras de nylon podem ser lavadas à mão com água fria e sabão neutro. Sempre supervisione seu pet durante o uso da fantasia.</p>",
        faq: [
          ["Serve em gatos e cães pequenos?", "Sim! O peitoral possui fivelas reguláveis projetadas para gatos adultos e cães de pequeno porte."],
          ["O boneco incomoda o pet ao andar?", "O boneco é fabricado em PLA leve e apoia-se sobre a sela do peitoral, deixando as patas, o pescoço e a cabeça totalmente livres."],
          ["A guia vem incluída?", "Sim, o kit acompanha o peitoral ajustável, a guia de nylon, o cavaleiro e o pingente de abóbora."]
        ],
        finalTitle: "Pronto para as fotos de Halloween?",
        homeHighlight: {
          text: "Um cavaleiro sem cabeça segurando uma abóbora de Halloween nas costas do seu gato ou cão pequeno. Vem montado em peitoral ajustável com guia.",
          bullets: [
            "Nada cobre o rosto, as orelhas ou as patas",
            "Boneco de 15 cm + pingente de abóbora fosco",
            "Acompanha peitoral regulável e guia de nylon"
          ],
          img: 0
        }
      }
    },

    product2: {
      id: "product2",
      sku: "HP-HABIT-01",
      slug: "fantasia-freira",
      legacySlugs: ["product-2", "holy-habit"],
      url: "/produto/fantasia-freira",
      name: "Roupa de freira para pet",
      subtitle: "Fantasia com Capuz e Capa para Gatos e Cães Pequenos",
      price: 29.90,
      currency: "BRL",
      category: "Fantasia para Pets",
      shortDescription: "Roupa de freira para pet preta e branca com capuz e cruz bordada no peitilho. Capuz, peitilho e capa são costurados em uma única peça leve, super fácil de vestir.",
      mainImage: "/assets/products/holy-habit/holy-habit-1.webp",
      images: [
        { src: "/assets/products/holy-habit/holy-habit-1", alt: "Gato Ragdoll sentado usando a Roupa de freira para pet preta e branca com capuz e cruz no peitilho" },
        { src: "/assets/products/holy-habit/holy-habit-2", alt: "Lulu da Pomerânia branco usando a Roupa de freira para pet com capuz e capa preta" },
        { src: "/assets/products/holy-habit/holy-habit-3", alt: "Roupa de freira para pet aberta mostrando a abertura branca do capuz, peitilho com cruz e capa preta" },
        { src: "/assets/products/holy-habit/holy-habit-4", alt: "Detalhe aproximado da abertura do capuz e da cruz costurada na Roupa de freira para pet" },
        { src: "/assets/products/holy-habit/holy-habit-5", alt: "Tabela informativa de medidas da Roupa de freira para pet em centímetros" },
        { src: "/assets/products/holy-habit/holy-habit-6", alt: "Roupa de freira para pet em fundo branco" }
      ],
      externalCheckoutUrl: "https://pagseguropix.org/c/offer-2-prod-2",
      tracking: {
        contentId: "HP-HABIT-01",
        contentType: "product",
        contentName: "Roupa de freira para pet",
        value: 29.90,
        currency: "BRL"
      },
      seo: {
        title: "Roupa de freira para pet – Fantasia para Gatos e Cães | Hollowpaw",
        description: "Roupa de freira para pet com capuz branco, capa preta e cruz no peitilho para gatos e cães pequenos por R$ 29,90.",
        ogImage: "/assets/products/holy-habit/holy-habit-1.webp"
      },
      details: {
        badge: "Favorito nas fotos",
        kicker: "Capa com capuz em peça única · Tecido leve e macio",
        benefitsTitle: "Por que você vai amar",
        benefits: [
          ["sparkles", "Peça única fácil de vestir", "Capuz, peitilho com cruz e capa preta são costurados juntos — sem peças soltas para perder."],
          ["heart", "Tecido leve e macio", "Confeccionado em poliéster leve que não pesa e permite que o pet se sente ou caminhe livremente."],
          ["camera", "Visual icônico para fotos", "O contraste preto e branco com a cruz no peitilho cria fotos inesquecíveis em segundos."],
          ["ruler", "Caimento confortável", "Modelagem pensada para gatos e cães de pequeno porte, sem mangas que prendam as patas."]
        ],
        howTitle: "Como vestir em segundos",
        how: [
          ["Vista pelo pescoço", "Passe a abertura suavemente pelo pescoço do seu pet, deixando o peitilho com a cruz voltado para a frente."],
          ["Ajeite o capuz", "Posicione a aba branca do capuz ao redor da cabeça (ou deixe-o abaixado nos ombros se o pet preferir)."],
          ["Hora da foto", "Alinhe a capa preta sobre as costas e aproveite o visual!"]
        ],
        honestNote: "<strong>Nota de transparência:</strong> A Roupa de freira para pet possui modelagem em capa que deixa as quatro patas livres. Confira as dimensões informativas abaixo para conhecer o caimento.",
        specs: [
          ["Produto", "Roupa de freira para pet"],
          ["Modelo", "Capa com capuz e peitilho com cruz"],
          ["Material", "Tecido de poliéster macio e leve"],
          ["Cores", "Preto e branco"],
          ["Fechamento", "Ajuste prático e confortável no pescoço"],
          ["Cuidados", "Lavagem à mão com água fria; secar à sombra"]
        ],
        included: [
          "1× Roupa de freira para pet (capuz, peitilho com cruz e capa em peça única)"
        ],
        includedNote: "Peça única pronta para vestir — não requer montagem.",
        dimensionsInfo: "<p>Confira abaixo as dimensões de referência da <strong>Roupa de freira para pet</strong> (em centímetros):</p><div class=\"table-wrap\"><table class=\"spec-table\"><thead><tr><th>Medida da peça</th><th>Dimensão de referência</th></tr></thead><tbody><tr><td>Comprimento da capa</td><td>31 a 40 cm</td></tr><tr><td>Abertura do capuz (rosto)</td><td>30 a 40 cm</td></tr><tr><td>Circunferência do pescoço</td><td>36 a 43 cm</td></tr></tbody></table></div>",
        care: "<p>Lave à mão em água fria com sabão neutro e deixe secar à sombra. Não utilize alvejante ou secadora. Supervisione seu pet enquanto estiver vestindo a peça.</p>",
        faq: [
          ["O capuz precisa ficar na cabeça o tempo todo?", "Não! Você pode posicionar o capuz apenas na hora da foto e deixá-lo apoiado atrás da cabeça no restante do tempo."],
          ["A Roupa de freira para pet prende as patas?", "Não, ela funciona como uma capa sobre os ombros e o peito, deixando as quatro patas totalmente livres."],
          ["Como devo lavar a peça?", "Recomendamos lavar à mão com água fria e sabão neutro, secando à sombra para preservar o tecido."]
        ],
        finalTitle: "Garanta a Roupa de freira para pet para o Halloween",
        homeHighlight: {
          text: "Roupa de freira para pet preta e branca com capuz e cruz costurada no peitilho. Tudo em uma única peça leve, sem mangas para prender as patas.",
          bullets: [
            "Peça única: capuz, peitilho e capa integrados",
            "Patas totalmente livres para caminhar e sentar",
            "Tecido leve e confortável para fotos"
          ],
          img: 0
        }
      }
    },

    product3: {
      id: "product3",
      sku: "HP-SPIDER-01",
      slug: "creepy-crawler",
      legacySlugs: ["product-3", "aranha-felpuda"],
      url: "/produto/creepy-crawler",
      name: "A Aranha Felpuda",
      subtitle: "Fantasia de Aranha de Pelúcia para Gatos e Cães",
      price: 29.90,
      currency: "BRL",
      category: "Fantasia para Pets",
      shortDescription: "Oito patas longas e felpudas em um corpo de feltro leve. Apoia nas costas do seu pet e prende com tiras de velcro ajustáveis no pescoço e no peito.",
      mainImage: "/assets/products/creepy-crawler/creepy-crawler-1.webp",
      images: [
        { src: "/assets/products/creepy-crawler/creepy-crawler-1", alt: "Poodle caramelo deitado usando a fantasia de pelúcia preta A Aranha Felpuda" },
        { src: "/assets/products/creepy-crawler/creepy-crawler-2", alt: "Gato cinza e branco sentado usando a fantasia A Aranha Felpuda com oito patas de pelúcia" },
        { src: "/assets/products/creepy-crawler/creepy-crawler-3", alt: "Detalhes da fantasia A Aranha Felpuda: corpo em feltro de 3 mm, patas de pelúcia longa e tiras de velcro ajustáveis no pescoço e peito" },
        { src: "/assets/products/creepy-crawler/creepy-crawler-4", alt: "Tabela informativa de medidas da fantasia A Aranha Felpuda em centímetros" },
        { src: "/assets/products/creepy-crawler/creepy-crawler-5", alt: "Fantasia A Aranha Felpuda em fundo branco" }
      ],
      externalCheckoutUrl: "https://pagseguropix.org/c/fantasia-de-aranha-para-caes-e-gatos-halloween",
      tracking: {
        contentId: "HP-SPIDER-01",
        contentType: "product",
        contentName: "A Aranha Felpuda",
        value: 29.90,
        currency: "BRL"
      },
      seo: {
        title: "A Aranha Felpuda – Fantasia de Aranha para Gatos e Cães | Hollowpaw",
        description: "Fantasia A Aranha Felpuda com 8 patas de pelúcia longa e corpo em feltro de 3 mm. Velcro ajustável no pescoço e peito por R$ 29,90.",
        ogImage: "/assets/products/creepy-crawler/creepy-crawler-1.webp"
      },
      details: {
        badge: "Clássico de Halloween",
        kicker: "Oito patas de pelúcia · Tiras ajustáveis em velcro",
        benefitsTitle: "Por que você vai amar",
        benefits: [
          ["sparkles", "Oito patas de pelúcia longa", "Patas felpudas que criam uma silhueta de aranha divertida e marcante de qualquer ângulo."],
          ["heart", "Base em feltro leve de 3 mm", "Estrutura leve que apoia nas costas do pet sem aquecer demais nem limitar os movimentos."],
          ["sliders", "Fecho em velcro no pescoço e peito", "Duas tiras com velcro ajustável para vestir e tirar em poucos segundos."],
          ["ruler", "Ajuste versátil", "Adapta-se com facilidade ao pescoço e ao tórax de gatos e cães pequenos."]
        ],
        howTitle: "Como vestir e moldar as patas",
        how: [
          ["Apoie nas costas", "Coloque a base de feltro de 3 mm centralizada sobre as costas do seu pet."],
          ["Feche o velcro no pescoço e peito", "Ajuste as duas tiras de velcro confortavelmente, sem apertar."],
          ["Abra as 8 patas", "Posicione as patas de pelúcia para os lados para destacar o visual de aranha!"]
        ],
        honestNote: "<strong>Nota de transparência:</strong> As patas de pelúcia possuem pelinhos longos que podem vir achatados da embalagem. Basta sacudir levemente e abrir as patas com as mãos para dar volume total.",
        specs: [
          ["Modelo", "Fantasia dorsal de aranha com 8 patas"],
          ["Material da base", "Feltro estruturado de 3 mm"],
          ["Material das patas", "Pelúcia preta de pelo longo"],
          ["Fixação", "Tiras de velcro ajustáveis no pescoço e no peito"],
          ["Indicação", "Gatos e cães de pequeno porte"],
          ["Cuidados", "Limpeza local com pano úmido; escovar os pelos se necessário"]
        ],
        included: [
          "1× Fantasia A Aranha Felpuda com 8 patas de pelúcia integradas e tiras de velcro"
        ],
        includedNote: "Pronta para usar assim que sair da embalagem.",
        dimensionsInfo: "<p>Confira as dimensões informativas da <strong>Aranha Felpuda</strong> (em centímetros):</p><div class=\"table-wrap\"><table class=\"spec-table\"><thead><tr><th>Medida</th><th>Dimensão de referência</th></tr></thead><tbody><tr><td>Circunferência do pescoço</td><td>Ajustável de 20 a 40 cm</td></tr><tr><td>Circunferência do peito</td><td>Ajustável de 32 a 55 cm</td></tr><tr><td>Envergadura das patas</td><td>60 a 78 cm</td></tr></tbody></table></div>",
        care: "<p>Limpe apenas com um pano levemente úmido e deixe secar ao ar livre. Não lave na máquina. Sempre supervisione seu pet enquanto estiver usando a fantasia.</p>",
        faq: [
          ["As patas pesam nas costas do pet?", "Não! A base é feita em feltro leve de 3 mm e as patas são de pelúcia macia, pesando muito pouco."],
          ["Serve tanto para gatos quanto para cães?", "Sim! As tiras de velcro no pescoço e no peito permitem ajustar a peça em gatos adultos e cães de pequeno porte."],
          ["É fácil de tirar se meu pet cansar?", "Muito fácil: são apenas duas tiras de velcro (pescoço e peito) que se abrem instantaneamente."]
        ],
        finalTitle: "Transforme seu pet na Aranha Felpuda",
        homeHighlight: {
          text: "Oito patas compridas de pelúcia preta em uma base leve de feltro de 3 mm. Prende em segundos com velcro no pescoço e no peito.",
          bullets: [
            "Patas de pelúcia longa com ótimo efeito nas fotos",
            "Fechamento rápido em velcro no pescoço e peito",
            "Material super leve que não incomoda o pet"
          ],
          img: 1
        }
      }
    }
  };

  /* Helper para resolver qualquer produto por ID (product1), slug (headless-rider),
     legacySlug (product-1) ou SKU (HP-RIDER-01) */
  function findProduct(keyOrSlug) {
    if (!keyOrSlug) return null;
    if (typeof keyOrSlug === "object") return keyOrSlug;
    var q = String(keyOrSlug).trim();
    if (PRODUCTS[q]) return PRODUCTS[q];
    var lower = q.toLowerCase();
    var keys = Object.keys(PRODUCTS);
    for (var i = 0; i < keys.length; i++) {
      var p = PRODUCTS[keys[i]];
      if (
        p.id.toLowerCase() === lower ||
        (p.slug && p.slug.toLowerCase() === lower) ||
        (p.sku && p.sku.toLowerCase() === lower) ||
        (Array.isArray(p.legacySlugs) && p.legacySlugs.some(function (s) { return s.toLowerCase() === lower; }))
      ) {
        return p;
      }
    }
    return null;
  }

  root.PRODUCTS = PRODUCTS;
  root.findProduct = findProduct;

  if (typeof Intl !== "undefined") {
    root.BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    root.formatPrice = function (value) {
      return root.BRL_FORMATTER.format(Number(value)).replace(/\u00a0/g, " ");
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { PRODUCTS: PRODUCTS, findProduct: findProduct };
  }
})(typeof window !== "undefined" ? window : globalThis);
