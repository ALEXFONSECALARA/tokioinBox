import React, { useState, useEffect, useMemo } from 'react';
import { 
  MenuItem, 
  Category, 
  CartItem, 
  Order, 
  RestaurantConfig, 
  DietaryTag,
  DeliveryAddress
} from './types';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_MENU_ITEMS, 
  INITIAL_RESTAURANT_CONFIG 
} from './data/initialData';
import { fetchMenu, createOrder, fetchOrder } from './utils/api';
import { formatCurrency, playSoundEffect, COUPONS } from './utils/helpers';
import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderStatusModal } from './components/OrderStatusModal';
import { DeliveryAddressModal } from './components/DeliveryAddressModal';
import { FavoritesModal } from './components/FavoritesModal';
import { 
  ShoppingBag, 
  Bike,
  ChefHat, 
  MapPin,
  Clock,
  Percent,
  X
} from 'lucide-react';

// Tema visual por restaurante. Prioridade: cor cadastrada pelo próprio
// restaurante em Configurações → Aparência (config.color/secondaryColor) —
// vem primeiro, é a identidade real dele. Sem isso, cai no mapa fixo antigo
// (hoje só o "japones" tem tema próprio) e, por fim, no dourado padrão.
// Isso é só a cor — nenhuma lógica de cardápio/checkout/pedido muda aqui.
const DEFAULT_THEME = {
  brand: '#F59E0B',
  brandLight: '#FBBF24',
  brandDark: '#D97706',
  brandTint: '#FFFBEB',
  accentRed: '#F43F5E',
};

const RESTAURANT_THEMES: Record<string, typeof DEFAULT_THEME> = {
  japones: {
    brand: '#C9A227', // dourado
    brandLight: '#E0B94D',
    brandDark: '#8A6D1D',
    brandTint: '#FBF3D9',
    accentRed: '#B91C1C', // vermelho tradicional
  },
};

// Clareia/escurece um hex simples (sem libs extras) pra derivar brandLight/
// brandDark a partir da única cor que o restaurante configurou.
function shadeHex(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getThemeStyle(slug: string, config?: RestaurantConfig | null): React.CSSProperties {
  let theme = RESTAURANT_THEMES[slug] || DEFAULT_THEME;
  if (config?.color) {
    try {
      theme = {
        brand: config.color,
        brandLight: shadeHex(config.color, 18),
        brandDark: shadeHex(config.color, -18),
        brandTint: shadeHex(config.color, 92),
        accentRed: config.secondaryColor || theme.accentRed,
      };
    } catch {
      // hex inválido (raro, ex. campo salvo de forma inesperada) — mantém o tema padrão
      theme = RESTAURANT_THEMES[slug] || DEFAULT_THEME;
    }
  }
  return {
    ['--brand' as any]: theme.brand,
    ['--brand-light' as any]: theme.brandLight,
    ['--brand-dark' as any]: theme.brandDark,
    ['--brand-tint' as any]: theme.brandTint,
    ['--accent-red' as any]: theme.accentRed,
  };
}

interface AppProps {
  // Identifica qual restaurante esta loja representa (ex: 'japones', 'pizza').
  // Cada restaurante tem seu próprio cardápio, carrinho e pedidos isolados.
  restaurantSlug: string;
  onExit?: () => void;
}

export default function App({ restaurantSlug, onExit }: AppProps) {
  // Chaves do localStorage isoladas por restaurante, pra não misturar carrinho/pedidos
  // de lojas diferentes no mesmo navegador.
  const storageKey = (name: string) => `cardapio_${restaurantSlug}_${name}`;

  // Cardápio (categorias, itens, config do restaurante) agora vem do backend (/api/:slug/menu).
  // Os valores INITIAL_* servem só de fallback enquanto carrega ou se a API falhar.
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [restaurantConfig, setRestaurantConfig] = useState<RestaurantConfig>(INITIAL_RESTAURANT_CONFIG);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [menuLoadError, setMenuLoadError] = useState<string | null>(null);
  const isMenuHydrated = React.useRef(false);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(storageKey('cart'));
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(storageKey('orders'));
    return saved ? JSON.parse(saved) : [];
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem(storageKey('favorites'));
    return saved ? JSON.parse(saved) : [];
  });

  // Saved Delivery Address State
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(() => {
    const saved = localStorage.getItem(storageKey('delivery_address'));
    return saved ? JSON.parse(saved) : {
      street: 'Av. Paulista',
      number: '1578',
      complement: 'Apt 42B',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      cep: '01310-200'
    };
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<DietaryTag | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState('all');

  // Splash screen (tela de abertura em tela cheia): mostra uma vez por sessão
  // do navegador, por restaurante, se o admin tiver ativado e cadastrado fotos.
  const [showSplash, setShowSplash] = useState(false);

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    // Se o cliente fechar o navegador e voltar, reconecta com o pedido em
    // andamento (nem entregue, nem cancelado) em vez de esquecer dele.
    const saved = localStorage.getItem(storageKey('orders'));
    const savedOrders: Order[] = saved ? JSON.parse(saved) : [];
    const ongoing = savedOrders
      .filter((o) => o.status !== 'entregue' && o.status !== 'cancelado')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return ongoing[0]?.id || null;
  });
  // Controla o banner "Você possui um pedido em andamento" — só é dispensado
  // quando o cliente clica em "Acompanhar Pedido" ou fecha o aviso.
  const [showOngoingOrderBanner, setShowOngoingOrderBanner] = useState(!!activeOrderId);

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>('BEMVINDO10');

  // Carrega o cardápio do backend (GET /api/:slug/menu) na primeira renderização
  // e sempre que o restaurante (slug) mudar.
  useEffect(() => {
    let cancelled = false;
    isMenuHydrated.current = false;
    setIsMenuLoading(true);
    (async () => {
      try {
        const data = await fetchMenu(restaurantSlug);
        if (cancelled) return;
        setMenuItems(data.menuItems);
        setCategories(data.categories);
        setRestaurantConfig(data.restaurantConfig);
        setMenuLoadError(null);
      } catch (err: any) {
        console.error('Falha ao buscar cardápio do backend, usando dados locais:', err);
        if (!cancelled) {
          const message = String(err?.message || '');
          setMenuLoadError(
            message.includes('não encontrado')
              ? `Restaurante "${restaurantSlug}" não encontrado.`
              : 'Não foi possível conectar ao servidor do cardápio. Mostrando dados salvos localmente.'
          );
          // Fallback: usa o que estiver salvo no localStorage, se houver
          const savedItems = localStorage.getItem(storageKey('menu_items'));
          const savedConfig = localStorage.getItem(storageKey('restaurant_config'));
          if (savedItems) setMenuItems(JSON.parse(savedItems));
          if (savedConfig) setRestaurantConfig(JSON.parse(savedConfig));
        }
      } finally {
        if (!cancelled) {
          isMenuHydrated.current = true;
          setIsMenuLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [restaurantSlug]);

  // Decide se mostra a splash screen: só se o admin ativou e cadastrou fotos,
  // e só uma vez por sessão do navegador (não repete a cada nova aba/recarregar
  // fica marcado em sessionStorage — mas volta a aparecer numa sessão nova).
  useEffect(() => {
    if (isMenuLoading) return;
    const splashSeenKey = `cardapio_splash_seen_${restaurantSlug}`;
    const alreadySeen = sessionStorage.getItem(splashSeenKey);
    const hasSplashContent = restaurantConfig.splashEnabled && (restaurantConfig.splashImages?.length || 0) > 0;
    if (hasSplashContent && !alreadySeen) {
      setShowSplash(true);
      sessionStorage.setItem(splashSeenKey, '1');
    }
  }, [isMenuLoading, restaurantSlug, restaurantConfig.splashEnabled, restaurantConfig.splashImages]);

  // Mantém uma cópia local (cache/offline) do cardápio. Quem realmente salva as
  // edições no backend é o painel /admin (AdminPortal), que tem o token de login.
  useEffect(() => {
    localStorage.setItem(storageKey('menu_items'), JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem(storageKey('restaurant_config'), JSON.stringify(restaurantConfig));
  }, [restaurantConfig]);

  useEffect(() => {
    localStorage.setItem(storageKey('cart'), JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(storageKey('orders'), JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(storageKey('favorites'), JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (deliveryAddress) {
      localStorage.setItem(storageKey('delivery_address'), JSON.stringify(deliveryAddress));
    }
  }, [deliveryAddress]);

  // Enquanto o pedido do cliente está ativo, consulta o backend a cada poucos
  // segundos pra saber se o admin mudou o status (recebido -> em preparo -> etc).
  useEffect(() => {
    if (!activeOrderId) return;
    const interval = setInterval(async () => {
      try {
        const updated = await fetchOrder(restaurantSlug, activeOrderId);
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      } catch {
        // Backend pode estar indisponível momentaneamente; ignora e tenta de novo depois.
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [activeOrderId, restaurantSlug]);

  // Some com o aviso de "pedido em andamento" assim que ele for entregue ou cancelado
  useEffect(() => {
    if (!activeOrderId) return;
    const current = orders.find((o) => o.id === activeOrderId);
    if (current && (current.status === 'entregue' || current.status === 'cancelado')) {
      setShowOngoingOrderBanner(false);
    }
  }, [orders, activeOrderId]);

  // Cart operations
  const handleAddToCart = (newItem: CartItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) =>
          i.menuItem.id === newItem.menuItem.id &&
          JSON.stringify(i.selectedChoices) === JSON.stringify(newItem.selectedChoices) &&
          JSON.stringify(i.selectedExtras) === JSON.stringify(newItem.selectedExtras) &&
          i.specialNotes === newItem.specialNotes
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        const newQty = existing.quantity + newItem.quantity;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          totalPrice: existing.unitPrice * newQty,
        };
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const handleUpdateCartQuantity = (id: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPrice: item.unitPrice * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleApplyCoupon = (code: string): boolean => {
    const coupon = COUPONS[code];
    if (coupon) {
      setAppliedCoupon(code);
      playSoundEffect('beep');
      return true;
    }
    return false;
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
  };

  // Favorites toggle
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const isFav = prev.includes(id);
      playSoundEffect('beep');
      if (isFav) {
        return prev.filter((favId) => favId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Order Placement
  const handleOrderPlaced = (order: Order, openWhatsApp: boolean) => {
    setOrders((prev) => [order, ...prev]);
    setActiveOrderId(order.id);
    setShowOngoingOrderBanner(true);
    setCartItems([]);
    if (!openWhatsApp) {
      setIsOrderStatusOpen(true);
    }
    // Envia o pedido pro backend, pra aparecer no painel do admin (super-admin)
    createOrder(restaurantSlug, order).catch((err) => {
      console.error('Não foi possível enviar o pedido ao servidor:', err);
    });
  };

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filter
      if (activeCategoryId !== 'all' && item.categoryId !== activeCategoryId) {
        return false;
      }
      // Tag filter
      if (selectedTag && !item.tags.includes(selectedTag)) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesCategory = item.categoryId.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCategory) return false;
      }
      return true;
    });
  }, [menuItems, activeCategoryId, selectedTag, searchQuery]);

  // Counts per category
  const categoryItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((cat) => {
      counts[cat.id] = menuItems.filter((i) => i.categoryId === cat.id).length;
    });
    return counts;
  }, [categories, menuItems]);

  // Cart total math
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  let discountAmount = 0;
  if (appliedCoupon && COUPONS[appliedCoupon]) {
    const coupon = COUPONS[appliedCoupon];
    if (coupon.discountPercent) {
      discountAmount = (cartSubtotal * coupon.discountPercent) / 100;
    } else if (coupon.fixedDiscount) {
      discountAmount = Math.min(coupon.fixedDiscount, cartSubtotal);
    }
  }

  // Active / in-progress delivery orders count
  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'entregue' && o.status !== 'cancelado'
  ).length;

  const favoriteMenuItems = menuItems.filter((i) => favorites.includes(i.id));

  // Aguarda o carregamento inicial do cardápio (GET /api/menu) antes de renderizar
  if (isMenuLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center gap-3 text-stone-500">
        <div className="w-10 h-10 border-4 border-stone-300 border-t-orange-600 rounded-full animate-spin" />
        <p className="font-medium">Carregando cardápio...</p>
      </div>
    );
  }

  // Render Admin Dashboard
  // (removido: o painel de administração só é acessível de forma protegida
  // por senha em /admin — ver AdminPortal.tsx. O cliente nunca tem esse acesso.)

  // Customer Delivery View
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans" style={getThemeStyle(restaurantSlug, restaurantConfig)}>
      {showSplash && (
        <SplashScreen config={restaurantConfig} onFinish={() => setShowSplash(false)} />
      )}
      {menuLoadError && (
        <div className="bg-amber-100 text-amber-800 text-sm text-center py-1.5 px-4">
          {menuLoadError}
        </div>
      )}
      {onExit && (
        <button
          onClick={onExit}
          className="text-xs text-stone-500 hover:text-stone-800 underline px-4 py-1.5 text-left w-fit"
        >
          ← Trocar de restaurante
        </button>
      )}

      <div className="flex-1 flex flex-col mx-auto w-full max-w-full bg-white">
        {/* Restaurant Header */}
        <Header
          config={restaurantConfig}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
          currentAddress={deliveryAddress}
          onOpenAddressModal={() => setIsAddressModalOpen(true)}
          activeOrdersCount={activeOrdersCount}
          onOpenOrders={() => setIsOrderStatusOpen(true)}
          favoritesCount={favorites.length}
          onOpenFavorites={() => setIsFavoritesOpen(true)}
        />

        {/* "Você possui um pedido em andamento" — reaparece se o cliente
            fechar o navegador e voltar com um pedido ainda não entregue */}
        {showOngoingOrderBanner && activeOrderId && (() => {
          const ongoingOrder = orders.find((o) => o.id === activeOrderId);
          if (!ongoingOrder) return null;
          const statusLabels: Record<string, string> = {
            recebido: 'Pedido recebido',
            em_preparo: 'Preparando',
            pronto: 'Pronto',
            saiu_entrega: 'Saiu para entrega',
          };
          return (
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
              <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--brand)] text-slate-950 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-stone-300 font-semibold">Você possui um pedido em andamento</p>
                    <p className="text-sm font-black">
                      Pedido #{ongoingOrder.orderNumber} — {statusLabels[ongoingOrder.status] || ongoingOrder.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsOrderStatusOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-light)] text-slate-950 text-xs font-black flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Acompanhar Pedido</span>
                  </button>
                  <button
                    onClick={() => setShowOngoingOrderBanner(false)}
                    className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800"
                    title="Dispensar aviso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Category Navigation Bar */}
        <CategoryNav
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          categoryItemCounts={categoryItemCounts}
        />

        {/* Promo Delivery Banner */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="bg-gradient-to-r from-[var(--brand)] via-[var(--brand-light)] to-[var(--brand)] rounded-2xl p-3 sm:p-4 text-slate-950 flex flex-wrap items-center justify-between gap-3 shadow-xs border border-[var(--brand-light)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-[var(--brand-light)] flex items-center justify-center flex-shrink-0">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black tracking-tight">
                  🛵 Entrega Rápida com Embalagem Térmica Selada
                </p>
                <p className="text-[11px] font-semibold text-slate-800">
                  Frete Grátis em pedidos acima de {formatCurrency(restaurantConfig.freeDeliveryThreshold || 80)} • Cupom: <span className="underline font-bold">BEMVINDO10</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => handleApplyCoupon('BEMVINDO10')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-[var(--brand-light)] rounded-xl text-xs font-black transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Aplicar 10% OFF</span>
            </button>
          </div>
        </div>

        {/* Main Menu Grid Content */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
          {/* Active Filter indicator */}
          {(searchQuery || selectedTag || activeCategoryId !== 'all') && (
            <div className="flex items-center justify-between bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs">
              <span className="text-stone-600 font-medium">
                Exibindo resultados para:{' '}
                <strong>
                  {searchQuery ? `"${searchQuery}"` : ''}
                  {selectedTag ? ` [Tag: ${selectedTag}]` : ''}
                  {activeCategoryId !== 'all'
                    ? ` [Categoria: ${categories.find((c) => c.id === activeCategoryId)?.name}]`
                    : ''}
                </strong>{' '}
                ({filteredMenuItems.length} encontrados)
              </span>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag(null);
                  setActiveCategoryId('all');
                }}
                className="text-amber-700 hover:text-amber-800 font-bold underline"
              >
                Limpar filtros
              </button>
            </div>
          )}

          {/* Group by category or flat list */}
          {activeCategoryId === 'all' && !searchQuery && !selectedTag ? (
            <div className="space-y-10">
              {categories.map((cat) => {
                const itemsInCat = menuItems.filter((i) => i.categoryId === cat.id);
                if (itemsInCat.length === 0) return null;

                return (
                  <section key={cat.id} id={`category-section-${cat.id}`} className="space-y-3">
                    <div className="border-b border-stone-200 pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                          {cat.name}
                        </h2>
                        <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-bold">
                          {itemsInCat.length}
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-stone-500 hidden sm:block">{cat.description}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {itemsInCat.map((item) => (
                        <ProductCard
                          key={item.id}
                          item={item}
                          onSelect={(dish) => setSelectedProduct(dish)}
                          isFavorite={favorites.includes(item.id)}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div>
              {filteredMenuItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 shadow-xs">
                  <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
                    <ShoppingBag className="w-8 h-8 text-stone-400" />
                  </div>
                  <h3 className="font-extrabold text-stone-800 text-base">Nenhum prato encontrado</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                    Tente buscar por outro termo ou remova os filtros selecionados.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTag(null);
                      setActiveCategoryId('all');
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-light)] text-slate-950 font-bold text-xs shadow-xs"
                  >
                    Ver Todo o Cardápio
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMenuItems.map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      onSelect={(dish) => setSelectedProduct(dish)}
                      isFavorite={favorites.includes(item.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Floating Mobile Cart Trigger Bar */}
        {cartItems.length > 0 && (
          <div className="sticky bottom-3 inset-x-0 z-40 px-4 max-w-md mx-auto pointer-events-auto">
            <button
              id="floating-cart-bar"
              onClick={() => setIsCartOpen(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-light)] active:scale-[0.98] text-slate-950 font-black text-sm flex items-center justify-between transition-all shadow-xl border border-[var(--brand-light)] ring-4 ring-[var(--brand)]/20"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-950 text-[var(--brand-light)] flex items-center justify-center text-xs font-black">
                  {cartItemCount}
                </div>
                <span>Ver Sacola Delivery</span>
              </div>
              <span className="bg-slate-950 text-[var(--brand-light)] px-3 py-1 rounded-xl text-xs font-black">
                {formatCurrency(cartSubtotal - discountAmount)}
              </span>
            </button>
          </div>
        )}

        {/* Delivery Footer */}
        <footer className="bg-stone-900 text-stone-400 text-xs py-8 px-4 sm:px-6 border-t border-stone-800 mt-12">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-extrabold text-white text-sm flex items-center justify-center sm:justify-start gap-2">
                <span>{restaurantConfig.name}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  🛵 Delivery Exclusivo
                </span>
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">{restaurantConfig.address}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {restaurantConfig.openingHours} • WhatsApp: {restaurantConfig.phone}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>Trocar Endereço</span>
              </button>
              <a
                href="/admin"
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-[var(--brand-light)] text-xs font-semibold flex items-center gap-1"
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Acesso Restaurante</span>
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Product Customization Modal */}
      <ProductModal
        item={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        restaurantConfig={restaurantConfig}
        currentAddress={deliveryAddress}
        onOpenAddressModal={() => {
          setIsCartOpen(false);
          setIsAddressModalOpen(true);
        }}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        appliedCoupon={appliedCoupon}
        discountAmount={discountAmount}
        restaurantConfig={restaurantConfig}
        currentAddress={deliveryAddress}
        onOpenAddressModal={() => setIsAddressModalOpen(true)}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* Delivery Address Modal (CEP lookup) */}
      <DeliveryAddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        currentAddress={deliveryAddress}
        onSaveAddress={(newAddr) => {
          setDeliveryAddress(newAddr);
          playSoundEffect('success');
        }}
        deliveryZones={restaurantConfig.deliveryZones || []}
      />

      {/* Order Status & Real-Time Delivery Tracker */}
      <OrderStatusModal
        isOpen={isOrderStatusOpen}
        onClose={() => setIsOrderStatusOpen(false)}
        orders={orders}
        activeOrderId={activeOrderId}
        onSelectOrder={setActiveOrderId}
        restaurantConfig={restaurantConfig}
      />

      {/* Favorites Modal */}
      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favoriteMenuItems}
        onSelectDish={(dish) => setSelectedProduct(dish)}
        onRemoveFavorite={(id) =>
          setFavorites((prev) => prev.filter((favId) => favId !== id))
        }
      />
    </div>
  );
}
