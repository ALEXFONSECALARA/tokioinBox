# Cardápio Digital Multi-Marca

Sistema estático (HTML/CSS/JS puro, sem build step) capaz de hospedar até 4
restaurantes diferentes na mesma base de código, com navegação interna em
SPA (sem reload de página) e finalização de pedido via WhatsApp.

## 1. Estrutura de arquivos

```
/
├── index.html              # Shell único do app (todas as 4 páginas internas vivem aqui)
├── css/
│   └── styles.css          # Estilo base + variáveis de tema (--primary-color etc.)
├── js/
│   ├── restaurants-data.js # Fonte única de dados dos 4 restaurantes
│   └── script.js           # Roteamento por marca, SPA, tema, carrinho, checkout
└── assets/
    ├── logos/               # (opcional) logos reais em PNG/SVG por marca
    └── products/            # (opcional) fotos reais dos produtos
```

Não há dependências externas de build (não precisa de `npm install`). Basta
subir esta pasta em qualquer hospedagem estática (Netlify, Vercel, GitHub
Pages, um servidor Nginx simples, etc.) ou abrir `index.html` direto.

> A única chamada de rede é uma fonte do Google Fonts no `styles.css`
> (`@import url(...)`). Se o ambiente de destino não tiver acesso à internet,
> remova essa linha — o CSS já tem fallback para fontes do sistema.

## 2. Como funciona a identificação da marca (multi-tenant)

O `script.js` lê o parâmetro `?rest=` da URL:

```
index.html?rest=tokio    → Shogatsu Tokio (japonês)
index.html?rest=italia   → Trattoria Bella Vita (italiano)
index.html?rest=praya    → Praya Burger Co. (hamburgueria)
index.html?rest=doce     → Doce Instante (confeitaria)
index.html                → usa RESTAURANTS_DATA.defaultRestaurant ("tokio")
```

Ao carregar, `applyTheme()` injeta as cores da marca como variáveis CSS
(`--primary-color`, `--secondary-color`, `--accent-color`, `--bg-color`...),
troca o título da aba, o logo e o nome no cabeçalho, e todo o restante da UI
(`styles.css`) já está escrito em cima dessas variáveis — nada é hardcoded
por marca.

Um seletor de marcas aparece logo abaixo do cabeçalho **apenas para
demonstração/testes** (deixa fácil alternar entre os 4 restaurantes fictícios
sem editar a URL manualmente). Em produção normalmente cada marca teria seu
próprio link fixo (ex.: um QR code de mesa apontando para
`seudominio.com/?rest=tokio`), então esse seletor pode ser removido do
`index.html` sem afetar o resto do sistema.

## 3. Adicionando um 5º restaurante (ou trocando os dados fictícios)

Edite **apenas** `js/restaurants-data.js`:

1. Duplique um dos objetos dentro de `restaurants: [...]`.
2. Troque `id` (usado na URL), `name`, `theme` (6 cores), `whatsapp`
   (com DDI+DDD, só números), `categories` e `products`.
3. Pronto — nenhum outro arquivo precisa ser tocado.

## 4. Navegação interna (SPA)

Dentro de uma marca, 4 páginas internas alternam via barra inferior fixa,
sem recarregar a página (`goToPage()` em `script.js` apenas
mostra/esconde blocos `.page` e atualiza a URL com `history.replaceState`,
mantendo o botão "voltar" do navegador coerente):

1. **Início** — banner de boas-vindas, status aberto/fechado calculado em
   tempo real a partir de `hours.schedule`, tempo de entrega, pedido mínimo
   e produtos em destaque (`featured: true`).
2. **Cardápio** — categorias em chips horizontais, busca em tempo real
   (nome + descrição) e botão de adicionar rápido ao carrinho.
3. **Sobre** — histórico, endereço, tempo médio de entrega, funcionamento e
   redes sociais.
4. **Meus Pedidos** — histórico local (`localStorage`) dos pedidos já
   enviados pelo WhatsApp, com formato de "ticket de cozinha".

## 5. Carrinho isolado por marca

O carrinho é salvo em `localStorage` sob a chave `cart_<idDoRestaurante>`
(ex.: `cart_tokio`, `cart_italia`). Trocar de marca troca completamente de
carrinho — impossível misturar itens de restaurantes diferentes. O mesmo
vale para o histórico de pedidos (`orders_<idDoRestaurante>`).

## 6. Checkout → WhatsApp

Ao confirmar o pedido, `buildWhatsAppMessage()` monta uma mensagem assim:

```
🛍️ *Pedido recebido via Shogatsu Tokio*

*Itens:*
• 2x Gyoza (5un) — R$ 52,00
• 1x Combinado Tokio (20 peças) — R$ 89,00

*Total: R$ 141,00*

*Cliente:* Maria Silva
*Telefone:* (11) 91234-5678
*Endereço de entrega:* Rua das Flores, 45 — apto 12
*Pagamento:* Pix

_Pedido gerado pelo cardápio digital._
```

e abre `https://wa.me/<numeroDaMarca>?text=<mensagemCodificada>` em uma nova
aba/app, usando o número de WhatsApp específico daquele restaurante
(`restaurant.whatsapp`). O pedido também é salvo no histórico local antes de
abrir o WhatsApp, então ele aparece imediatamente em "Meus Pedidos" mesmo que
o cliente não confirme o envio da mensagem.

## 7. Próximos passos sugeridos (fora do escopo deste entregável)

- Trocar os emojis de placeholder por fotos reais em `assets/products/`
  (basta adicionar um campo `photo: "assets/products/xxx.jpg"` e trocar o
  `<div class="thumb">` por uma `<img>` com fallback de `onerror` para o
  emoji).
- Se algum dia for necessário um canal único de pedidos (um só número de
  WhatsApp recebendo pelas 4 marcas), basta usar o mesmo valor de
  `whatsapp` nos 4 objetos de `restaurants-data.js` — a tag
  `🛍️ *Pedido recebido via [Nome do Restaurante]*` já identifica a origem
  de cada pedido dentro da conversa.
