import React, { useEffect, useState, useCallback } from 'react';
import { MenuItem, Category, Order, OrderStatus, RestaurantConfig, DriverInfo } from '../types';
import {
  adminLogin,
  fetchRestaurants,
  fetchMenu,
  fetchOrdersAdmin,
  updateOrderAdmin,
  saveMenuItems,
  saveRestaurantConfig,
  RestaurantSummary,
} from '../utils/api';
import { AdminDashboard } from './AdminDashboard';
import { playSoundEffect } from '../utils/helpers';
import { Lock, ShieldCheck } from 'lucide-react';

const TOKEN_KEY = 'super_admin_token';

const LoginScreen: React.FC<{ onLoggedIn: (token: string) => void }> = ({ onLoggedIn }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = await adminLogin(password);
      sessionStorage.setItem(TOKEN_KEY, token);
      onLoggedIn(token);
    } catch (err: any) {
      setError(err?.message || 'Senha incorreta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 w-full max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center mb-4">
          <Lock size={22} />
        </div>
        <h1 className="text-xl font-bold text-stone-900 mb-1">Painel do administrador</h1>
        <p className="text-sm text-stone-500 mb-6">Acesso único para gerenciar todos os restaurantes</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="w-full border border-stone-300 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-stone-800"
        />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-stone-900 text-white rounded-xl py-3 font-medium disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <a href="/" className="block text-center text-sm text-stone-500 mt-4 hover:text-stone-800">
          ← Voltar
        </a>
      </form>
    </div>
  );
};

export const AdminPortal: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  // Slug de quem os dados abaixo (menuItems/categories/restaurantConfig/orders)
  // realmente pertencem no momento — só muda quando uma resposta da API chega.
  // Evita a "tela em branco piscando dado errado": enquanto loadedSlug !==
  // selectedSlug, mostramos um overlay de carregamento por cima do painel.
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurantConfig, setRestaurantConfig] = useState<RestaurantConfig | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // Alterações não salvas no formulário de Configurações do restaurante atual
  // (ver AdminDashboard → onDirtyChange). Usado pra confirmar antes de trocar
  // de restaurante ou sair, e pra travar a barra de troca durante o salvamento.
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sempre a versão mais recente do slug pedido — usada dentro dos efeitos
  // assíncronos abaixo pra descartar respostas que chegaram atrasadas (race
  // condition clássica de trocar de restaurante rápido demais).
  const latestRequestedSlugRef = React.useRef<string | null>(null);

  const handleLogout = useCallback(() => {
    if (isDirty && !window.confirm('Você tem alterações não salvas nas Configurações. Sair mesmo assim e perdê-las?')) {
      return;
    }
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, [isDirty]);

  // Troca de restaurante: se houver edição não salva, confirma antes. Isso
  // cobre exatamente o cenário "trocar rapidamente entre restaurantes" sem
  // perceber que uma alteração ficou pra trás.
  const handleSelectRestaurant = useCallback(
    (slug: string) => {
      if (slug === selectedSlug) return;
      if (isDirty && !window.confirm('Você tem alterações não salvas nas Configurações deste restaurante. Trocar de restaurante mesmo assim e perdê-las?')) {
        return;
      }
      setIsDirty(false);
      setSelectedSlug(slug);
    },
    [selectedSlug, isDirty]
  );

  // Carrega a lista de restaurantes assim que loga
  useEffect(() => {
    if (!token) return;
    fetchRestaurants()
      .then((list) => {
        setRestaurants(list);
        if (list.length > 0) setSelectedSlug((prev) => prev || list[0].slug);
      })
      .catch(() => {});
  }, [token]);

  // Carrega cardápio + config + pedidos SEMPRE do restaurante selecionado no
  // momento em que a resposta chega — nunca de um selectedSlug antigo. Se o
  // admin trocar de restaurante de novo antes da resposta anterior voltar, o
  // resultado antigo é descartado (comparação com latestRequestedSlugRef).
  useEffect(() => {
    if (!token || !selectedSlug) return;
    latestRequestedSlugRef.current = selectedSlug;
    const requestedSlug = selectedSlug;
    setLoading(true);
    Promise.all([fetchMenu(requestedSlug), fetchOrdersAdmin(requestedSlug, token)])
      .then(([menu, orderList]) => {
        // Uma seleção mais nova já foi feita enquanto isso carregava — descarta.
        if (latestRequestedSlugRef.current !== requestedSlug) return;
        setMenuItems(menu.menuItems);
        setCategories(menu.categories);
        setRestaurantConfig(menu.restaurantConfig);
        setOrders(orderList);
        setLoadedSlug(requestedSlug);
      })
      .catch((err: any) => {
        if (latestRequestedSlugRef.current !== requestedSlug) return;
        if (String(err?.message || '').includes('Não autorizado')) {
          handleLogout();
        }
      })
      .finally(() => {
        if (latestRequestedSlugRef.current === requestedSlug) setLoading(false);
      });
  }, [token, selectedSlug, handleLogout]);

  // Atualiza os pedidos periodicamente (novo pedido chegando de um cliente).
  // Descarta a resposta se, entre o disparo e a resposta, o admin já tiver
  // trocado de restaurante (mesma proteção contra race condition de cima).
  useEffect(() => {
    if (!token || !selectedSlug) return;
    const slugAtScheduleTime = selectedSlug;
    const interval = setInterval(() => {
      fetchOrdersAdmin(slugAtScheduleTime, token)
        .then((list) => {
          if (latestRequestedSlugRef.current !== slugAtScheduleTime) return;
          setOrders((prev) => (list.length !== prev.length ? list : prev));
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [token, selectedSlug]);

  if (!token) {
    return <LoginScreen onLoggedIn={setToken} />;
  }

  // Só considera "pronto pra mostrar" quando os dados carregados (loadedSlug)
  // realmente são os do restaurante selecionado agora — nunca mostra dado de
  // um restaurante antigo com a aba de outro já destacada.
  const isSwitchingRestaurant = selectedSlug !== loadedSlug;
  if (!selectedSlug || !restaurantConfig || isSwitchingRestaurant) {
    const switchingTo = restaurants.find((r) => r.slug === selectedSlug);
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
        {switchingTo && (
          <p className="text-sm text-stone-500">
            Carregando dados de {switchingTo.emoji} {switchingTo.name}...
          </p>
        )}
      </div>
    );
  }

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, driver?: DriverInfo) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const updatedOrder: Order = {
      ...target,
      status,
      driver: driver || target.driver,
      statusHistory: [
        ...target.statusHistory,
        {
          status,
          timestamp: new Date().toISOString(),
          note: driver ? `Atribuído ao entregador ${driver.name}` : `Status alterado para ${status}`,
        },
      ],
    };
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
    playSoundEffect('notification');
    updateOrderAdmin(selectedSlug, token, orderId, updatedOrder).catch((err) =>
      console.error('Erro ao atualizar pedido:', err)
    );
  };

  const persistMenuItems = (items: MenuItem[]) => {
    setMenuItems(items);
    setIsSaving(true);
    saveMenuItems(selectedSlug, token, items)
      .catch((err) => console.error('Erro ao salvar itens:', err))
      .finally(() => setIsSaving(false));
  };

  const handleAddMenuItem = (item: MenuItem) => persistMenuItems([item, ...menuItems]);
  const handleUpdateMenuItem = (item: MenuItem) =>
    persistMenuItems(menuItems.map((i) => (i.id === item.id ? item : i)));
  const handleDeleteMenuItem = (id: string) => persistMenuItems(menuItems.filter((i) => i.id !== id));
  const handleToggleAvailability = (id: string) => {
    persistMenuItems(menuItems.map((i) => (i.id === id ? { ...i, available: !i.available } : i)));
    playSoundEffect('beep');
  };

  const handleUpdateConfig = (config: RestaurantConfig) => {
    setRestaurantConfig(config);
    setIsSaving(true);
    saveRestaurantConfig(selectedSlug, token, config)
      .catch((err) => console.error('Erro ao salvar configuração:', err))
      .finally(() => setIsSaving(false));
  };

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Barra de troca de restaurante do super-admin */}
      <div className="bg-stone-900 text-white px-4 py-2.5 flex items-center gap-3 overflow-x-auto">
        <span className="flex items-center gap-1.5 text-xs font-medium text-stone-400 shrink-0">
          <ShieldCheck size={14} /> Super-admin
        </span>
        {restaurants.map((r) => (
          <button
            key={r.slug}
            onClick={() => handleSelectRestaurant(r.slug)}
            disabled={isSaving && r.slug !== selectedSlug}
            title={isSaving && r.slug !== selectedSlug ? 'Aguarde o salvamento terminar antes de trocar de restaurante' : undefined}
            className={`text-sm px-3 py-1.5 rounded-full whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              r.slug === selectedSlug ? 'bg-white text-stone-900 font-medium' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            {r.emoji} {r.name}
            {r.slug === selectedSlug && isDirty && (
              <span className="ml-1.5 text-amber-500" title="Alterações não salvas">●</span>
            )}
          </button>
        ))}
        {isSaving && (
          <span className="text-[11px] text-amber-400 font-semibold shrink-0 animate-pulse">Salvando...</span>
        )}
        <button
          onClick={handleLogout}
          className="ml-auto text-xs text-stone-400 hover:text-white shrink-0"
        >
          Sair
        </button>
      </div>

      <AdminDashboard
        key={selectedSlug}
        slug={selectedSlug}
        token={token}
        orders={orders}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        menuItems={menuItems}
        categories={categories}
        onAddMenuItem={handleAddMenuItem}
        onUpdateMenuItem={handleUpdateMenuItem}
        onDeleteMenuItem={handleDeleteMenuItem}
        onToggleAvailability={handleToggleAvailability}
        onUpdateMenuItems={persistMenuItems}
        restaurantConfig={restaurantConfig}
        onUpdateConfig={handleUpdateConfig}
        onCloseAdmin={() => (window.location.href = '/')}
        onDirtyChange={setIsDirty}
      />
    </div>
  );
};
