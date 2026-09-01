import { CartItem, Order, RestaurantConfig, SplashImageConfig, RestaurantBadge, DeliveryAddress, DeliveryCalcMethod } from '../types';

// Restaurantes antigos guardam splashImages como string[] (só a URL). Esta
// função normaliza qualquer item (string OU objeto) pro formato novo, com
// valores padrão neutros, sem nunca precisar migrar/reescrever os dados
// salvos — os dois formatos convivem em paz.
export const normalizeSplashImage = (img: string | SplashImageConfig): SplashImageConfig => {
  if (typeof img === 'string') {
    return { url: img, positionX: 50, positionY: 50, zoom: 100, overlay: 0, text: '', enabled: true };
  }
  return {
    url: img.url,
    positionX: img.positionX ?? 50,
    positionY: img.positionY ?? 50,
    zoom: img.zoom ?? 100,
    overlay: img.overlay ?? 0,
    text: img.text ?? '',
    enabled: img.enabled ?? true,
  };
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Nota: existiu aqui uma `getDietaryTagInfo` fixa com 9 valores de badge
// hardcoded. Foi substituída por `getBadgeInfo` abaixo (Fase 4, itens 5/6),
// que resolve a mesma informação a partir da biblioteca editável do
// restaurante — sem duas fontes de verdade pro mesmo dado.

// Biblioteca padrão de badges (Fase 4, itens 5/6) — usada como fallback pra
// restaurantes que ainda não personalizaram `restaurantConfig.badges`. Os
// IDs batem com os valores antigos de DietaryTag de propósito: um item
// salvo antes desta mudança com tags:['vegano'] continua resolvendo pro
// badge certo sem precisar de nenhuma migração de dados.
export const DEFAULT_BADGES: RestaurantBadge[] = [
  { id: 'mais_vendido', label: 'Mais Pedido', emoji: '⭐', color: '#ea580c', active: true },
  { id: 'destaque', label: 'Destaque Chef', emoji: '✨', color: '#7c3aed', active: true },
  { id: 'novidade', label: 'Novidade', emoji: '🔥', color: '#e11d48', active: true },
  { id: 'vegetariano', label: 'Vegetariano', emoji: '🌱', color: '#059669', active: true },
  { id: 'vegano', label: 'Vegano', emoji: '🌿', color: '#16a34a', active: true },
  { id: 'sem_gluten', label: 'Sem Glúten', emoji: '🌾', color: '#d97706', active: true },
  { id: 'sem_lactose', label: 'Sem Lactose', emoji: '🥛', color: '#2563eb', active: true },
  { id: 'picante', label: 'Picante', emoji: '🌶️', color: '#dc2626', active: true },
];

// Resolve um badge (id salvo em item.tags) pra exibição, priorizando a
// biblioteca editável do restaurante (restaurantConfig.badges) e caindo pra
// DEFAULT_BADGES quando o restaurante nunca personalizou nada — e, no pior
// caso (badge apagado depois de já usado em algum prato), mostra o próprio
// id como rótulo em vez de sumir silenciosamente.
export const getBadgeInfo = (
  badgeId: string,
  restaurantConfig?: Pick<RestaurantConfig, 'badges'> | null
): RestaurantBadge => {
  const fromRestaurant = restaurantConfig?.badges?.find((b) => b.id === badgeId);
  if (fromRestaurant) return fromRestaurant;
  const fromDefaults = DEFAULT_BADGES.find((b) => b.id === badgeId);
  if (fromDefaults) return fromDefaults;
  return { id: badgeId, label: badgeId, color: '#78716c', active: true };
};

// Web Audio sound synthesizer for instant alerts
export const playSoundEffect = (type: 'beep' | 'success' | 'bell' | 'notification') => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'bell') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (type === 'notification') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {
    // Ignore audio context errors in quiet mode
  }
};

export const generateWhatsAppOrderUrl = (order: Order, config: RestaurantConfig): string => {
  const cleanPhone = config.whatsapp.replace(/\D/g, '');
  let message = `🛵 *NOVO PEDIDO DELIVERY #${order.orderNumber}* - ${config.name}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  
  message += `👤 *Cliente:* ${order.customer.name}\n`;
  message += `📱 *Telefone/WhatsApp:* ${order.customer.phone}\n`;
  if (order.customer.address) {
    const addr = order.customer.address;
    message += `📍 *Endereço de Entrega:*\n`;
    message += `   ${addr.street}, ${addr.number}`;
    if (addr.complement) message += ` (${addr.complement})`;
    message += `\n   Bairro: *${addr.neighborhood}* - ${addr.city}/${addr.state}\n`;
    if (addr.cep) message += `   CEP: ${addr.cep}\n`;
    if (addr.reference) message += `   📌 Ponto de Ref: ${addr.reference}\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🛒 *ITENS DO PEDIDO:*\n\n`;

  order.items.forEach((item, index) => {
    message += `${index + 1}. *${item.quantity}x ${item.menuItem.name}* - ${formatCurrency(item.totalPrice)}\n`;
    
    if (item.selectedChoices && item.selectedChoices.length > 0) {
      item.selectedChoices.forEach((choice) => {
        message += `   ▪ ${choice.groupTitle}: ${choice.optionName}${choice.price > 0 ? ` (+${formatCurrency(choice.price)})` : ''}\n`;
      });
    }

    if (item.selectedExtras && item.selectedExtras.length > 0) {
      item.selectedExtras.forEach((extra) => {
        message += `   ▪ Adicional: ${extra.quantity}x ${extra.name} (+${formatCurrency(extra.price * extra.quantity)})\n`;
      });
    }

    if (item.specialNotes && item.specialNotes.trim()) {
      message += `   📝 _Obs: ${item.specialNotes.trim()}_\n`;
    }
    message += `\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *Subtotal dos Itens:* ${formatCurrency(order.subtotal)}\n`;
  message += `🛵 *Taxa de Entrega:* ${order.deliveryFee === 0 ? 'GRÁTIS' : formatCurrency(order.deliveryFee)}\n`;
  
  if (order.discount > 0) {
    message += `🏷️ *Desconto (${order.couponCode || 'Cupom'}):* -${formatCurrency(order.discount)}\n`;
  }
  message += `💳 *TOTAL A PAGAR: ${formatCurrency(order.total)}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;

  const paymentLabels: Record<string, string> = {
    pix: `Pix (Chave: ${config.pixKey})`,
    credit_card: 'Cartão de Crédito na Entrega',
    debit_card: 'Cartão de Débito na Entrega',
    cash: 'Dinheiro na Entrega',
  };

  message += `💳 *Forma de Pagamento:* ${paymentLabels[order.paymentMethod] || order.paymentMethod}\n`;
  if (order.paymentMethod === 'cash' && order.cashChangeFor) {
    message += `💵 *Troco para:* ${formatCurrency(order.cashChangeFor)} (Levar troco de: ${formatCurrency(order.cashChangeFor - order.total)})\n`;
  }

  if (order.notes && order.notes.trim()) {
    message += `\n💬 *Observações:* ${order.notes}\n`;
  }

  message += `\n_Pedido realizado pelo App Delivery ${config.name}_`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
};

export const COUPONS: Record<string, { code: string; discountPercent?: number; fixedDiscount?: number; minTotal: number; description: string }> = {
  BEMVINDO10: { code: 'BEMVINDO10', discountPercent: 10, minTotal: 30, description: '10% de desconto em pedidos acima de R$ 30' },
  SABOR15: { code: 'SABOR15', discountPercent: 15, minTotal: 60, description: '15% de desconto em pedidos acima de R$ 60' },
  PRIMEIRACOMPRA: { code: 'PRIMEIRACOMPRA', fixedDiscount: 10, minTotal: 40, description: 'R$ 10 OFF na sua primeira compra' },
  FRETEGRATIS: { code: 'FRETEGRATIS', fixedDiscount: 7.50, minTotal: 50, description: 'Frete grátis para pedidos acima de R$ 50' },
};

export const getOrderStatusLabel = (status: Order['status']): { label: string; color: string; step: number } => {
  switch (status) {
    case 'recebido':
      return { label: 'Pedido Recebido', color: 'bg-amber-100 text-amber-800 border-amber-200', step: 1 };
    case 'em_preparo':
      return { label: 'Em Preparação na Cozinha', color: 'bg-blue-100 text-blue-800 border-blue-200', step: 2 };
    case 'saiu_entrega':
      return { label: 'Saiu para Entrega 🛵', color: 'bg-purple-100 text-purple-800 border-purple-200', step: 3 };
    case 'pronto':
      return { label: 'Pronto para Retirada / Servir', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', step: 3 };
    case 'entregue':
      return { label: 'Entregue / Concluído', color: 'bg-emerald-600 text-white border-emerald-600', step: 4 };
    case 'cancelado':
      return { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-200', step: 0 };
    default:
      return { label: 'Status Desconhecido', color: 'bg-gray-100 text-gray-800 border-gray-200', step: 1 };
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Motor de cálculo de entrega (Fase 4, itens 9-13)
// ═══════════════════════════════════════════════════════════════════════
// Decide taxa e tempo de entrega a partir do endereço do cliente, segundo o
// método que o restaurante escolheu (bairro/CEP/distância/fórmula/híbrido).
// Tudo aqui é aditivo: um restaurante que nunca configurou nada continua
// caindo no método 'neighborhood', exatamente como sempre funcionou.

export interface DeliveryCalcResult {
  // null = não deu pra calcular com o que se tem (endereço incompleto pro
  // método escolhido) — diferente de `outOfRange: true`, que é "calculou e
  // descobriu que está fora da área atendida" (item 12).
  fee: number | null;
  etaMinutes: { prep: number; delivery: number; total: number } | null;
  methodUsed: DeliveryCalcMethod | null;
  outOfRange: boolean;
  distanceKm?: number;
}

// Distância em linha reta entre dois pontos (fórmula de Haversine) — usada
// pelos métodos 'distance' e 'formula'. Precisão suficiente pra faixas de
// entrega em km; não é rota real de rua, só a distância geográfica.
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceFromRestaurant(config: RestaurantConfig, address: Partial<DeliveryAddress>): number | null {
  const loc = config.restaurantLocation;
  if (loc?.lat == null || loc?.lng == null || address.lat == null || address.lng == null) return null;
  return haversineDistanceKm(loc.lat, loc.lng, address.lat, address.lng);
}

// "45-55 min" / "45" -> {prep 20 (default), delivery total-20} — os campos
// antigos de zona (estimatedMinutes) nunca separavam preparo de entrega, só
// os novos DistanceTier separam de verdade (item 13). Aqui é só pra manter
// os métodos antigos (bairro/CEP) mostrando alguma estimativa coerente.
function parseLegacyEta(estimatedMinutes?: string): { prep: number; delivery: number; total: number } | null {
  if (!estimatedMinutes) return null;
  const nums = estimatedMinutes.match(/\d+/g)?.map(Number);
  if (!nums || nums.length === 0) return null;
  const total = nums.length > 1 ? Math.round((nums[0] + nums[1]) / 2) : nums[0];
  const prep = Math.min(20, total);
  return { prep, delivery: Math.max(0, total - prep), total };
}

function tryNeighborhoodMethod(config: RestaurantConfig, address: Partial<DeliveryAddress>): DeliveryCalcResult | null {
  const name = (address.neighborhood || '').trim().toLowerCase();
  if (!name) return null;
  // Mesmo casamento "contém" já usado no checkout antes desta mudança
  // (zona "Centro" bate com bairro "Centro Histórico" e vice-versa) — mantido
  // aqui pra não mudar o comportamento de quem já usa bairro hoje. `z.name`
  // é opcional no tipo mas pode faltar em zonas antigas; usamos `neighborhood`
  // como respaldo pra não quebrar nesse caso (bug preexistente corrigido).
  const zone = (config.deliveryZones || []).find((z) => {
    if (z.active === false) return false;
    const zoneName = (z.name || z.neighborhood || '').trim().toLowerCase();
    if (!zoneName) return false;
    return zoneName.includes(name) || name.includes(zoneName);
  });
  if (!zone) return null;
  return { fee: zone.fee, etaMinutes: parseLegacyEta(zone.estimatedMinutes), methodUsed: 'neighborhood', outOfRange: false };
}

function tryCepMethod(config: RestaurantConfig, address: Partial<DeliveryAddress>): DeliveryCalcResult | null {
  const cep = (address.cep || '').replace(/\D/g, '');
  if (cep.length !== 8) return null;
  const cepNum = parseInt(cep, 10);
  const range = (config.cepRanges || []).find((r) => {
    if (r.active === false) return false;
    const start = parseInt((r.cepStart || '').replace(/\D/g, ''), 10);
    const end = parseInt((r.cepEnd || '').replace(/\D/g, ''), 10);
    return !isNaN(start) && !isNaN(end) && cepNum >= start && cepNum <= end;
  });
  if (!range) return null;
  return { fee: range.fee, etaMinutes: parseLegacyEta(range.estimatedMinutes), methodUsed: 'cep', outOfRange: false };
}

function tryDistanceMethod(config: RestaurantConfig, address: Partial<DeliveryAddress>): DeliveryCalcResult | null {
  const dist = distanceFromRestaurant(config, address);
  if (dist === null) return null;
  const tier = (config.distanceTiers || []).find((t) => t.active !== false && dist >= t.fromKm && dist < t.toKm);
  if (!tier) return null;
  const etaMinutes =
    tier.prepMinutes != null && tier.deliveryMinutes != null
      ? { prep: tier.prepMinutes, delivery: tier.deliveryMinutes, total: tier.prepMinutes + tier.deliveryMinutes }
      : null;
  return { fee: tier.fee, etaMinutes, methodUsed: 'distance', outOfRange: false, distanceKm: dist };
}

function tryFormulaMethod(config: RestaurantConfig, address: Partial<DeliveryAddress>): DeliveryCalcResult | null {
  const dist = distanceFromRestaurant(config, address);
  if (dist === null || !config.deliveryFormula) return null;
  const { baseFee, includedKm, extraFeePerKm } = config.deliveryFormula;
  const extraKm = Math.max(0, dist - includedKm);
  const fee = Math.round((baseFee + extraKm * extraFeePerKm) * 100) / 100;
  return { fee, etaMinutes: null, methodUsed: 'formula', outOfRange: false, distanceKm: dist };
}

const METHOD_TRY_FNS: Record<Exclude<DeliveryCalcMethod, 'hybrid'>, (c: RestaurantConfig, a: Partial<DeliveryAddress>) => DeliveryCalcResult | null> = {
  neighborhood: tryNeighborhoodMethod,
  cep: tryCepMethod,
  distance: tryDistanceMethod,
  formula: tryFormulaMethod,
};

// Ponto de entrada do motor. Chame com a config do restaurante e o endereço
// (parcial) do cliente — funciona com o que estiver disponível (nem todo
// endereço vai ter lat/lng, por exemplo).
export function calculateDeliveryFee(config: RestaurantConfig, address: Partial<DeliveryAddress>): DeliveryCalcResult {
  const method = config.deliveryCalcMethod || 'neighborhood';
  const sequence: Exclude<DeliveryCalcMethod, 'hybrid'>[] =
    method === 'hybrid'
      ? ((config.deliveryHybridPriority?.filter((m): m is Exclude<DeliveryCalcMethod, 'hybrid'> => m !== 'hybrid') || [
          'cep',
          'neighborhood',
          'distance',
        ]) as Exclude<DeliveryCalcMethod, 'hybrid'>[])
      : [method as Exclude<DeliveryCalcMethod, 'hybrid'>];

  for (const m of sequence) {
    const result = METHOD_TRY_FNS[m]?.(config, address);
    if (result) return result;
  }

  // Nenhum método resolveu o endereço — item 12: NUNCA cai pra primeira zona
  // cadastrada como se fosse um match. Se dá pra saber a distância e ela
  // ultrapassa o raio máximo configurado, informa explicitamente que está
  // fora da área; senão, só não foi possível calcular com o que se tem.
  const dist = distanceFromRestaurant(config, address);
  if (config.maxDeliveryRadiusKm != null && dist !== null && dist > config.maxDeliveryRadiusKm) {
    return { fee: null, etaMinutes: null, methodUsed: null, outOfRange: true, distanceKm: dist };
  }
  return { fee: null, etaMinutes: null, methodUsed: null, outOfRange: false, distanceKm: dist ?? undefined };
}
