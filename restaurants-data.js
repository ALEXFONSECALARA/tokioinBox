/**
 * ============================================================
 *  restaurants-data.js
 * ------------------------------------------------------------
 *  Fonte única de verdade (single source of truth) para o
 *  cardápio digital multi-marca.
 *
 *  Para adicionar um 5º restaurante (ou trocar qualquer um
 *  destes por dados reais), basta:
 *    1. Duplicar um objeto dentro de `restaurants`.
 *    2. Trocar id, name, theme, whatsapp, categories e products.
 *    3. Acessar com index.html?rest=SEU_ID
 *
 *  Nenhum outro arquivo precisa ser tocado — script.js lê
 *  tudo daqui dinamicamente.
 * ============================================================
 */

const RESTAURANTS_DATA = {

  // id do restaurante usado quando nenhum ?rest= é passado na URL
  defaultRestaurant: "tokio",

  restaurants: [

    /* ============================================================
     * 1) SHOGATSU TOKIO — Culinária Japonesa
     * ============================================================ */
    {
      id: "tokio",
      name: "Shogatsu Tokio",
      tagline: "Sushi & cozinha japonesa autêntica",
      logoText: "ST",
      logoEmoji: "🍣",
      theme: {
        primary: "#B4223C",     // vermelho laca (hanko)
        primaryDark: "#8A1830",
        secondary: "#1C1C1E",   // preto sumiê
        accent: "#D9A441",      // dourado fosco
        background: "#FAF8F5",
        surface: "#FFFFFF",
        text: "#1C1C1E",
        textMuted: "#6B6B6E"
      },
      whatsapp: "5511987654321",
      address: "Av. das Cerejeiras, 120 — Vila Mariana, São Paulo/SP",
      deliveryTime: "35–50 min",
      minOrder: 30,
      hours: {
        text: "Ter a Dom, 18h às 23h30",
        // 0=Dom ... 6=Sáb — usado para calcular aberto/fechado em tempo real
        schedule: { 0: [18, 23.5], 2: [18, 23.5], 3: [18, 23.5], 4: [18, 23.5], 5: [18, 23.5], 6: [18, 23.5] }
      },
      social: { instagram: "@shogatsutokio", facebook: "shogatsutokio" },
      about: "Desde 2011 servindo peixe fresco selecionado diariamente e receitas de família trazidas de Osaka. Nosso itamae prepara cada corte na hora, sem pressa — sushi é ritual, não fast-food.",
      categories: [
        { id: "entradas", name: "Entradas" },
        { id: "sushi", name: "Sushis & Sashimis" },
        { id: "quentes", name: "Pratos Quentes" },
        { id: "bebidas", name: "Bebidas" },
        { id: "sobremesas", name: "Sobremesas" }
      ],
      products: [
        { id: "tk-01", categoryId: "entradas", name: "Edamame", description: "Vagens de soja cozidas no vapor com flor de sal.", price: 18.0, emoji: "🫛", featured: false },
        { id: "tk-02", categoryId: "entradas", name: "Gyoza (5un)", description: "Pastéis japoneses recheados de porco e repolho, selados na chapa.", price: 26.0, emoji: "🥟", featured: true },
        { id: "tk-03", categoryId: "entradas", name: "Harumaki de Legumes", description: "Rolinho primavera crocante com molho agridoce.", price: 22.0, emoji: "🥢", featured: false },
        { id: "tk-04", categoryId: "sushi", name: "Combinado Tokio (20 peças)", description: "Seleção do chef: sashimi de salmão e atum, niguiri e uramaki especial.", price: 89.0, emoji: "🍣", featured: true },
        { id: "tk-05", categoryId: "sushi", name: "Sashimi de Salmão (10 fatias)", description: "Salmão fresco cortado na hora, servido com gengibre e wasabi.", price: 48.0, emoji: "🍣", featured: false },
        { id: "tk-06", categoryId: "sushi", name: "Uramaki Philadelphia (8un)", description: "Salmão, cream cheese e cebolinha, empanado em gergelim.", price: 32.0, emoji: "🍱", featured: false },
        { id: "tk-07", categoryId: "quentes", name: "Yakisoba de Frango", description: "Macarrão oriental salteado com legumes e frango grelhado.", price: 38.0, emoji: "🍜", featured: true },
        { id: "tk-08", categoryId: "quentes", name: "Teppan de Camarão", description: "Camarões grelhados na chapa com legumes e arroz japonês.", price: 52.0, emoji: "🍤", featured: false },
        { id: "tk-09", categoryId: "bebidas", name: "Chá Verde Gelado", description: "Chá verde japonês servido gelado, sem açúcar.", price: 9.0, emoji: "🍵", featured: false },
        { id: "tk-10", categoryId: "bebidas", name: "Ramune Original", description: "Refrigerante japonês com garrafa de bolinha.", price: 14.0, emoji: "🥤", featured: false },
        { id: "tk-11", categoryId: "sobremesas", name: "Mochi Sortido (3un)", description: "Massa de arroz doce recheada de morango, doce de leite e chá verde.", price: 19.0, emoji: "🍡", featured: true },
        { id: "tk-12", categoryId: "sobremesas", name: "Cheesecake de Yuzu", description: "Cheesecake leve com calda de limão japonês.", price: 24.0, emoji: "🍰", featured: false }
      ]
    },

    /* ============================================================
     * 2) TRATTORIA BELLA VITA — Culinária Italiana
     * ============================================================ */
    {
      id: "italia",
      name: "Trattoria Bella Vita",
      tagline: "Massas artesanais e receitas de família",
      logoText: "BV",
      logoEmoji: "🍝",
      theme: {
        primary: "#2F6E4F",     // verde manjericão
        primaryDark: "#1F4D37",
        secondary: "#7A2E2E",   // vinho tinto
        accent: "#E8C46B",      // amarelo massa fresca
        background: "#F8F6F1",
        surface: "#FFFFFF",
        text: "#2A2420",
        textMuted: "#736A61"
      },
      whatsapp: "5511976543210",
      address: "Rua Bela Cintra, 845 — Jardins, São Paulo/SP",
      deliveryTime: "40–55 min",
      minOrder: 35,
      hours: {
        text: "Todos os dias, 12h às 15h e 19h às 23h",
        schedule: { 0: [12, 23], 1: [12, 23], 2: [12, 23], 3: [12, 23], 4: [12, 23], 5: [12, 23], 6: [12, 23] }
      },
      social: { instagram: "@bellavitatrattoria", facebook: "bellavitatrattoria" },
      about: "Fundada por Nonna Lucia em 1998, a Bella Vita mantém viva a tradição das massas feitas à mão todos os dias e do molho de tomate que cozinha por seis horas, como na Toscana.",
      categories: [
        { id: "antipasti", name: "Antipasti" },
        { id: "massas", name: "Massas" },
        { id: "pizzas", name: "Pizzas" },
        { id: "bebidas", name: "Bebidas" },
        { id: "sobremesas", name: "Sobremesas" }
      ],
      products: [
        { id: "it-01", categoryId: "antipasti", name: "Bruschetta Pomodoro", description: "Pão italiano tostado com tomate confit, manjericão e azeite.", price: 24.0, emoji: "🍅", featured: false },
        { id: "it-02", categoryId: "antipasti", name: "Tábua de Frios", description: "Presunto parma, salame, provolone e azeitonas.", price: 46.0, emoji: "🧀", featured: true },
        { id: "it-03", categoryId: "massas", name: "Fettuccine ao Sugo", description: "Massa fresca com molho de tomate italiano cozido lentamente.", price: 42.0, emoji: "🍝", featured: true },
        { id: "it-04", categoryId: "massas", name: "Nhoque à Bolonhesa", description: "Nhoque de batata artesanal com ragu de carne.", price: 46.0, emoji: "🍝", featured: false },
        { id: "it-05", categoryId: "massas", name: "Risoto de Funghi", description: "Arroz arbóreo cremoso com mix de cogumelos e parmesão.", price: 54.0, emoji: "🍚", featured: false },
        { id: "it-06", categoryId: "pizzas", name: "Pizza Margherita", description: "Molho de tomate, mussarela de búfala e manjericão fresco.", price: 49.0, emoji: "🍕", featured: true },
        { id: "it-07", categoryId: "pizzas", name: "Pizza Quattro Formaggi", description: "Mussarela, gorgonzola, parmesão e provolone.", price: 56.0, emoji: "🍕", featured: false },
        { id: "it-08", categoryId: "bebidas", name: "Suco de Laranja Natural", description: "Laranja espremida na hora.", price: 12.0, emoji: "🍊", featured: false },
        { id: "it-09", categoryId: "bebidas", name: "Água com Gás", description: "500ml gelada.", price: 7.0, emoji: "💧", featured: false },
        { id: "it-10", categoryId: "sobremesas", name: "Tiramisù", description: "Camadas de biscoito champagne, café e mascarpone.", price: 26.0, emoji: "☕", featured: true },
        { id: "it-11", categoryId: "sobremesas", name: "Panna Cotta de Frutas Vermelhas", description: "Creme italiano com calda artesanal de frutas vermelhas.", price: 22.0, emoji: "🍮", featured: false }
      ]
    },

    /* ============================================================
     * 3) PRAYA BURGER CO. — Hamburgueria Artesanal
     * ============================================================ */
    {
      id: "praya",
      name: "Praya Burger Co.",
      tagline: "Burgers artesanais e batatas rústicas",
      logoText: "PB",
      logoEmoji: "🍔",
      theme: {
        primary: "#C9622A",     // laranja queimado (brasa)
        primaryDark: "#9A4A1E",
        secondary: "#26262A",   // grafite
        accent: "#F2C94C",      // amarelo mostarda
        background: "#FBF7F2",
        surface: "#FFFFFF",
        text: "#211D1A",
        textMuted: "#6E655C"
      },
      whatsapp: "5511965432109",
      address: "Rua Augusta, 2310 — Consolação, São Paulo/SP",
      deliveryTime: "25–40 min",
      minOrder: 25,
      hours: {
        text: "Qua a Seg, 18h às 00h (fechado às terças)",
        schedule: { 0: [18, 24], 1: [18, 24], 3: [18, 24], 4: [18, 24], 5: [18, 24], 6: [18, 24] }
      },
      social: { instagram: "@prayaburger", facebook: "prayaburgerco" },
      about: "Nascemos de um trailer de praia em 2016. Hoje, cada burger ainda é montado na hora, com pão brioche feito por padaria parceira e carne moída na casa todos os dias.",
      categories: [
        { id: "lanches", name: "Lanches" },
        { id: "acompanhamentos", name: "Acompanhamentos" },
        { id: "bebidas", name: "Bebidas" },
        { id: "sobremesas", name: "Sobremesas" }
      ],
      products: [
        { id: "pb-01", categoryId: "lanches", name: "Praya Clássico", description: "Blend 160g, queijo cheddar, alface, tomate e maionese da casa.", price: 28.0, emoji: "🍔", featured: true },
        { id: "pb-02", categoryId: "lanches", name: "Praya Bacon", description: "Blend 160g, cheddar duplo, bacon crocante e cebola caramelizada.", price: 34.0, emoji: "🍔", featured: true },
        { id: "pb-03", categoryId: "lanches", name: "Veggie Grelhado", description: "Hambúrguer de grão-de-bico, rúcula, tomate seco e maionese vegana.", price: 30.0, emoji: "🥬", featured: false },
        { id: "pb-04", categoryId: "acompanhamentos", name: "Batata Rústica", description: "Batata com casca temperada com páprica defumada.", price: 18.0, emoji: "🍟", featured: false },
        { id: "pb-05", categoryId: "acompanhamentos", name: "Onion Rings", description: "Anéis de cebola empanados e crocantes, com molho barbecue.", price: 20.0, emoji: "🧅", featured: false },
        { id: "pb-06", categoryId: "bebidas", name: "Refrigerante Lata", description: "350ml, sabores variados.", price: 8.0, emoji: "🥤", featured: false },
        { id: "pb-07", categoryId: "bebidas", name: "Milkshake de Ovomaltine", description: "Cremoso, com calda e granulado.", price: 22.0, emoji: "🥤", featured: true },
        { id: "pb-08", categoryId: "sobremesas", name: "Brownie com Sorvete", description: "Brownie quente de chocolate 70% com bola de sorvete de creme.", price: 24.0, emoji: "🍫", featured: false }
      ]
    },

    /* ============================================================
     * 4) DOCE INSTANTE — Confeitaria
     * ============================================================ */
    {
      id: "doce",
      name: "Doce Instante",
      tagline: "Bolos, tortas e doces finos artesanais",
      logoText: "DI",
      logoEmoji: "🍰",
      theme: {
        primary: "#B8567A",     // rosa framboesa
        primaryDark: "#8C3E5C",
        secondary: "#4A3B45",   // ameixa escuro
        accent: "#E7B7C9",      // rosa pó
        background: "#FCF7F9",
        surface: "#FFFFFF",
        text: "#3A2E33",
        textMuted: "#8A7A82"
      },
      whatsapp: "5511954321098",
      address: "Alameda Santos, 480 — Bela Vista, São Paulo/SP",
      deliveryTime: "30–45 min",
      minOrder: 20,
      hours: {
        text: "Ter a Dom, 10h às 20h",
        schedule: { 0: [10, 20], 2: [10, 20], 3: [10, 20], 4: [10, 20], 5: [10, 20], 6: [10, 20] }
      },
      social: { instagram: "@doceinstante", facebook: "doceinstanteconfeitaria" },
      about: "Uma confeitaria de bairro que virou ponto de parada obrigatório. Trabalhamos com ingredientes frescos e receitas próprias — nada de misturas prontas, tudo feito na cozinha da loja.",
      categories: [
        { id: "bolos", name: "Bolos" },
        { id: "tortas", name: "Tortas" },
        { id: "doces-finos", name: "Doces Finos" },
        { id: "bebidas", name: "Bebidas" }
      ],
      products: [
        { id: "di-01", categoryId: "bolos", name: "Bolo de Chocolate Belga (fatia)", description: "Massa úmida de chocolate 70% com ganache.", price: 16.0, emoji: "🍫", featured: true },
        { id: "di-02", categoryId: "bolos", name: "Red Velvet (fatia)", description: "Massa aveludada com cream cheese frosting.", price: 18.0, emoji: "🍰", featured: false },
        { id: "di-03", categoryId: "tortas", name: "Torta de Limão", description: "Base amanteigada, creme de limão siciliano e merengue maçaricado.", price: 17.0, emoji: "🍋", featured: true },
        { id: "di-04", categoryId: "tortas", name: "Torta Holandesa", description: "Camadas de chocolate crocante e chantilly.", price: 19.0, emoji: "🍫", featured: false },
        { id: "di-05", categoryId: "doces-finos", name: "Brigadeiro Gourmet (unid.)", description: "Chocolate belga 70% com granulado importado.", price: 5.5, emoji: "🍬", featured: false },
        { id: "di-06", categoryId: "doces-finos", name: "Macaron (unid.)", description: "Sabores rotativos: pistache, framboesa ou baunilha.", price: 7.0, emoji: "🧁", featured: true },
        { id: "di-07", categoryId: "bebidas", name: "Café Espresso", description: "Grãos torrados artesanalmente.", price: 8.0, emoji: "☕", featured: false },
        { id: "di-08", categoryId: "bebidas", name: "Chocolate Quente Cremoso", description: "Feito com chocolate 50% derretido no leite.", price: 13.0, emoji: "🍫", featured: false }
      ]
    }

  ]
};

// Exporta para uso em ambiente com módulos (bundlers) mantendo
// compatibilidade com uso direto via <script> no navegador.
if (typeof module !== "undefined" && module.exports) {
  module.exports = RESTAURANTS_DATA;
}
