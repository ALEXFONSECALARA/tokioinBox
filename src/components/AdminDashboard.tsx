import React, { useState, useEffect } from 'react';
import { 
  MenuItem, 
  Category, 
  Order, 
  OrderStatus, 
  RestaurantConfig, 
  DietaryTag,
  DeliveryZone,
  DriverInfo
} from '../types';
import { formatCurrency, playSoundEffect } from '../utils/helpers';
import { ToolsHub } from './ToolsHub';
import { ReceiptPrintModal } from './ReceiptPrintModal';
import { ImageUploadField } from './ImageUploadField';
import { 
  ChefHat, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Phone, 
  Save, 
  Check, 
  Clock, 
  Volume2, 
  VolumeX, 
  Layers, 
  Settings, 
  Eye, 
  X,
  Bike,
  MapPin,
  QrCode,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Navigation,
  ShieldCheck,
  Percent,
  Printer,
  Wrench,
  Sparkles,
  FileSpreadsheet,
  ImageOff,
  Images
} from 'lucide-react';

interface AdminDashboardProps {
  // Restaurante sendo administrado e token de sessão do admin — necessários
  // pra fazer upload de fotos (POST /api/:slug/upload) direto do painel.
  slug: string;
  token: string;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, driver?: DriverInfo) => void;
  menuItems: MenuItem[];
  categories: Category[];
  onAddMenuItem: (item: MenuItem) => void;
  onUpdateMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (id: string) => void;
  onToggleAvailability: (id: string) => void;
  onInjectDemoOrder?: (order: Order) => void;
  onUpdateMenuItems?: (items: MenuItem[]) => void;
  restaurantConfig: RestaurantConfig;
  onUpdateConfig: (config: RestaurantConfig) => void;
  onCloseAdmin: () => void;
  // Avisa o painel pai (AdminPortal) se existem edições no formulário de
  // Configurações ainda não salvas — usado pra impedir troca de restaurante
  // sem confirmação e perda acidental de alterações.
  onDirtyChange?: (dirty: boolean) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  slug,
  token,
  orders,
  onUpdateOrderStatus,
  menuItems,
  categories,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onToggleAvailability,
  onInjectDemoOrder,
  onUpdateMenuItems,
  restaurantConfig,
  onUpdateConfig,
  onCloseAdmin,
  onDirtyChange,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'zones' | 'drivers' | 'config' | 'metrics' | 'tools'>('orders');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  // Pedidos já impressos nesta sessão do painel (troca o botão pra
  // "Reimprimir" e deixa claro que os dados usados são os mesmos salvos).
  const [printedOrderIds, setPrintedOrderIds] = useState<Set<string>>(new Set());
  
  // Modal for add/edit dish
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);

  // Modal for add/edit delivery zone
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneFee, setZoneFee] = useState('');
  const [zoneEstTime, setZoneEstTime] = useState('30 - 45 min');

  // Modal for add/edit driver
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverInfo | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverVehicle, setDriverVehicle] = useState('Honda CG 160 Fan');
  const [driverPlate, setDriverPlate] = useState('');
  const [driverPhoto, setDriverPhoto] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80');

  // Order Dispatch Modal (assigning driver)
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Dish Form State
  const [dishName, setDishName] = useState('');
  const [dishCategory, setDishCategory] = useState(categories[0]?.id || 'burgers');
  const [dishDescription, setDishDescription] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [dishOriginalPrice, setDishOriginalPrice] = useState('');
  const [dishImage, setDishImage] = useState('');
  const [dishPrepTime, setDishPrepTime] = useState('20');
  const [dishServes, setDishServes] = useState('1');
  const [dishTags, setDishTags] = useState<DietaryTag[]>([]);

  // Config Form State
  const [localConfig, setLocalConfig] = useState<RestaurantConfig>({ ...restaurantConfig });
  const [configSaved, setConfigSaved] = useState(false);

  // Campos do formulário de Configurações que só salvam ao clicar em "Salvar
  // Alterações" (nome, telefone, taxas, etc.) ficam "sujos" (não salvos) até lá.
  // Avisa o AdminPortal disso pra ele poder confirmar antes de trocar de restaurante.
  useEffect(() => {
    onDirtyChange?.(JSON.stringify(localConfig) !== JSON.stringify(restaurantConfig));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localConfig, restaurantConfig]);

  // Se este painel for desmontado (ex: o admin trocou de restaurante) com
  // alterações pendentes, avisa que não há mais nada "sujo" nesta instância.
  useEffect(() => {
    return () => onDirtyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Financial Metrics Calculation
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelado')
    .reduce((acc, o) => acc + o.total, 0);
  const validOrders = orders.filter((o) => o.status !== 'cancelado');
  const validOrdersCount = validOrders.length;
  const averageTicket = validOrdersCount > 0 ? totalRevenue / validOrdersCount : 0;
  const deliveryRevenue = validOrders.reduce((acc, o) => acc + (o.deliveryFee || 0), 0);

  // Open Dish Edit Modal
  const handleOpenDishModal = (dish?: MenuItem) => {
    if (dish) {
      setEditingDish(dish);
      setDishName(dish.name);
      setDishCategory(dish.categoryId);
      setDishDescription(dish.description);
      setDishPrice(dish.price.toString());
      setDishOriginalPrice(dish.originalPrice ? dish.originalPrice.toString() : '');
      setDishImage(dish.image);
      setDishPrepTime(dish.preparationTimeMinutes ? dish.preparationTimeMinutes.toString() : '20');
      setDishServes(dish.servesCount ? dish.servesCount.toString() : '1');
      setDishTags(dish.tags || []);
    } else {
      setEditingDish(null);
      setDishName('');
      setDishCategory(categories[0]?.id || 'burgers');
      setDishDescription('');
      setDishPrice('');
      setDishOriginalPrice('');
      setDishImage('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80');
      setDishPrepTime('20');
      setDishServes('1');
      setDishTags(['destaque']);
    }
    setIsDishModalOpen(true);
  };

  const handleSaveDishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim() || !dishPrice) return;

    const priceNum = parseFloat(dishPrice.replace(',', '.'));
    const origPriceNum = dishOriginalPrice ? parseFloat(dishOriginalPrice.replace(',', '.')) : undefined;

    if (editingDish) {
      const updated: MenuItem = {
        ...editingDish,
        name: dishName.trim(),
        categoryId: dishCategory,
        description: dishDescription.trim(),
        price: priceNum,
        originalPrice: origPriceNum,
        image: dishImage.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        preparationTimeMinutes: parseInt(dishPrepTime) || 20,
        servesCount: parseInt(dishServes) || 1,
        tags: dishTags,
      };
      onUpdateMenuItem(updated);
    } else {
      const newDish: MenuItem = {
        id: `item-${Date.now()}`,
        name: dishName.trim(),
        categoryId: dishCategory,
        description: dishDescription.trim(),
        price: priceNum,
        originalPrice: origPriceNum,
        image: dishImage.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        available: true,
        preparationTimeMinutes: parseInt(dishPrepTime) || 20,
        servesCount: parseInt(dishServes) || 1,
        tags: dishTags,
      };
      onAddMenuItem(newDish);
    }

    playSoundEffect('success');
    setIsDishModalOpen(false);
  };

  // Zone CRUD
  const handleOpenZoneModal = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setZoneName(zone.neighborhood);
      setZoneFee(zone.fee.toString());
      setZoneEstTime(zone.estimatedMinutes);
    } else {
      setEditingZone(null);
      setZoneName('');
      setZoneFee('8.00');
      setZoneEstTime('30 - 45 min');
    }
    setIsZoneModalOpen(true);
  };

  const handleSaveZoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim() || !zoneFee) return;

    const feeNum = parseFloat(zoneFee.replace(',', '.'));
    const currentZones = localConfig.deliveryZones || [];

    let updatedZones: DeliveryZone[];
    if (editingZone) {
      updatedZones = currentZones.map((z) =>
        z.id === editingZone.id
          ? { ...z, neighborhood: zoneName.trim(), fee: feeNum, estimatedMinutes: zoneEstTime.trim() }
          : z
      );
    } else {
      const newZone: DeliveryZone = {
        id: `zone-${Date.now()}`,
        neighborhood: zoneName.trim(),
        fee: feeNum,
        estimatedMinutes: zoneEstTime.trim(),
        active: true,
      };
      updatedZones = [...currentZones, newZone];
    }

    const updatedConfig = { ...localConfig, deliveryZones: updatedZones };
    setLocalConfig(updatedConfig);
    onUpdateConfig(updatedConfig);
    setIsZoneModalOpen(false);
    playSoundEffect('success');
  };

  const handleDeleteZone = (id: string) => {
    const currentZones = localConfig.deliveryZones || [];
    const updatedZones = currentZones.filter((z) => z.id !== id);
    const updatedConfig = { ...localConfig, deliveryZones: updatedZones };
    setLocalConfig(updatedConfig);
    onUpdateConfig(updatedConfig);
    playSoundEffect('beep');
  };

  const handleToggleZoneActive = (id: string) => {
    const currentZones = localConfig.deliveryZones || [];
    const updatedZones = currentZones.map((z) =>
      z.id === id ? { ...z, active: !z.active } : z
    );
    const updatedConfig = { ...localConfig, deliveryZones: updatedZones };
    setLocalConfig(updatedConfig);
    onUpdateConfig(updatedConfig);
  };

  // Driver CRUD
  const handleOpenDriverModal = (driver?: DriverInfo) => {
    if (driver) {
      setEditingDriver(driver);
      setDriverName(driver.name);
      setDriverPhone(driver.phone);
      setDriverVehicle(driver.vehicle);
      setDriverPlate(driver.plate || '');
      setDriverPhoto(driver.photo || '');
    } else {
      setEditingDriver(null);
      setDriverName('');
      setDriverPhone('(11) 9');
      setDriverVehicle('Honda CG 160 Fan');
      setDriverPlate('BRA2E19');
      setDriverPhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80');
    }
    setIsDriverModalOpen(true);
  };

  const handleSaveDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) return;

    const currentDrivers = localConfig.drivers || [];
    let updatedDrivers: DriverInfo[];

    if (editingDriver) {
      updatedDrivers = currentDrivers.map((d) =>
        d.id === editingDriver.id
          ? {
              ...d,
              name: driverName.trim(),
              phone: driverPhone.trim(),
              vehicle: driverVehicle.trim(),
              plate: driverPlate.trim(),
              photo: driverPhoto.trim(),
            }
          : d
      );
    } else {
      const newDriver: DriverInfo = {
        id: `driver-${Date.now()}`,
        name: driverName.trim(),
        phone: driverPhone.trim(),
        vehicle: driverVehicle.trim(),
        plate: driverPlate.trim(),
        photo: driverPhoto.trim(),
        status: 'available',
        rating: 5.0,
      };
      updatedDrivers = [...currentDrivers, newDriver];
    }

    const updatedConfig = { ...localConfig, drivers: updatedDrivers };
    setLocalConfig(updatedConfig);
    onUpdateConfig(updatedConfig);
    setIsDriverModalOpen(false);
    playSoundEffect('success');
  };

  const handleDeleteDriver = (id: string) => {
    const currentDrivers = localConfig.drivers || [];
    const updatedDrivers = currentDrivers.filter((d) => d.id !== id);
    const updatedConfig = { ...localConfig, drivers: updatedDrivers };
    setLocalConfig(updatedConfig);
    onUpdateConfig(updatedConfig);
    playSoundEffect('beep');
  };

  const handleToggleDriverStatus = (id: string) => {
    const currentDrivers = localConfig.drivers || [];
    const updatedDrivers = currentDrivers.map((d) => {
      if (d.id === id) {
        const nextStatus = d.status === 'available' ? 'busy' : d.status === 'busy' ? 'offline' : 'available';
        return { ...d, status: nextStatus as 'available' | 'busy' | 'offline' };
      }
      return d;
    });
    const updatedConfig = { ...localConfig, drivers: updatedDrivers };
    setLocalConfig(updatedConfig);
    onUpdateConfig(updatedConfig);
  };

  // Dispatch Order with Driver
  const handleStartDispatch = (order: Order) => {
    setDispatchOrder(order);
    const availableDrivers = (localConfig.drivers || []).filter((d) => d.status === 'available');
    setSelectedDriverId(availableDrivers[0]?.id || localConfig.drivers?.[0]?.id || '');
  };

  const handleConfirmDispatch = () => {
    if (!dispatchOrder) return;
    const chosenDriver = (localConfig.drivers || []).find((d) => d.id === selectedDriverId);
    onUpdateOrderStatus(dispatchOrder.id, 'saiu_entrega', chosenDriver);
    setDispatchOrder(null);
    playSoundEffect('success');
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(localConfig);
    setConfigSaved(true);
    playSoundEffect('success');
    setTimeout(() => setConfigSaved(false), 2500);
  };

  // Filter orders by Kanban column
  const pendingOrders = orders.filter((o) => o.status === 'recebido');
  const preparingOrders = orders.filter((o) => o.status === 'em_preparo');
  const transitOrders = orders.filter((o) => o.status === 'saiu_entrega' || o.status === 'pronto');
  const finishedOrders = orders.filter((o) => o.status === 'entregue');

  return (
    <div className="bg-stone-100 min-h-screen pb-16">
      {/* Top Admin Header */}
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-11 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Painel do Restaurante & Delivery
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Operação Ativa
                </span>
              </h1>
              <p className="text-xs text-stone-400 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 bg-stone-800 text-amber-400 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide">
                  Restaurante Ativo
                </span>
                <span className="font-semibold text-stone-200">{restaurantConfig.name}</span>
                <span className="text-stone-500">· slug: {slug}</span>
                <span className="text-stone-500">· {validOrdersCount} pedidos registrados</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="admin-sound-toggle-btn"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playSoundEffect('bell');
              }}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                soundEnabled
                  ? 'bg-stone-800 text-amber-400 border-amber-500/30'
                  : 'bg-stone-800 text-stone-500 border-stone-700'
              }`}
              title={soundEnabled ? 'Alertas sonoros ativados' : 'Alertas sonoros desativados'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Som Ativado' : 'Sem Som'}</span>
            </button>

            <button
              id="admin-return-menu-btn"
              onClick={onCloseAdmin}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Eye className="w-4 h-4" />
              <span>Ver App do Cliente</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto flex gap-2 mt-3 overflow-x-auto scrollbar-none pt-1">
          <button
            id="tab-admin-orders"
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Kanban de Pedidos</span>
            {pendingOrders.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full animate-bounce">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            id="tab-admin-menu"
            onClick={() => setActiveTab('menu')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'menu'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Cardápio ({menuItems.length})</span>
          </button>

          <button
            id="tab-admin-zones"
            onClick={() => setActiveTab('zones')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'zones'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Bairros & Taxas ({localConfig.deliveryZones?.length || 0})</span>
          </button>

          <button
            id="tab-admin-drivers"
            onClick={() => setActiveTab('drivers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'drivers'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>Entregadores ({localConfig.drivers?.length || 0})</span>
          </button>

          <button
            id="tab-admin-config"
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </button>

          <button
            id="tab-admin-metrics"
            onClick={() => setActiveTab('metrics')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'metrics'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Faturamento & Métricas</span>
          </button>

          <button
            id="tab-admin-tools"
            onClick={() => setActiveTab('tools')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'tools'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Ferramentas & CMV</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* ========================================================================= */}
        {/* TAB 1: KANBAN LIVE ORDERS & DELIVERY DISPATCH */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
                  <span>Kanban de Pedidos Delivery</span>
                  <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                    {orders.length} pedidos hoje
                  </span>
                </h2>
                <p className="text-xs text-stone-500">
                  Gerencie todo o fluxo desde a chegada até a entrega com motoboy
                </p>
              </div>
              <button
                id="test-sound-bell-btn"
                onClick={() => playSoundEffect('bell')}
                className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-1 shadow-2xs"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Testar Sinal Sonoro</span>
              </button>
            </div>

            {/* 4-Column Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Column 1: Novos Pedidos */}
              <div className="bg-amber-50/70 rounded-2xl p-3 border border-amber-200 flex flex-col h-full min-h-[440px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-amber-200 mb-3">
                  <h3 className="font-extrabold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    Novos Pedidos
                  </h3>
                  <span className="bg-amber-200 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingOrders.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {pendingOrders.length === 0 ? (
                    <div className="text-center py-12 text-stone-400">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">Nenhum novo pedido pendente</p>
                    </div>
                  ) : (
                    pendingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white p-3.5 rounded-2xl border border-amber-300 shadow-xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-black text-amber-700">#{order.orderNumber}</span>
                            <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                              {order.customer.name}
                            </h4>
                          </div>
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-black">
                            🛵 Delivery
                          </span>
                        </div>

                        {order.customer.address && (
                          <div className="bg-stone-50 p-2 rounded-xl border border-stone-100 text-[11px] text-stone-600 space-y-0.5">
                            <p className="font-semibold text-stone-900 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-600" />
                              {order.customer.address.street}, {order.customer.address.number}
                            </p>
                            <p className="text-stone-500">
                              {order.customer.address.neighborhood} • {order.customer.address.city}
                            </p>
                            {order.customer.address.complement && (
                              <p className="text-stone-400 italic">Comp: {order.customer.address.complement}</p>
                            )}
                          </div>
                        )}

                        <div className="text-xs text-stone-700 bg-stone-50 p-2 rounded-xl space-y-1">
                          {order.items.map((i) => (
                            <div key={i.id} className="flex justify-between">
                              <span>{i.quantity}x {i.menuItem.name}</span>
                              <span className="font-bold">{formatCurrency(i.totalPrice)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                          <span className="text-stone-500 font-medium">Total:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-stone-900">{formatCurrency(order.total)}</span>
                            <button
                              onClick={() => setSelectedReceiptOrder(order)}
                              className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
                              title="Imprimir Comanda Térmica"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'em_preparo')}
                            className="py-2 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs text-center flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Aceitar & Cozinhar</span>
                          </button>
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'cancelado')}
                            className="py-2 px-2 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 rounded-xl font-bold text-xs text-center"
                          >
                            Recusar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Em Cozinha / Preparo */}
              <div className="bg-blue-50/70 rounded-2xl p-3 border border-blue-200 flex flex-col h-full min-h-[440px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-blue-200 mb-3">
                  <h3 className="font-extrabold text-blue-950 text-xs sm:text-sm flex items-center gap-1.5">
                    <ChefHat className="w-4 h-4 text-blue-600" />
                    Em Preparo
                  </h3>
                  <span className="bg-blue-200 text-blue-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {preparingOrders.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {preparingOrders.length === 0 ? (
                    <div className="text-center py-12 text-stone-400">
                      <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">Nenhum pedido na chapa</p>
                    </div>
                  ) : (
                    preparingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white p-3.5 rounded-2xl border border-blue-300 shadow-xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-black text-blue-700">#{order.orderNumber}</span>
                            <h4 className="font-bold text-stone-900 text-xs">{order.customer.name}</h4>
                          </div>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                            🛵 {order.customer.address?.neighborhood || 'Delivery'}
                          </span>
                        </div>

                        <div className="text-xs text-stone-700 bg-stone-50 p-2 rounded-xl space-y-1">
                          {order.items.map((i) => (
                            <div key={i.id} className="text-xs">
                              <span className="font-bold text-stone-900">{i.quantity}x {i.menuItem.name}</span>
                              {i.selectedChoices.length > 0 && (
                                <p className="text-[10px] text-stone-500">
                                  {i.selectedChoices.map((c) => c.optionName).join(', ')}
                                </p>
                              )}
                              {i.specialNotes && (
                                <p className="text-[10px] text-amber-700 font-semibold italic">Obs: {i.specialNotes}</p>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => handleStartDispatch(order)}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <Bike className="w-4 h-4" />
                            <span>Despachar / Chamar Motoboy</span>
                          </button>
                          <button
                            onClick={() => setSelectedReceiptOrder(order)}
                            className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700"
                            title="Imprimir Comanda Térmica"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Saiu para Entrega / Em Trânsito */}
              <div className="bg-purple-50/70 rounded-2xl p-3 border border-purple-200 flex flex-col h-full min-h-[440px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-purple-200 mb-3">
                  <h3 className="font-extrabold text-purple-950 text-xs sm:text-sm flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-purple-600 animate-pulse" />
                    Em Trânsito / Entrega
                  </h3>
                  <span className="bg-purple-200 text-purple-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {transitOrders.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {transitOrders.length === 0 ? (
                    <div className="text-center py-12 text-stone-400">
                      <Bike className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">Nenhum motoboy na rua</p>
                    </div>
                  ) : (
                    transitOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white p-3.5 rounded-2xl border border-purple-300 shadow-xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-black text-purple-700">#{order.orderNumber}</span>
                            <h4 className="font-bold text-stone-900 text-xs">{order.customer.name}</h4>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-stone-900">
                              {formatCurrency(order.total)}
                            </span>
                            <button
                              onClick={() => setSelectedReceiptOrder(order)}
                              className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
                              title="Imprimir Comanda"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {order.driver && (
                          <div className="bg-purple-50 p-2 rounded-xl border border-purple-100 flex items-center gap-2">
                            <img
                              src={order.driver.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                              alt={order.driver.name}
                              className="w-8 h-8 rounded-full object-cover border border-purple-300"
                              referrerPolicy="no-referrer"
                            />
                            <div className="text-[10px] leading-tight flex-1">
                              <p className="font-bold text-purple-950">Motoboy: {order.driver.name}</p>
                              <p className="text-purple-700">{order.driver.vehicle} • {order.driver.plate}</p>
                            </div>
                            <a
                              href={`https://wa.me/${order.driver.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-500 text-white"
                              title="WhatsApp do Motoboy"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {order.customer.address && (
                          <p className="text-[11px] text-stone-600 bg-stone-50 p-2 rounded-lg">
                            📍 {order.customer.address.street}, {order.customer.address.number} ({order.customer.address.neighborhood})
                          </p>
                        )}

                        <button
                          onClick={() => onUpdateOrderStatus(order.id, 'entregue')}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirmar Entrega Concluída</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 4: Concluídos */}
              <div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-200 flex flex-col h-full min-h-[440px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200 mb-3">
                  <h3 className="font-extrabold text-emerald-950 text-xs sm:text-sm flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Entregues Hoje
                  </h3>
                  <span className="bg-emerald-200 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {finishedOrders.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {finishedOrders.length === 0 ? (
                    <div className="text-center py-12 text-stone-400">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">Nenhuma entrega finalizada hoje</p>
                    </div>
                  ) : (
                    finishedOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-stone-800">#{order.orderNumber}</span> - {order.customer.name}
                          <span className="text-[10px] text-stone-400 block">
                            {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {order.customer.address?.neighborhood}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-emerald-700">
                            {formatCurrency(order.total)}
                          </span>
                          <button
                            onClick={() => setSelectedReceiptOrder(order)}
                            className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
                            title="Reimprimir Comanda"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MENU MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-stone-900">Gestão de Cardápio</h2>
                <p className="text-xs text-stone-500">
                  Adicione novos pratos, ajuste preços, tags e controle a disponibilidade
                </p>
              </div>
              <button
                id="add-new-dish-btn"
                onClick={() => handleOpenDishModal()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Novo Prato</span>
              </button>
            </div>

            {/* Menu Items Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                    <tr>
                      <th className="p-3.5">Prato / Imagem</th>
                      <th className="p-3.5">Categoria</th>
                      <th className="p-3.5">Preço</th>
                      <th className="p-3.5 text-center">Disponibilidade</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {menuItems.map((dish) => (
                      <tr key={dish.id} className="hover:bg-stone-50 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="w-12 h-12 rounded-xl object-cover bg-stone-100 flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <h4 className="font-bold text-stone-900">{dish.name}</h4>
                              <p className="text-stone-500 text-xs line-clamp-1 max-w-xs sm:max-w-md">
                                {dish.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize">
                            {dish.categoryId}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-stone-900">
                          {formatCurrency(dish.price)}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            id={`toggle-avail-${dish.id}`}
                            onClick={() => onToggleAvailability(dish.id)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              dish.available
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            }`}
                          >
                            {dish.available ? 'Disponível' : 'Esgotado'}
                          </button>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`edit-dish-${dish.id}`}
                              onClick={() => handleOpenDishModal(dish)}
                              className="p-2 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              id={`delete-dish-${dish.id}`}
                              onClick={() => {
                                if (confirm(`Deseja realmente excluir "${dish.name}"?`)) {
                                  onDeleteMenuItem(dish.id);
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DELIVERY ZONES & FEES */}
        {/* ========================================================================= */}
        {activeTab === 'zones' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-stone-900">Bairros Atendidos & Taxas de Entrega</h2>
                <p className="text-xs text-stone-500">
                  Configure as taxas de frete e prazos médios de entrega por bairro atendido
                </p>
              </div>
              <button
                id="add-zone-btn"
                onClick={() => handleOpenZoneModal()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Novo Bairro</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(localConfig.deliveryZones || []).map((zone) => (
                <div
                  key={zone.id}
                  className={`bg-white p-4 rounded-2xl border transition-all ${
                    zone.active ? 'border-stone-200 shadow-xs' : 'border-stone-200 opacity-60 bg-stone-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-stone-900 text-base">{zone.neighborhood}</h4>
                      <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-500" />
                        {zone.estimatedMinutes}
                      </p>
                    </div>
                    <span className="text-sm font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                      {formatCurrency(zone.fee)}
                    </span>
                  </div>

                  <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleToggleZoneActive(zone.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold ${
                        zone.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {zone.active ? 'Ativo' : 'Inativo'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenZoneModal(zone)}
                        className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteZone(zone.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DRIVER / MOTOBOY MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'drivers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-stone-900">Equipe de Entregadores (Motoboys)</h2>
                <p className="text-xs text-stone-500">
                  Cadastre os motoboys da sua frota e acompanhe disponibilidade em tempo real
                </p>
              </div>
              <button
                id="add-driver-btn"
                onClick={() => handleOpenDriverModal()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Entregador</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(localConfig.drivers || []).map((driver) => (
                <div
                  key={driver.id}
                  className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={driver.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={driver.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-400"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-extrabold text-stone-900 text-sm">{driver.name}</h4>
                      <p className="text-xs text-stone-500">{driver.vehicle} • {driver.plate}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-stone-50 p-2 rounded-xl">
                    <span className="text-stone-600 font-medium">WhatsApp: {driver.phone}</span>
                    <a
                      href={`https://wa.me/${driver.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
                      title="Chamar no WhatsApp"
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleDriverStatus(driver.id)}
                      className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
                        driver.status === 'available'
                          ? 'bg-emerald-100 text-emerald-800'
                          : driver.status === 'busy'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {driver.status === 'available' ? '🟢 Disponível' : driver.status === 'busy' ? '🟣 Em Entrega' : '⚪ Offline'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenDriverModal(driver)}
                        className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDriver(driver.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: RESTAURANT STORE CONFIGURATION */}
        {/* ========================================================================= */}
        {activeTab === 'config' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div>
              <h2 className="text-lg font-black text-stone-900">Configurações do Estabelecimento Delivery</h2>
              <p className="text-xs text-stone-500">
                Ajuste os dados cadastrais, pedido mínimo, chave Pix e WhatsApp
              </p>
            </div>

            {configSaved && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-bold">
                <Check className="w-4 h-4" />
                <span>Configurações salvas com sucesso!</span>
              </div>
            )}

            {/* Identidade Visual: logo e banner, com upload local de foto */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 text-xs sm:text-sm">
              <div>
                <h3 className="font-black text-stone-900 flex items-center gap-1.5">
                  <ImageOff className="w-4 h-4" />
                  Identidade Visual
                </h3>
                <p className="text-[11px] text-stone-500">
                  Logo e foto de capa exibidos no topo do cardápio deste restaurante
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUploadField
                  slug={slug}
                  token={token}
                  label="Logo do Restaurante"
                  value={localConfig.logo}
                  onChange={(url) => {
                    const updated = { ...localConfig, logo: url };
                    setLocalConfig(updated);
                    onUpdateConfig(updated);
                  }}
                  aspect="square"
                />
                <ImageUploadField
                  slug={slug}
                  token={token}
                  label="Foto de Capa (Banner)"
                  value={localConfig.bannerImage}
                  onChange={(url) => {
                    const updated = { ...localConfig, bannerImage: url };
                    setLocalConfig(updated);
                    onUpdateConfig(updated);
                  }}
                  aspect="wide"
                />
              </div>
            </div>

            {/* Splash de Boas-vindas: fotos em tela cheia mostradas por alguns
                segundos antes do cardápio abrir, estilo iFood/Uber Eats/Airbnb */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 text-xs sm:text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-stone-900 flex items-center gap-1.5">
                    <Images className="w-4 h-4" />
                    Splash de Boas-vindas
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Fotos em tela cheia (pratos, ambiente, promoções) mostradas por alguns
                    segundos antes do cliente ver o cardápio
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!localConfig.splashEnabled}
                    onChange={(e) => {
                      const updated = { ...localConfig, splashEnabled: e.target.checked };
                      setLocalConfig(updated);
                      onUpdateConfig(updated);
                    }}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-bold text-stone-800">Ativada</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(localConfig.splashImages || []).map((img, idx) => (
                  <div key={img + idx} className="relative rounded-xl overflow-hidden border border-stone-200 aspect-square group">
                    <img src={img} alt={`Splash ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...localConfig,
                          splashImages: (localConfig.splashImages || []).filter((_, i) => i !== idx),
                        };
                        setLocalConfig(updated);
                        onUpdateConfig(updated);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-lg bg-slate-950/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <ImageUploadField
                slug={slug}
                token={token}
                label={`Adicionar foto à sequência${(localConfig.splashImages?.length || 0) > 0 ? ` (${localConfig.splashImages!.length} já cadastradas)` : ''}`}
                value=""
                onChange={(url) => {
                  const updated = { ...localConfig, splashImages: [...(localConfig.splashImages || []), url] };
                  setLocalConfig(updated);
                  onUpdateConfig(updated);
                }}
                aspect="wide"
              />

              <div>
                <label className="block font-bold text-stone-700 mb-1">Segundos por foto</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={localConfig.splashDurationSeconds || 3}
                  onChange={(e) => {
                    const updated = { ...localConfig, splashDurationSeconds: parseInt(e.target.value) || 3 };
                    setLocalConfig(updated);
                    onUpdateConfig(updated);
                  }}
                  className="w-24 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Impressão: tamanho de papel padrão da impressora térmica.
                Impressão automática fica registrada aqui como preferência,
                mas depende de um driver/app de impressora do sistema
                operacional pra funcionar sem clique manual — o navegador
                sozinho não consegue imprimir silenciosamente. */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 text-xs sm:text-sm">
              <div>
                <h3 className="font-black text-stone-900 flex items-center gap-1.5">
                  <Printer className="w-4 h-4" />
                  Impressão
                </h3>
                <p className="text-[11px] text-stone-500">
                  Tamanho padrão do papel da impressora térmica usada no restaurante
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(['58mm', '80mm'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      const updated = { ...localConfig, printPaperWidth: w };
                      setLocalConfig(updated);
                      onUpdateConfig(updated);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      (localConfig.printPaperWidth || '80mm') === w
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={!!localConfig.printAutoNewOrders}
                  onChange={(e) => {
                    const updated = { ...localConfig, printAutoNewOrders: e.target.checked };
                    setLocalConfig(updated);
                    onUpdateConfig(updated);
                  }}
                  className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                />
                <span>
                  <span className="font-bold text-stone-800 block">Impressão automática de novos pedidos</span>
                  <span className="text-[11px] text-stone-500">
                    Guarda a preferência pra quando houver um app/driver de impressora instalado no
                    computador da cozinha. Sozinho, o navegador não consegue mandar imprimir sem um
                    clique — por segurança, nenhum site pode acionar sua impressora sem confirmação.
                  </span>
                </span>
              </label>
            </div>

            <form onSubmit={handleSaveConfig} className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nome do Estabelecimento</label>
                  <input
                    type="text"
                    value={localConfig.name}
                    onChange={(e) => setLocalConfig({ ...localConfig, name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Slogan / Descrição Curta</label>
                  <input
                    type="text"
                    value={localConfig.tagline}
                    onChange={(e) => setLocalConfig({ ...localConfig, tagline: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Número do WhatsApp (com DDD)</label>
                  <input
                    type="text"
                    value={localConfig.whatsapp}
                    onChange={(e) => setLocalConfig({ ...localConfig, whatsapp: e.target.value })}
                    placeholder="5511987654321"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Endereço da Cozinha / Loja</label>
                  <input
                    type="text"
                    value={localConfig.address}
                    onChange={(e) => setLocalConfig({ ...localConfig, address: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Pedido Mínimo Delivery (R$)</label>
                  <input
                    type="number"
                    step="1"
                    value={localConfig.minimumOrder || 25}
                    onChange={(e) => setLocalConfig({ ...localConfig, minimumOrder: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Frete Grátis a partir de (R$)</label>
                  <input
                    type="number"
                    step="5"
                    value={localConfig.freeDeliveryThreshold || 80}
                    onChange={(e) => setLocalConfig({ ...localConfig, freeDeliveryThreshold: parseFloat(e.target.value) || 80 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tempo Médio Estimado</label>
                  <input
                    type="text"
                    value={localConfig.estimatedDeliveryTime}
                    onChange={(e) => setLocalConfig({ ...localConfig, estimatedDeliveryTime: e.target.value })}
                    placeholder="30 - 45 min"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Chave Pix para Recebimentos</label>
                  <input
                    type="text"
                    value={localConfig.pixKey}
                    onChange={(e) => setLocalConfig({ ...localConfig, pixKey: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Horário de Funcionamento</label>
                  <input
                    type="text"
                    value={localConfig.openingHours}
                    onChange={(e) => setLocalConfig({ ...localConfig, openingHours: e.target.value })}
                    placeholder="Ter a Dom: 11:30 às 23:30"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.isOpen}
                    onChange={(e) => setLocalConfig({ ...localConfig, isOpen: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-bold text-stone-800">
                    Restaurante Aberto para Pedidos Delivery no Momento
                  </span>
                </label>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: METRICS & SALES DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === 'metrics' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-stone-900">Métricas & Faturamento do Delivery</h2>
              <p className="text-xs text-stone-500">
                Resumo analítico das vendas, taxa de entrega e desempenho dos pedidos
              </p>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500 uppercase">Faturamento Total</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-stone-900 mt-2">
                  {formatCurrency(totalRevenue)}
                </h3>
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                  ↑ Em tempo real
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500 uppercase">Total de Pedidos</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-stone-900 mt-2">
                  {validOrdersCount} pedidos
                </h3>
                <span className="text-[11px] text-stone-400 font-medium mt-1 block">
                  {finishedOrders.length} entregues com sucesso
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500 uppercase">Ticket Médio</span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-stone-900 mt-2">
                  {formatCurrency(averageTicket)}
                </h3>
                <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
                  Média por entrega
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500 uppercase">Total em Taxas Frete</span>
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <Bike className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-stone-900 mt-2">
                  {formatCurrency(deliveryRevenue)}
                </h3>
                <span className="text-[11px] text-purple-600 font-semibold mt-1 block">
                  Arrecadado em fretes
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: TOOLS HUB (CMV, QR CODE, BACKUP, SIMULATOR, PROMOTIONS) */}
        {/* ========================================================================= */}
        {activeTab === 'tools' && (
          <ToolsHub
            orders={orders}
            menuItems={menuItems}
            restaurantConfig={localConfig}
            onUpdateConfig={(newConfig) => {
              setLocalConfig(newConfig);
              onUpdateConfig(newConfig);
            }}
            onInjectDemoOrder={onInjectDemoOrder}
            onUpdateMenuItems={onUpdateMenuItems}
          />
        )}
      </main>

      {/* Dispatch Modal: Assign Driver */}
      {dispatchOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <Bike className="w-5 h-5 text-amber-500" />
                Despachar Pedido #{dispatchOrder.orderNumber}
              </h3>
              <button onClick={() => setDispatchOrder(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-2xl space-y-1">
              <p><strong>Cliente:</strong> {dispatchOrder.customer.name}</p>
              <p><strong>Endereço:</strong> {dispatchOrder.customer.address?.street}, {dispatchOrder.customer.address?.number} - {dispatchOrder.customer.address?.neighborhood}</p>
              <p><strong>Total:</strong> {formatCurrency(dispatchOrder.total)}</p>
            </div>

            <div>
              <label className="block font-bold text-stone-700 text-xs mb-1.5">
                Selecione o Motoboy para esta Entrega:
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {(localConfig.drivers || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.vehicle} - {d.plate}) - {d.status === 'available' ? '🟢 Disponível' : '🟣 Em rota'}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDispatchOrder(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDispatch}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Saída</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone Add/Edit Modal */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900">
                {editingZone ? `Editar Bairro: ${editingZone.neighborhood}` : 'Adicionar Novo Bairro'}
              </h3>
              <button onClick={() => setIsZoneModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZoneSubmit} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nome do Bairro *</label>
                <input
                  type="text"
                  required
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="Ex: Pinheiros, Jardins, Centro..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Taxa de Frete (R$) *</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={zoneFee}
                    onChange={(e) => setZoneFee(e.target.value)}
                    placeholder="8.00"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tempo Estimado</label>
                  <input
                    type="text"
                    value={zoneEstTime}
                    onChange={(e) => setZoneEstTime(e.target.value)}
                    placeholder="30 - 45 min"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs shadow-xs"
                >
                  Salvar Bairro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Add/Edit Modal */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900">
                {editingDriver ? `Editar: ${editingDriver.name}` : 'Cadastrar Novo Motoboy'}
              </h3>
              <button onClick={() => setIsDriverModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriverSubmit} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Ex: Carlos Andrade"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Placa da Moto</label>
                  <input
                    type="text"
                    value={driverPlate}
                    onChange={(e) => setDriverPlate(e.target.value)}
                    placeholder="BRA2E19"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Modelo da Moto / Veículo</label>
                <input
                  type="text"
                  value={driverVehicle}
                  onChange={(e) => setDriverVehicle(e.target.value)}
                  placeholder="Ex: Honda CG 160 Fan Vermelha"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <ImageUploadField
                  slug={slug}
                  token={token}
                  label="Foto de Perfil do Entregador"
                  value={driverPhoto}
                  onChange={setDriverPhoto}
                  aspect="square"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs shadow-xs"
                >
                  Salvar Entregador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dish Add/Edit Modal */}
      {isDishModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base">
                {editingDish ? `Editar: ${editingDish.name}` : 'Adicionar Novo Prato ao Cardápio'}
              </h3>
              <button
                onClick={() => setIsDishModalOpen(false)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDishSubmit} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nome do Prato *</label>
                <input
                  type="text"
                  required
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="Ex: Burger Bacon Supremo"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Categoria *</label>
                  <select
                    value={dishCategory}
                    onChange={(e) => setDishCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 capitalize"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    placeholder="39.90"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Descrição e Ingredientes</label>
                <textarea
                  rows={2}
                  value={dishDescription}
                  onChange={(e) => setDishDescription(e.target.value)}
                  placeholder="Descreva os ingredientes frescos e detalhes do preparo..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <ImageUploadField
                  slug={slug}
                  token={token}
                  label="Foto do Prato"
                  value={dishImage}
                  onChange={setDishImage}
                  aspect="wide"
                />
                <details className="mt-1.5">
                  <summary className="text-[11px] text-stone-400 cursor-pointer hover:text-stone-600">
                    ou usar uma URL de imagem existente
                  </summary>
                  <input
                    type="url"
                    value={dishImage}
                    onChange={(e) => setDishImage(e.target.value)}
                    placeholder="https://..."
                    className="mt-1.5 w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </details>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tempo de Preparo (min)</label>
                  <input
                    type="number"
                    value={dishPrepTime}
                    onChange={(e) => setDishPrepTime(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Serve quantas pessoas?</label>
                  <input
                    type="number"
                    value={dishServes}
                    onChange={(e) => setDishServes(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDishModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold shadow-xs"
                >
                  {editingDish ? 'Salvar Alterações' : 'Adicionar Prato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Impressão do pedido (cozinha / entrega / cliente) */}
      {selectedReceiptOrder && (
        <ReceiptPrintModal
          order={selectedReceiptOrder}
          restaurantConfig={localConfig}
          onClose={() => setSelectedReceiptOrder(null)}
          alreadyPrinted={printedOrderIds.has(selectedReceiptOrder.id)}
          onPrinted={() => {
            setPrintedOrderIds((prev) => new Set(prev).add(selectedReceiptOrder.id));
          }}
        />
      )}
    </div>
  );
};
