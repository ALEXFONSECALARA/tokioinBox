import React from 'react';
import { RestaurantConfig, DietaryTag, DeliveryAddress } from '../types';
import { getBadgeInfo, formatCurrency, DEFAULT_BADGES } from '../utils/helpers';
import { 
  Search, 
  Clock, 
  MapPin, 
  Bike, 
  Star, 
  Phone, 
  Instagram, 
  Heart,
  X,
  ChevronRight,
  ShieldCheck,
  Percent,
  User,
  Bell,
  BellRing
} from 'lucide-react';

interface HeaderProps {
  config: RestaurantConfig;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTag: DietaryTag | null;
  onTagSelect: (tag: DietaryTag | null) => void;
  currentAddress: DeliveryAddress | null;
  onOpenAddressModal: () => void;
  favoritesCount: number;
  onOpenFavorites: () => void;
  // Já eram passadas pelo App.tsx, mas não existiam nesta interface (bug
  // pré-existente, sem relação com a Fase 4) — corrigido aqui de passagem.
  activeOrdersCount?: number;
  onOpenOrders?: () => void;
  // Conta do cliente (Fase 4, itens 20-22) — opcional: some do header se o
  // App.tsx não passar (sem quebrar nenhum uso existente do componente).
  isCustomerLoggedIn?: boolean;
  onOpenAccount?: () => void;
  // Notificações push (Fase 4, item 27) — opcional, some do header se o
  // App.tsx não passar (sem quebrar nenhum uso existente do componente).
  isPushOn?: boolean;
  onTogglePush?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagSelect,
  currentAddress,
  onOpenAddressModal,
  favoritesCount,
  onOpenFavorites,
  activeOrdersCount = 0,
  onOpenOrders,
  isCustomerLoggedIn = false,
  onOpenAccount,
  isPushOn = false,
  onTogglePush,
}) => {
  // Find current zone
  const activeZone = currentAddress
    ? config.deliveryZones.find((z) =>
        z.name.toLowerCase().includes(currentAddress.neighborhood.toLowerCase()) ||
        currentAddress.neighborhood.toLowerCase().includes(z.name.toLowerCase())
      )
    : config.deliveryZones[0];

  const currentFee = activeZone ? activeZone.fee : config.deliveryFee;
  const currentTime = activeZone ? activeZone.estimatedTime : config.estimatedDeliveryTime;

  return (
    <header className="bg-white border-b border-stone-200">
      {/* Top Sticky Delivery Address Selector Bar */}
      <div className="bg-[var(--brand)] text-slate-950 px-3 sm:px-6 py-2 flex items-center justify-between text-xs font-black shadow-xs">
        <button
          id="header-delivery-address-trigger"
          onClick={onOpenAddressModal}
          className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity text-left max-w-[80%]"
        >
          <div className="p-1 rounded-lg bg-slate-950 text-[var(--brand-light)]">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="opacity-75 text-[10px] uppercase tracking-wider block font-bold">
              Entregar em:
            </span>
            <span className="font-extrabold truncate block">
              {currentAddress
                ? `${currentAddress.street}, ${currentAddress.number} - ${currentAddress.neighborhood}`
                : 'Definir endereço de entrega (Clique para calcular taxa)'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-70 flex-shrink-0" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1 bg-slate-950 text-[var(--brand-light)] px-2.5 py-1 rounded-full text-[11px] font-bold">
            <Bike className="w-3.5 h-3.5" />
            Taxa: {currentFee === 0 ? 'GRÁTIS' : formatCurrency(currentFee)}
          </span>
          <span className="bg-white/30 backdrop-blur-xs text-slate-950 px-2 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {currentTime}
          </span>
        </div>
      </div>

      {/* Hero Banner with Restaurant Cover Image */}
      <div className="relative h-40 sm:h-52 md:h-60 w-full overflow-hidden bg-stone-900">
        <img
          src={config.bannerImage}
          alt={config.name}
          className="w-full h-full object-cover transition-transform duration-700"
          style={{
            objectPosition: `${config.bannerPositionX ?? 50}% ${config.bannerPositionY ?? 50}%`,
            transform: `scale(${(config.bannerZoom ?? 105) / 100})`,
          }}
          referrerPolicy="no-referrer"
        />
        {/* Overlay escuro configurável (padrão 60%, igual ao valor fixo anterior) somado
            ao degradê de legibilidade de baixo pra cima — nunca deforma a imagem. */}
        <div
          className="absolute inset-0 bg-stone-950"
          style={{ opacity: (config.bannerOverlay ?? 60) / 100 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent" />
        {config.bannerText && (
          <p className="absolute bottom-3 left-3 right-3 text-white/90 text-xs sm:text-sm font-semibold drop-shadow-lg line-clamp-2">
            {config.bannerText}
          </p>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm flex items-center gap-1.5 ${
                config.isOpen ? 'bg-emerald-500 text-white' : 'bg-[var(--accent-red)] text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${config.isOpen ? 'bg-white animate-pulse' : 'bg-white'}`} />
              {config.isOpen ? 'Aberto p/ Delivery' : 'Fechado no Momento'}
            </span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            {onTogglePush && (
              <button
                id="header-push-btn"
                onClick={onTogglePush}
                className="bg-black/50 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/70 transition-all border border-white/20 relative"
                title={isPushOn ? 'Notificações ativadas' : 'Ativar notificações'}
              >
                {isPushOn ? (
                  <BellRing className="w-4 h-4 text-amber-400" />
                ) : (
                  <Bell className="w-4 h-4 text-white" />
                )}
              </button>
            )}
            {onOpenAccount && (
              <button
                id="header-account-btn"
                onClick={onOpenAccount}
                className="bg-black/50 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/70 transition-all border border-white/20 relative"
                title="Minha Conta"
              >
                <User className={`w-4 h-4 ${isCustomerLoggedIn ? 'text-emerald-400' : 'text-white'}`} />
                {isCustomerLoggedIn && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black/50" />
                )}
              </button>
            )}
            <button
              id="header-favorites-btn"
              onClick={onOpenFavorites}
              className="bg-black/50 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/70 transition-all border border-white/20 relative"
              title="Pratos Favoritos"
            >
              <Heart className={`w-4 h-4 ${favoritesCount > 0 ? 'fill-[var(--accent-red)] text-[var(--accent-red)]' : 'text-white'}`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--accent-red)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Restaurant Info Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-10 sm:-mt-12 relative z-10 pb-4">
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <img
              src={config.logo}
              alt={config.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-md flex-shrink-0 bg-stone-100"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  {config.name}
                </h1>
                <div className="flex items-center gap-1 bg-[var(--brand-tint)] border border-[var(--brand-tint)] text-amber-900 px-2 py-0.5 rounded-md text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-[var(--brand-light)] text-[var(--brand)]" />
                  <span>4.9 • 850+ entregas</span>
                </div>
              </div>
              <p className="text-stone-600 text-xs sm:text-sm mt-1 leading-relaxed line-clamp-1 sm:line-clamp-none">
                {config.tagline}
              </p>

              {/* Delivery info pills */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-2 sm:gap-x-3 text-xs text-stone-600 mt-2">
                <span className="flex items-center gap-1 bg-stone-100 px-2.5 py-0.5 rounded-md font-semibold">
                  <Bike className="w-3.5 h-3.5 text-[var(--brand-dark)]" />
                  <span>{currentFee === 0 ? 'Frete Grátis' : `Taxa: ${formatCurrency(currentFee)}`}</span>
                </span>
                <span className="flex items-center gap-1 bg-stone-100 px-2.5 py-0.5 rounded-md font-semibold">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  <span>{currentTime}</span>
                </span>
                {(config.freeDeliveryEnabled ?? true) && (
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md font-bold">
                    <Percent className="w-3 h-3 text-emerald-600" />
                    <span>Grátis acima de {formatCurrency(config.freeDeliveryThreshold || 80)}</span>
                  </span>
                )}
                <span className="hidden lg:flex items-center gap-1 text-stone-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                  <span>Pedido mín: {formatCurrency(config.minimumOrder || 25)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Direct WhatsApp Contact button */}
          <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100 flex-wrap">
            <a
              href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Gostaria de tirar uma dúvida sobre o cardápio de delivery do ${config.name}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Phone className="w-4 h-4" />
              <span>WhatsApp da Loja</span>
            </a>

            {config.instagram && (
              <a
                href={`https://instagram.com/${config.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs transition-all"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Search & Dietary Filter Bar */}
        <div className="mt-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-input-menu"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar no cardápio de delivery (hambúrgueres, pizzas, combos, bebidas...)"
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dietary / Highlight Filter Tags Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              id="filter-tag-all"
              onClick={() => onTagSelect(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTag === null
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Todos os Itens
            </button>

            {(config.badges && config.badges.length > 0 ? config.badges : DEFAULT_BADGES)
              .filter((b) => b.active !== false)
              .map((badge) => {
                const tag = badge.id;
                const info = getBadgeInfo(tag, config);
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    id={`filter-tag-${tag}`}
                    onClick={() => onTagSelect(isSelected ? null : tag)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-1"
                    style={
                      isSelected
                        ? { backgroundColor: info.color, color: '#fff', borderColor: info.color }
                        : { backgroundColor: `${info.color}14`, color: info.color, borderColor: `${info.color}40` }
                    }
                  >
                    <span>
                      {info.emoji ? `${info.emoji} ` : ''}
                      {info.label}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </header>
  );
};

