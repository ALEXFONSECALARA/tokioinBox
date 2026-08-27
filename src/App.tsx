import React, { useState, useEffect, useMemo } from 'react';
import { 
  MenuItem, 
  Category, 
  CartItem, 
  Order, 
  OrderStatus, 
  RestaurantConfig, 
  ActivePlatformView, 
  DeviceFrame,
  DietaryTag,
  DeliveryAddress,
  DriverInfo
} from './types';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_MENU_ITEMS, 
  INITIAL_RESTAURANT_CONFIG 
} from './data/initialData';
import { fetchMenu, saveMenuItems, saveCategories, saveRestaurantConfig } from './utils/api';
import { formatCurrency, playSoundEffect, COUPONS } from './utils/helpers';
import { DeviceSimulatorToolbar } from './components/DeviceSimulatorToolbar';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderStatusModal } from './components/OrderStatusModal';
import { AdminDashboard } from './components/AdminDashboard';
import { DeliveryAddressModal } from './components/DeliveryAddressModal';
import { FavoritesModal } from './components/FavoritesModal';
import { 
  ShoppingBag, 
  Bike,
  Sparkles, 
  ChefHat, 
  MapPin,
  Clock,
  ShieldCheck,
  Percent,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  // Cardápio (categorias, itens, config do restaurante) agora vem do backend (/api/menu).
  // Os valores INITIAL_* servem só de fallback enquanto carrega ou se a API falhar.
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [restaurantConfig, setRestaurantConfig] = useState<RestaurantConfig>(INITIAL_RESTAURANT_CONFIG);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [menuLoadError, setMenuLoadError] = useState<string | null>(null);
  const isMenuHydrated = React.useRef(false);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cardapio_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('cardapio_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('cardapio_favorites');
    return saved ? JSON.parse(saved) : ['item-1', 'item-8'];
  });

  // Saved Delivery Address State
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(() => {
    const saved = localStorage.getItem('cardapio_delivery_address');
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
  const [activeView, setActiveView] = useState<ActivePlatformView>('customer');
  const [deviceFrame, setDeviceFrame] = useState<DeviceFrame>('fluid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<DietaryTag | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState('all');

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>('BEMVINDO10');

  // Carrega o cardápio do backend (GET /api/menu) na primeira renderização
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMenu();
        if (cancelled) return;
        setMenuItems(data.menuItems);
        setCategories(data.categories);
        setRestaurantConfig(data.restaurantConfig);
        setMenuLoadError(null);
      } catch (err) {
        console.error('Falha ao buscar cardápio do backend, usando dados locais:', err);
        if (!cancelled) {
          setMenuLoadError('Não foi possível conectar ao servidor do cardápio. Mostrando dados salvos localmente.');
          // Fallback: usa o que estiver salvo no localStorage, se houver
          const savedItems = localStorage.getItem('cardapio_menu_items');
          const savedConfig = localStorage.getItem('cardapio_restaurant_config');
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
  }, []);

  // Persist cardápio: mantém uma cópia local (cache/offline) e sincroniza com o backend
  useEffect(() => {
    localStorage.setItem('cardapio_menu_items', JSON.stringify(menuItems));
    if (!isMenuHydrated.current) return;
    saveMenuItems(menuItems).catch((err) => console.error('Erro ao salvar itens no backend:', err));
  }, [menuItems]);

  useEffect(() => {
    if (!isMenuHydrated.current) return;
    saveCategories(categories).catch((err) => console.error('Erro ao salvar categorias no backend:', err));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('cardapio_restaurant_config', JSON.stringify(restaurantConfig));
    if (!isMenuHydrated.current) return;
    saveRestaurantConfig(restaurantConfig).catch((err) => console.error('Erro ao salvar configuração no backend:', err));
  }, [restaurantConfig]);

  useEffect(() => {
    localStorage.setItem('cardapio_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('cardapio_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('cardapio_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (deliveryAddress) {
      localStorage.setItem('cardapio_delivery_address', JSON.stringify(deliveryAddress));
    }
  }, [deliveryAddress]);

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
    setCartItems([]);
    if (!openWhatsApp) {
      setIsOrderStatusOpen(true);
    }
  };

  // Admin Operations
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, driver?: DriverInfo) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status,
            driver: driver || o.driver,
            statusHistory: [
              ...o.statusHistory,
              {
                status,
                timestamp: new Date().toISOString(),
                note: driver ? `Atribuído ao entregador ${driver.name}` : `Status alterado para ${status}`,
              },
            ],
          };
        }
        return o;
      })
    );
    playSoundEffect('notification');
  };

  const handleAddMenuItem = (item: MenuItem) => {
    setMenuItems((prev) => [item, ...prev]);
  };

  const handleUpdateMenuItem = (item: MenuItem) => {
    setMenuItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
  };

  const handleDeleteMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleToggleAvailability = (id: string) => {
    setMenuItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, available: !i.available } : i))
    );
    playSoundEffect('beep');
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
  if (activeView === 'admin') {
    return (
      <div className="min-h-screen bg-stone-100">
        <DeviceSimulatorToolbar
          activeView={activeView}
          onViewChange={setActiveView}
          deviceFrame={deviceFrame}
          onDeviceFrameChange={setDeviceFrame}
          activeOrdersCount={activeOrdersCount}
          onOpenOrders={() => setIsOrderStatusOpen(true)}
        />
        <AdminDashboard
          orders={orders}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          menuItems={menuItems}
          categories={categories}
          onAddMenuItem={handleAddMenuItem}
          onUpdateMenuItem={handleUpdateMenuItem}
          onDeleteMenuItem={handleDeleteMenuItem}
          onToggleAvailability={handleToggleAvailability}
          onInjectDemoOrder={(demoOrder) => setOrders((prev) => [demoOrder, ...prev])}
          onUpdateMenuItems={setMenuItems}
          restaurantConfig={restaurantConfig}
          onUpdateConfig={setRestaurantConfig}
          onCloseAdmin={() => setActiveView('customer')}
        />
      </div>
    );
  }

  // Customer Delivery View (with optional device simulation frame)
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans">
      {menuLoadError && (
        <div className="bg-amber-100 text-amber-800 text-sm text-center py-1.5 px-4">
          {menuLoadError}
        </div>
      )}
      {/* Top Device & Mode Simulator Toolbar */}
      <DeviceSimulatorToolbar
        activeView={activeView}
        onViewChange={setActiveView}
        deviceFrame={deviceFrame}
        onDeviceFrameChange={setDeviceFrame}
        activeOrdersCount={activeOrdersCount}
        onOpenOrders={() => setIsOrderStatusOpen(true)}
      />

      {/* Device Shell Simulation Container */}
      <div
        className={`flex-1 flex flex-col mx-auto w-full transition-all duration-300 ${
          deviceFrame === 'mobile'
            ? 'max-w-md my-4 rounded-3xl shadow-2xl overflow-hidden border-8 border-stone-800 bg-white ring-1 ring-stone-900/10'
            : deviceFrame === 'tablet'
            ? 'max-w-3xl my-4 rounded-3xl shadow-2xl overflow-hidden border-8 border-stone-800 bg-white ring-1 ring-stone-900/10'
            : 'max-w-full bg-white'
        }`}
      >
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

        {/* Category Navigation Bar */}
        <CategoryNav
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          categoryItemCounts={categoryItemCounts}
        />

        {/* Promo Delivery Banner */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-2xl p-3 sm:p-4 text-slate-950 flex flex-wrap items-center justify-between gap-3 shadow-xs border border-amber-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center flex-shrink-0">
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
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-black transition-transform active:scale-95 flex items-center gap-1.5"
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
                    className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs"
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
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-sm flex items-center justify-between transition-all shadow-xl border border-amber-300 ring-4 ring-amber-500/20"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center text-xs font-black">
                  {cartItemCount}
                </div>
                <span>Ver Sacola Delivery</span>
              </div>
              <span className="bg-slate-950 text-amber-400 px-3 py-1 rounded-xl text-xs font-black">
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
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>Trocar Endereço</span>
              </button>
              <button
                onClick={() => setActiveView('admin')}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-semibold flex items-center gap-1"
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Acesso Restaurante</span>
              </button>
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
