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
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  notes?: string;
}

export interface RestaurantConfig {
  name: string;
  tagline: string;
  logo: string;
  bannerImage: string;
  phone: string;
  whatsapp: string;
  address: string;
  isOpen: boolean;
  openingHours: string;
  deliveryFee: number;
  freeDeliveryThreshold?: number;
  minimumOrder: number;
  estimatedDeliveryTime: string;
  deliveryZones: DeliveryZone[];
  drivers: DriverInfo[];
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  instagram: string;
  allowTableOrders: boolean;
  totalTables: number;
}

export type ActivePlatformView = 'customer' | 'admin' | 'kiosk' | 'table';
export type DeviceFrame = 'fluid' | 'mobile' | 'tablet' | 'desktop';
