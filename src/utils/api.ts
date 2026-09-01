import { Category, MenuItem, Order, RestaurantConfig, LayoutId } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Dados usados pela vitrine multi-restaurantes "/". `emoji` é mantido só por
// compatibilidade retroativa (restaurantes antigos sem foto configurada);
// a Landing prioriza sempre `logo`/`bannerImage` quando existirem.
export interface RestaurantSummary {
  slug: string;
  name: string;
  emoji?: string;
  color: string;
  secondaryColor?: string;
  tagline?: string;
  logo?: string;
  bannerImage?: string;
  bannerPositionX?: number;
  bannerPositionY?: number;
  bannerZoom?: number;
  layout?: LayoutId;
  // Só vem preenchido de fato quando a lista foi buscada via
  // fetchRestaurantsAdmin — a lista pública (fetchRestaurants) já vem
  // pré-filtrada só com os ativos.
  active?: boolean;
}

// Configuração global da vitrine multi-restaurantes "/" — título, subtítulo
// e layout escolhidos pelo super-admin. Não pertence a nenhum restaurante.
export interface PlatformSettings {
  landingTitle: string;
  landingSubtitle: string;
  landingLayout: LayoutId;
}

export interface MenuData {
  categories: Category[];
  menuItems: MenuItem[];
  restaurantConfig: RestaurantConfig;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Erro na requisição (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignora corpo não-JSON
    }
    throw new Error(message);
  }
  return res.json();
}

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ---------- Público ----------

export async function fetchRestaurants(): Promise<RestaurantSummary[]> {
  const res = await fetch(`${API_BASE}/api/restaurants`);
  return handleResponse<RestaurantSummary[]>(res);
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const res = await fetch(`${API_BASE}/api/platform`);
  return handleResponse<PlatformSettings>(res);
}

// Consulta leve do ajuste operacional atual (Fase 4, itens 14-16) — usada em
// polling curto pelo cliente com pedido aberto, pra atualizar a previsão de
// entrega quase em tempo real sem recarregar o cardápio inteiro.
export async function fetchOperationalStatus(
  slug: string
): Promise<{ operationalStatus: string; operationalAdjustmentMinutes: number }> {
  const res = await fetch(`${API_BASE}/api/${slug}/operational-status`);
  return handleResponse(res);
}

export async function fetchMenu(slug: string): Promise<MenuData> {
  const res = await fetch(`${API_BASE}/api/${slug}/menu`);
  return handleResponse<MenuData>(res);
}

export async function createOrder(slug: string, order: Order): Promise<void> {
  const res = await fetch(`${API_BASE}/api/${slug}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  await handleResponse(res);
}

export async function fetchOrder(slug: string, orderId: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/api/${slug}/orders/${orderId}`);
  return handleResponse<Order>(res);
}

// ---------- Admin (super-admin único, com token) ----------

export async function adminLogin(password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await handleResponse<{ token: string }>(res);
  return data.token;
}

// Lista TODOS os restaurantes (ativos e inativos) — usada pela barra de
// troca do super-admin, que precisa mostrar e permitir reativar restaurantes
// desativados (diferente de fetchRestaurants, que é pública e só traz ativos).
export async function fetchRestaurantsAdmin(token: string): Promise<RestaurantSummary[]> {
  const res = await fetch(`${API_BASE}/api/admin/restaurants`, { headers: authHeaders(token) });
  return handleResponse<RestaurantSummary[]>(res);
}

export async function setRestaurantActive(
  token: string,
  slug: string,
  active: boolean
): Promise<RestaurantSummary | null> {
  const res = await fetch(`${API_BASE}/api/admin/restaurants/${slug}/active`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ active }),
  });
  const data = await handleResponse<{ ok: true; restaurant: RestaurantSummary | null }>(res);
  return data.restaurant;
}

export async function fetchOrdersAdmin(slug: string, token: string): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/api/${slug}/orders`, { headers: authHeaders(token) });
  return handleResponse<Order[]>(res);
}

export async function updateOrderAdmin(
  slug: string,
  token: string,
  orderId: string,
  patch: Partial<Order>
): Promise<Order> {
  const res = await fetch(`${API_BASE}/api/${slug}/orders/${orderId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(patch),
  });
  const data = await handleResponse<{ order: Order }>(res);
  return data.order;
}

export async function saveMenuItems(slug: string, token: string, menuItems: MenuItem[]): Promise<void> {
  const res = await fetch(`${API_BASE}/api/${slug}/menu-items`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(menuItems),
  });
  await handleResponse(res);
}

export async function saveCategories(slug: string, token: string, categories: Category[]): Promise<void> {
  const res = await fetch(`${API_BASE}/api/${slug}/categories`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(categories),
  });
  await handleResponse(res);
}

// Envia uma foto (logo, banner, splash, prato, entregador) do computador do
// restaurante para o backend, que sobe pro Cloudinary (produção) ou salva
// localmente como fallback, e devolve a URL pública já pronta pra usar.
export async function uploadImage(slug: string, token: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${API_BASE}/api/${slug}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // sem Content-Type: o browser define o boundary do multipart
    body: formData,
  });
  const data = await handleResponse<{ url: string }>(res);
  // URL do Cloudinary já vem absoluta (https://res.cloudinary.com/...) — só
  // o fallback local devolve um caminho relativo (/uploads/...), que aí sim
  // precisa do prefixo do backend quando front e back estão em domínios
  // separados (VITE_API_URL definido).
  const isAbsolute = /^https?:\/\//i.test(data.url);
  return isAbsolute || !API_BASE ? data.url : `${API_BASE}${data.url}`;
}

export async function savePlatformSettings(token: string, settings: PlatformSettings): Promise<PlatformSettings> {
  const res = await fetch(`${API_BASE}/api/admin/platform`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(settings),
  });
  const data = await handleResponse<{ platform: PlatformSettings }>(res);
  return data.platform;
}

export async function saveRestaurantConfig(
  slug: string,
  token: string,
  config: RestaurantConfig
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/${slug}/config`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(config),
  });
  await handleResponse(res);
}
