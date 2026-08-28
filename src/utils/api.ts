import { Category, MenuItem, Order, RestaurantConfig } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface RestaurantSummary {
  slug: string;
  name: string;
  emoji: string;
  color: string;
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
// restaurante para o backend, que salva localmente e devolve a URL pública.
export async function uploadImage(slug: string, token: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${API_BASE}/api/${slug}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // sem Content-Type: o browser define o boundary do multipart
    body: formData,
  });
  const data = await handleResponse<{ url: string }>(res);
  // Se o front e o back estiverem em domínios separados (VITE_API_URL definido),
  // a URL relativa devolvida pelo backend precisa do prefixo pra funcionar.
  return API_BASE ? `${API_BASE}${data.url}` : data.url;
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
