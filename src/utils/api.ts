import { Category, MenuItem, RestaurantConfig } from '../types';

// Em dev, o Vite faz proxy de /api para o backend local (veja vite.config.ts).
// Em produção (Render), o mesmo servidor Express serve o front-end e a API,
// então string vazia (caminho relativo) funciona nos dois casos.
// Se quiser apontar para um backend em outro domínio, defina VITE_API_URL.
const API_BASE = import.meta.env.VITE_API_URL || '';

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

export async function fetchMenu(): Promise<MenuData> {
  const res = await fetch(`${API_BASE}/api/menu`);
  return handleResponse<MenuData>(res);
}

export async function saveMenuItems(menuItems: MenuItem[]): Promise<void> {
  const res = await fetch(`${API_BASE}/api/menu-items`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(menuItems),
  });
  await handleResponse(res);
}

export async function saveCategories(categories: Category[]): Promise<void> {
  const res = await fetch(`${API_BASE}/api/categories`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categories),
  });
  await handleResponse(res);
}

export async function saveRestaurantConfig(config: RestaurantConfig): Promise<void> {
  const res = await fetch(`${API_BASE}/api/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  await handleResponse(res);
}
