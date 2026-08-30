export type DietaryTag = 'vegetariano' | 'vegano' | 'sem_gluten' | 'sem_lactose' | 'picante' | 'mais_vendido' | 'destaque' | 'novidade' | 'organico';

export interface ExtraOption {
  id: string;
  name: string;
  price: number;
  maxQuantity?: number;
}

export interface ChoiceGroup {
  id: string;
  title: string;
  required: boolean;
  minChoices?: number;
  maxChoices?: number;
  options: {
    id: string;
    name: string;
    price: number;
  }[];
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  available: boolean;
  tags: DietaryTag[];
  preparationTimeMinutes?: number;
  servesCount?: number;
  calories?: number;
  choices?: ChoiceGroup[];
  extras?: ExtraOption[];
  allowSpecialNotes?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export interface SelectedChoice {
  groupId: string;
  groupTitle: string;
  optionId: string;
  optionName: string;
  price: number;
}

export interface SelectedExtra {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedChoices: SelectedChoice[];
  selectedExtras: SelectedExtra[];
  specialNotes?: string;
  unitPrice: number;
  totalPrice: number;
}

export type OrderType = 'delivery' | 'takeaway' | 'table';
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'meal_voucher';
export type OrderStatus = 'recebido' | 'em_preparo' | 'saiu_entrega' | 'pronto' | 'entregue' | 'cancelado';

export interface DeliveryZone {
  id: string;
  name?: string;
  neighborhood: string;
  fee: number;
  estimatedTime?: string;
  estimatedMinutes?: string;
  active?: boolean;
  minOrder?: number;
}

export interface DeliveryAddress {
  cep?: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state?: string;
  complement?: string;
  reference?: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plate?: string;
  photo?: string;
  status?: 'available' | 'busy' | 'offline';
  rating?: number;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  address?: DeliveryAddress;
  tableNumber?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  couponCode?: string;
  total: number;
  orderType: OrderType;
  customer: OrderCustomer;
  paymentMethod: PaymentMethod;
  cardBrand?: string;
  cashChangeFor?: number;
  status: OrderStatus;
  driver?: DriverInfo;
  estimatedMinutes?: number;
  cancelReason?: string;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  notes?: string;
}

// Os 10 estilos visuais que o restaurante pode escolher para a própria
// identidade (aplicado ao card dele na vitrine multi-restaurantes "/" e,
// futuramente, ao cabeçalho do próprio cardápio). Ver src/utils/layouts.ts
// para a definição visual de cada um.
export type LayoutId =
  | 'moderno-premium'
  | 'rustico-acolhedor'
  | 'clean-minimalista'
  | 'dark-elegante'
  | 'hero-food'
  | 'soft-moderno'
  | 'vibrante-food'
  | 'natural-organico'
  | 'neon-urbano'
  | 'galeria-gourmet';

// Uma foto da sequência de abertura (Splash), com ajuste individual de
// enquadramento. Substitui gradualmente o formato antigo (string[] de URLs) —
// ver normalizeSplashImage() em utils/helpers.ts, que aceita os dois formatos
// pra nunca quebrar restaurantes já cadastrados.
export interface SplashImageConfig {
  url: string;
  positionX?: number; // 0-100, posição horizontal do enquadramento (object-position)
  positionY?: number; // 0-100, posição vertical do enquadramento
  zoom?: number; // 100 = sem zoom, 100-200 = aproxima a imagem
  overlay?: number; // 0-100, escurecimento adicional sobre a foto
  text?: string; // legenda opcional exibida sobre a foto
  enabled?: boolean; // permite desativar uma foto sem removê-la da lista
}

export interface RestaurantConfig {
  name: string;
  tagline: string;
  logo: string;
  bannerImage: string;
  // Ajuste fino da capa (banner) — evita que a foto fique deformada ou corte
  // a parte importante da comida/identidade em telas de proporções diferentes.
  bannerPositionX?: number; // 0-100
  bannerPositionY?: number; // 0-100
  bannerZoom?: number; // 100-200
  bannerOverlay?: number; // 0-100
  bannerText?: string; // texto opcional sobreposto à capa (ex: chamada/promoção)
  // Identidade visual: cor principal e secundária do restaurante, usadas nos
  // cards da vitrine multi-restaurantes (nunca fixas/douradas por padrão).
  color?: string;
  secondaryColor?: string;
  // Estilo visual escolhido pelo restaurante entre os 10 disponíveis.
  layout?: LayoutId;
  phone: string;
  whatsapp: string;
  address: string;
  isOpen: boolean;
  openingHours: string;
  deliveryFee: number;
  freeDeliveryThreshold?: number;
  freeDeliveryEnabled?: boolean; // default true (compat) — desliga a promoção sem apagar o valor
  minimumOrder: number;
  estimatedDeliveryTime: string;
  deliveryZones: DeliveryZone[];
  drivers: DriverInfo[];
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  instagram: string;
  allowTableOrders: boolean;
  totalTables: number;
  // Tela de abertura em tela cheia (fotos de pratos/ambiente/promoções) exibida
  // por alguns segundos antes do cardápio, estilo iFood/Uber Eats/Airbnb.
  splashEnabled?: boolean;
  // Aceita o formato novo (objetos com ajuste individual) e o antigo
  // (string[] de URLs) ao mesmo tempo — ver normalizeSplashImage().
  splashImages?: (string | SplashImageConfig)[];
  splashDurationSeconds?: number;
  // Configurações → Impressão: tamanho do papel da impressora térmica e
  // impressão automática de novos pedidos (a automação de fato — sem clique
  // manual — depende de driver/app da impressora do sistema operacional;
  // aqui só guardamos a preferência pra usar quando essa integração existir).
  printPaperWidth?: '58mm' | '80mm';
  printAutoNewOrders?: boolean;
  // Item pedido: banner de promoções acima do cardápio deixa de ter texto fixo
  // ("Entrega Rápida...", cupom BEMVINDO10) e vira uma lista configurável.
  // Sem essa lista (restaurantes antigos), o banner simplesmente não aparece —
  // nenhum texto fixo é mais mostrado por padrão.
  promoBadges?: PromoBadge[];
}

export interface PromoBadge {
  id: string;
  icon?: string; // um emoji simples, opcional (ex: "🛵", "🎉")
  title: string;
  subtitle?: string;
  couponCode?: string; // opcional — se preenchido, mostra botão "Aplicar" ligado a um cupom já cadastrado
}
