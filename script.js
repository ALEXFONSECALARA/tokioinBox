/**
 * ============================================================
 *  script.js
 * ------------------------------------------------------------
 *  Responsabilidades:
 *   1. Ler ?rest= da URL e carregar a marca correspondente
 *      de RESTAURANTS_DATA (restaurants-data.js).
 *   2. Injetar o tema (cores, título da aba, logo) daquela marca.
 *   3. Controlar a navegação interna por páginas (SPA, sem reload).
 *   4. Gerenciar um carrinho isolado por restaurante (localStorage).
 *   5. Montar a mensagem de pedido e abrir o WhatsApp (wa.me).
 * ============================================================
 */

(function () {
  "use strict";

  /* ============================================================
   * ESTADO GLOBAL DA APLICAÇÃO
   * ============================================================ */
  const STATE = {
    restaurant: null,        // objeto do restaurante ativo
    currentPage: "home",     // home | menu | about | orders
    currentCategory: "all",  // filtro de categoria no cardápio
    searchTerm: "",
    selectedPayment: "Pix",
    cart: {}                 // { [productId]: quantidade }
  };

  const currencyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const fmt = (v) => currencyFmt.format(v);

  /* ============================================================
   * 1) ROTEAMENTO POR MARCA (?rest=xxx)
   * ============================================================ */
  function getRestaurantIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("rest");
  }

  function loadRestaurant() {
    const requestedId = getRestaurantIdFromURL();
    const list = RESTAURANTS_DATA.restaurants;
    let restaurant = list.find((r) => r.id === requestedId);

    if (!restaurant) {
      // Sem parâmetro válido -> usa o restaurante padrão definido no data file
      const fallbackId = RESTAURANTS_DATA.defaultRestaurant || list[0].id;
      restaurant = list.find((r) => r.id === fallbackId) || list[0];
    }
    return restaurant;
  }

  function switchRestaurant(id) {
    // Trocar de marca é uma navegação "entre sites" diferente
    // (dataset, tema e carrinho completamente distintos), então
    // atualizamos a URL e recarregamos o app nesse novo contexto.
    const url = new URL(window.location.href);
    url.searchParams.set("rest", id);
    window.location.href = url.toString();
  }

  /* ============================================================
   * 2) TEMA DINÂMICO (CSS vars + título + logo)
   * ============================================================ */
  function applyTheme(restaurant) {
    const root = document.documentElement.style;
    const t = restaurant.theme;
    root.setProperty("--primary-color", t.primary);
    root.setProperty("--primary-dark", t.primaryDark || t.primary);
    root.setProperty("--secondary-color", t.secondary);
    root.setProperty("--accent-color", t.accent);
    root.setProperty("--bg-color", t.background);
    root.setProperty("--surface-color", t.surface || "#FFFFFF");
    root.setProperty("--text-color", t.text);
    root.setProperty("--text-muted", t.textMuted || "#6b6b6e");

    document.title = `${restaurant.name} · Cardápio Digital`;
    const metaTheme = document.getElementById("meta-theme-color");
    if (metaTheme) metaTheme.setAttribute("content", t.primary);

    document.getElementById("brand-logo").textContent = restaurant.logoEmoji || restaurant.logoText || "🍽️";
    document.getElementById("brand-name").textContent = restaurant.name;
    document.getElementById("brand-tagline").textContent = restaurant.tagline || "";
  }

  function renderBrandSwitcher(restaurant) {
    const nav = document.getElementById("brand-switcher");
    nav.innerHTML = "";
    RESTAURANTS_DATA.restaurants.forEach((r) => {
      const btn = document.createElement("button");
      btn.textContent = `${r.logoEmoji || ""} ${r.name}`.trim();
      btn.className = r.id === restaurant.id ? "active" : "";
      btn.addEventListener("click", () => {
        if (r.id !== restaurant.id) switchRestaurant(r.id);
      });
      nav.appendChild(btn);
    });
  }

  /* ============================================================
   * 3) STATUS DE FUNCIONAMENTO (aberto/fechado em tempo real)
   * ============================================================ */
  function computeOpenStatus(restaurant) {
    const now = new Date();
    const day = now.getDay();
    const hourDecimal = now.getHours() + now.getMinutes() / 60;
    const range = restaurant.hours.schedule[day];

    if (!range) return { open: false, label: "Fechado hoje" };
    const [start, end] = range;
    const open = hourDecimal >= start && hourDecimal < end;
    return { open, label: open ? "Aberto agora" : "Fechado no momento" };
  }

  function renderStatusPill(restaurant) {
    const { open, label } = computeOpenStatus(restaurant);
    const pill = document.getElementById("status-pill");
    const text = document.getElementById("status-text");
    pill.classList.toggle("closed", !open);
    text.textContent = label;
  }

  /* ============================================================
   * 4) PÁGINA · INÍCIO / DESTAQUES
   * ============================================================ */
  function renderHomePage(restaurant) {
    const hero = document.getElementById("hero-banner");
    hero.setAttribute("data-emoji", restaurant.logoEmoji || "🍽️");
    document.getElementById("hero-title").textContent = `Bem-vindo ao ${restaurant.name}!`;
    document.getElementById("hero-hours").textContent = restaurant.hours.text;
    document.getElementById("hero-delivery").textContent = restaurant.deliveryTime;

    document.getElementById("info-min").textContent = fmt(restaurant.minOrder);
    document.getElementById("info-hours").textContent = computeOpenStatus(restaurant).open ? "Aberto agora" : "Fechado agora";

    const featuredRow = document.getElementById("featured-row");
    featuredRow.innerHTML = "";
    const featured = restaurant.products.filter((p) => p.featured);
    (featured.length ? featured : restaurant.products.slice(0, 4)).forEach((p) => {
      featuredRow.appendChild(buildFeaturedCard(p));
    });
  }

  function buildFeaturedCard(product) {
    const card = document.createElement("div");
    card.className = "featured-card";
    card.innerHTML = `
      <div class="thumb">${product.emoji || "🍽️"}</div>
      <div class="body">
        <div class="name">${escapeHTML(product.name)}</div>
        <div class="price-tag">${fmt(product.price)}</div>
      </div>`;
    card.addEventListener("click", () => {
      goToPage("menu");
      STATE.currentCategory = product.categoryId;
      renderMenuPage(STATE.restaurant);
    });
    return card;
  }

  /* ============================================================
   * 5) PÁGINA · CARDÁPIO / PRODUTOS
   * ============================================================ */
  function renderMenuPage(restaurant) {
    document.getElementById("menu-title").textContent = `Cardápio · ${restaurant.name}`;
    renderCategoryNav(restaurant);
    renderProductList(restaurant);
  }

  function renderCategoryNav(restaurant) {
    const nav = document.getElementById("category-nav");
    nav.innerHTML = "";

    const allBtn = document.createElement("button");
    allBtn.className = "category-pill" + (STATE.currentCategory === "all" ? " active" : "");
    allBtn.textContent = "Todos";
    allBtn.addEventListener("click", () => {
      STATE.currentCategory = "all";
      renderMenuPage(STATE.restaurant);
    });
    nav.appendChild(allBtn);

    restaurant.categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "category-pill" + (STATE.currentCategory === cat.id ? " active" : "");
      btn.textContent = cat.name;
      btn.addEventListener("click", () => {
        STATE.currentCategory = cat.id;
        renderMenuPage(STATE.restaurant);
      });
      nav.appendChild(btn);
    });
  }

  function renderProductList(restaurant) {
    const list = document.getElementById("menu-list");
    list.innerHTML = "";

    const term = STATE.searchTerm.trim().toLowerCase();
    let products = restaurant.products;

    if (STATE.currentCategory !== "all") {
      products = products.filter((p) => p.categoryId === STATE.currentCategory);
    }
    if (term) {
      products = products.filter(
        (p) => p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)
      );
    }

    if (!products.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="glyph">🔍</div>
          <div class="title">Nada encontrado</div>
          <div class="desc">Tente outro termo de busca ou categoria.</div>
        </div>`;
      return;
    }

    // Agrupar por categoria (respeitando a ordem definida no data file),
    // exceto quando há busca ativa — nesse caso mostramos lista plana.
    if (term) {
      products.forEach((p) => list.appendChild(buildProductCard(p)));
      return;
    }

    const categoriesToRender =
      STATE.currentCategory === "all"
        ? restaurant.categories
        : restaurant.categories.filter((c) => c.id === STATE.currentCategory);

    categoriesToRender.forEach((cat) => {
      const items = products.filter((p) => p.categoryId === cat.id);
      if (!items.length) return;

      const block = document.createElement("div");
      block.className = "category-block";
      block.innerHTML = `<div class="category-heading">${escapeHTML(cat.name)}</div>`;
      items.forEach((p) => block.appendChild(buildProductCard(p)));
      list.appendChild(block);
    });
  }

  function buildProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-thumb">${product.emoji || "🍽️"}</div>
      <div class="product-info">
        <div class="product-name">${escapeHTML(product.name)}</div>
        <div class="product-desc">${escapeHTML(product.description)}</div>
        <div class="product-footer">
          <span class="price-tag">${fmt(product.price)}</span>
          <button class="add-btn" aria-label="Adicionar ${escapeHTML(product.name)}">+</button>
        </div>
      </div>`;
    card.querySelector(".add-btn").addEventListener("click", () => addToCart(product.id));
    return card;
  }

  /* ============================================================
   * 6) PÁGINA · SOBRE
   * ============================================================ */
  function renderAboutPage(restaurant) {
    document.getElementById("about-name").textContent = restaurant.tagline || restaurant.name;
    document.getElementById("about-text").textContent = restaurant.about;
    document.getElementById("about-address").textContent = restaurant.address;
    document.getElementById("about-delivery").textContent = restaurant.deliveryTime;
    document.getElementById("about-hours").textContent = restaurant.hours.text;

    const social = document.getElementById("about-social");
    social.innerHTML = "";
    if (restaurant.social?.instagram) {
      const a = document.createElement("a");
      a.href = `https://instagram.com/${restaurant.social.instagram.replace("@", "")}`;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "📷 Instagram";
      social.appendChild(a);
    }
    if (restaurant.social?.facebook) {
      const a = document.createElement("a");
      a.href = `https://facebook.com/${restaurant.social.facebook}`;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "📘 Facebook";
      social.appendChild(a);
    }
  }

  /* ============================================================
   * 7) CARRINHO — isolado por restaurante via localStorage
   * ============================================================ */
  function cartStorageKey(restaurantId) { return `cart_${restaurantId}`; }
  function ordersStorageKey(restaurantId) { return `orders_${restaurantId}`; }

  function loadCart(restaurant) {
    try {
      const raw = localStorage.getItem(cartStorageKey(restaurant.id));
      STATE.cart = raw ? JSON.parse(raw) : {};
    } catch (e) {
      STATE.cart = {};
    }
  }

  function saveCart() {
    localStorage.setItem(cartStorageKey(STATE.restaurant.id), JSON.stringify(STATE.cart));
  }

  function addToCart(productId) {
    STATE.cart[productId] = (STATE.cart[productId] || 0) + 1;
    saveCart();
    updateCartUI();
    showToast("Adicionado ao carrinho ✓");
  }

  function changeQty(productId, delta) {
    const next = (STATE.cart[productId] || 0) + delta;
    if (next <= 0) {
      delete STATE.cart[productId];
    } else {
      STATE.cart[productId] = next;
    }
    saveCart();
    updateCartUI();
    renderCartModal();
  }

  function getCartItemsDetailed() {
    return Object.entries(STATE.cart)
      .map(([productId, qty]) => {
        const product = STATE.restaurant.products.find((p) => p.id === productId);
        if (!product) return null;
        return { product, qty, lineTotal: product.price * qty };
      })
      .filter(Boolean);
  }

  function getCartTotal() {
    return getCartItemsDetailed().reduce((sum, item) => sum + item.lineTotal, 0);
  }

  function getCartCount() {
    return Object.values(STATE.cart).reduce((sum, qty) => sum + qty, 0);
  }

  function updateCartUI() {
    const count = getCartCount();
    const total = getCartTotal();
    const fab = document.getElementById("cart-fab");
    fab.classList.toggle("visible", count > 0);
    document.getElementById("cf-count").textContent = count;
    document.getElementById("cf-total").textContent = fmt(total);
  }

  function renderCartModal() {
    const linesEl = document.getElementById("cart-lines");
    const items = getCartItemsDetailed();
    linesEl.innerHTML = "";

    if (!items.length) {
      linesEl.innerHTML = `
        <div class="empty-state">
          <div class="glyph">🛒</div>
          <div class="title">Carrinho vazio</div>
          <div class="desc">Adicione itens do cardápio para continuar.</div>
        </div>`;
    } else {
      items.forEach(({ product, qty, lineTotal }) => {
        const line = document.createElement("div");
        line.className = "cart-line";
        line.innerHTML = `
          <div class="cl-info">
            <div class="cl-name">${escapeHTML(product.name)}</div>
            <div class="cl-price">${fmt(product.price)} un · ${fmt(lineTotal)}</div>
          </div>
          <div class="qty-control">
            <button data-action="dec" aria-label="Diminuir">−</button>
            <span>${qty}</span>
            <button data-action="inc" aria-label="Aumentar">+</button>
          </div>`;
        line.querySelector('[data-action="dec"]').addEventListener("click", () => changeQty(product.id, -1));
        line.querySelector('[data-action="inc"]').addEventListener("click", () => changeQty(product.id, 1));
        linesEl.appendChild(line);
      });
    }

    const total = getCartTotal();
    document.getElementById("cart-subtotal").textContent = fmt(total);
    document.getElementById("cart-total").textContent = fmt(total);
    document.getElementById("checkout-total").textContent = fmt(total);

    const goCheckoutBtn = document.getElementById("go-checkout-btn");
    goCheckoutBtn.disabled = items.length === 0;
  }

  /* ============================================================
   * 8) PÁGINA · MEUS PEDIDOS
   * ============================================================ */
  function loadOrders(restaurant) {
    try {
      const raw = localStorage.getItem(ordersStorageKey(restaurant.id));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveOrder(restaurant, order) {
    const orders = loadOrders(restaurant);
    orders.unshift(order); // pedido mais recente primeiro
    localStorage.setItem(ordersStorageKey(restaurant.id), JSON.stringify(orders));
  }

  function renderOrdersPage(restaurant) {
    const list = document.getElementById("orders-list");
    const orders = loadOrders(restaurant);
    const badge = document.getElementById("orders-badge");

    if (orders.length) {
      badge.style.display = "flex";
      badge.textContent = orders.length > 9 ? "9+" : orders.length;
    } else {
      badge.style.display = "none";
    }

    list.innerHTML = "";
    if (!orders.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="glyph">🧾</div>
          <div class="title">Nenhum pedido ainda</div>
          <div class="desc">Seus pedidos enviados por aqui aparecerão nesta lista.</div>
        </div>`;
      return;
    }

    orders.forEach((order) => {
      const ticket = document.createElement("div");
      ticket.className = "order-ticket";
      const itemsHTML = order.items
        .map((it) => `${it.qty}x ${escapeHTML(it.name)} · ${fmt(it.lineTotal)}`)
        .join("<br>");
      ticket.innerHTML = `
        <div class="t-head">
          <span class="t-id">#${order.id} · ${order.date}</span>
          <span class="t-status">${order.status}</span>
        </div>
        <div class="t-items">${itemsHTML}</div>
        <div class="t-total"><span>Total</span><span>${fmt(order.total)}</span></div>`;
      list.appendChild(ticket);
    });
  }

  /* ============================================================
   * 9) CHECKOUT — geração da mensagem para o WhatsApp
   * ============================================================ */
  function buildWhatsAppMessage(restaurant, customer, items, total) {
    const lines = [];
    lines.push(`🛍️ *Pedido recebido via ${restaurant.name}*`);
    lines.push("");
    lines.push("*Itens:*");
    items.forEach((it) => {
      lines.push(`• ${it.qty}x ${it.product.name} — ${fmt(it.lineTotal)}`);
    });
    lines.push("");
    lines.push(`*Total: ${fmt(total)}*`);
    lines.push("");
    lines.push(`*Cliente:* ${customer.name}`);
    lines.push(`*Telefone:* ${customer.phone}`);
    lines.push(`*Endereço de entrega:* ${customer.address}`);
    lines.push(`*Pagamento:* ${customer.payment}`);
    if (customer.notes) {
      lines.push(`*Observações:* ${customer.notes}`);
    }
    lines.push("");
    lines.push("_Pedido gerado pelo cardápio digital._");
    return lines.join("\n");
  }

  function submitCheckout(event) {
    event.preventDefault();
    const items = getCartItemsDetailed();
    if (!items.length) return;

    const customer = {
      name: document.getElementById("ck-name").value.trim(),
      phone: document.getElementById("ck-phone").value.trim(),
      address: document.getElementById("ck-address").value.trim(),
      notes: document.getElementById("ck-notes").value.trim(),
      payment: STATE.selectedPayment
    };

    const total = getCartTotal();
    const message = buildWhatsAppMessage(STATE.restaurant, customer, items, total);
    const waNumber = STATE.restaurant.whatsapp.replace(/\D/g, "");
    const waURL = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    // Registra o pedido no histórico local ("Meus Pedidos")
    const order = {
      id: Date.now().toString().slice(-6),
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
      status: "Enviado",
      total,
      items: items.map((it) => ({ name: it.product.name, qty: it.qty, lineTotal: it.lineTotal }))
    };
    saveOrder(STATE.restaurant, order);

    // Abre o WhatsApp com a mensagem pronta
    window.open(waURL, "_blank", "noopener");

    // Limpa o carrinho deste restaurante e volta para a tela de pedidos
    STATE.cart = {};
    saveCart();
    updateCartUI();
    closeModal("checkout-modal");
    closeModal("cart-modal");
    document.getElementById("checkout-form").reset();
    showToast("Pedido enviado! Confira em Meus Pedidos.");
    goToPage("orders");
  }

  /* ============================================================
   * 10) NAVEGAÇÃO SPA ENTRE PÁGINAS INTERNAS
   * ============================================================ */
  function goToPage(pageName) {
    STATE.currentPage = pageName;

    document.querySelectorAll(".page").forEach((el) => {
      el.classList.toggle("active", el.dataset.page === pageName);
    });
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.page === pageName);
    });

    // Mantém o estado navegável (voltar do navegador) sem recarregar a página
    const url = new URL(window.location.href);
    url.hash = pageName === "home" ? "" : pageName;
    window.history.replaceState({}, "", url);

    if (pageName === "menu") renderMenuPage(STATE.restaurant);
    if (pageName === "about") renderAboutPage(STATE.restaurant);
    if (pageName === "orders") renderOrdersPage(STATE.restaurant);

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  /* ============================================================
   * 11) MODAIS + TOAST (utilitários de UI)
   * ============================================================ */
  function openModal(id) { document.getElementById(id).classList.add("open"); }
  function closeModal(id) { document.getElementById(id).classList.remove("open"); }

  let toastTimer = null;
  function showToast(text) {
    const toast = document.getElementById("toast");
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  /* ============================================================
   * 12) LIGAÇÃO DE EVENTOS (event listeners)
   * ============================================================ */
  function bindEvents() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => goToPage(btn.dataset.page));
    });

    document.getElementById("cart-fab").addEventListener("click", () => {
      renderCartModal();
      openModal("cart-modal");
    });

    document.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.dataset.close));
    });
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.classList.remove("open");
      });
    });

    document.getElementById("go-checkout-btn").addEventListener("click", () => {
      if (!getCartItemsDetailed().length) return;
      document.getElementById("checkout-total").textContent = fmt(getCartTotal());
      closeModal("cart-modal");
      openModal("checkout-modal");
    });

    document.getElementById("checkout-form").addEventListener("submit", submitCheckout);

    document.querySelectorAll(".pay-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".pay-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        STATE.selectedPayment = chip.dataset.pay;
      });
    });

    document.getElementById("search-input").addEventListener("input", (e) => {
      STATE.searchTerm = e.target.value;
      renderProductList(STATE.restaurant);
    });
  }

  /* ============================================================
   * 13) INICIALIZAÇÃO
   * ============================================================ */
  function init() {
    const restaurant = loadRestaurant();
    STATE.restaurant = restaurant;

    applyTheme(restaurant);
    renderBrandSwitcher(restaurant);
    renderStatusPill(restaurant);
    loadCart(restaurant);

    renderHomePage(restaurant);
    renderMenuPage(restaurant);
    renderAboutPage(restaurant);
    renderOrdersPage(restaurant);
    updateCartUI();

    bindEvents();

    // Respeita uma página inicial vinda por #hash (ex: index.html?rest=tokio#menu)
    const initialPage = window.location.hash.replace("#", "");
    const validPages = ["home", "menu", "about", "orders"];
    goToPage(validPages.includes(initialPage) ? initialPage : "home");

    // Atualiza o pill de aberto/fechado periodicamente
    setInterval(() => renderStatusPill(STATE.restaurant), 60000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
