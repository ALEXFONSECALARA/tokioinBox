// Backend de dados em arquivos JSON — é exatamente a lógica que já existia
// em server/index.js antes da Fase 2, só movida pra cá sem NENHUMA mudança
// de comportamento. Continua sendo o fallback automático quando o Supabase
// não está configurado (ver server/lib/db.js e server/lib/supabaseClient.js).
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const RESTAURANTS_FILE = path.join(DATA_DIR, 'restaurants.json');
const PLATFORM_FILE = path.join(DATA_DIR, 'platform.json');
const ADMIN_USERS_FILE = path.join(DATA_DIR, 'admin-users.json');

const DEFAULT_PLATFORM_SETTINGS = {
  landingTitle: 'Escolha seu restaurante',
  landingSubtitle: 'Cada loja tem seu próprio cardápio e pedidos',
  landingLayout: 'galeria-gourmet',
};

async function readJson(filePath, fallback) {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw err;
  }
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function menuPath(slug) {
  return path.join(DATA_DIR, 'restaurants', slug, 'menu.json');
}
function configPath(slug) {
  return path.join(DATA_DIR, 'restaurants', slug, 'config.json');
}
function ordersPath(slug) {
  return path.join(DATA_DIR, 'restaurants', slug, 'orders.json');
}

// Lista bruta (todos os restaurantes, ativos ou não) já enriquecida com os
// campos de identidade visual do config.json de cada um. Uso interno — as
// funções públicas abaixo decidem o que filtrar pra cada consumidor.
async function getAllRestaurantsRaw() {
  const list = await readJson(RESTAURANTS_FILE, []);
  return Promise.all(
    list.map(async (r) => {
      const config = await readJson(configPath(r.slug), null);
      // `active` mora em restaurants.json (lista mestre do super-admin), não
      // no config.json de cada restaurante — restaurantes antigos sem o campo
      // são tratados como ativos (default true), nunca somem silenciosamente.
      const active = r.active !== false;
      if (!config) return { ...r, active };
      return {
        slug: r.slug,
        name: config.name || r.name,
        emoji: r.emoji,
        color: config.color || r.color,
        secondaryColor: config.secondaryColor,
        tagline: config.tagline,
        logo: config.logo,
        bannerImage: config.bannerImage,
        bannerPositionX: config.bannerPositionX,
        bannerPositionY: config.bannerPositionY,
        bannerZoom: config.bannerZoom,
        layout: config.layout,
        active,
      };
    })
  );
}

// Lista pública (vitrine "/"): só restaurantes ativos. O super-admin usa
// getRestaurantsAdmin() pra ver todos, inclusive os desativados.
export async function getRestaurants() {
  const all = await getAllRestaurantsRaw();
  return all.filter((r) => r.active);
}

export async function getRestaurantsAdmin() {
  return getAllRestaurantsRaw();
}

export async function setRestaurantActive(slug, active) {
  const list = await readJson(RESTAURANTS_FILE, []);
  const idx = list.findIndex((r) => r.slug === slug);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], active: !!active };
  await writeJson(RESTAURANTS_FILE, list);
  const all = await getAllRestaurantsRaw();
  return all.find((r) => r.slug === slug) || null;
}

// Existência bruta (ignora ativo/inativo) — usada pelas rotas de admin e de
// leitura de cardápio, que precisam continuar funcionando pra um restaurante
// desativado (o admin ainda edita/reativa; só a vitrine e novos pedidos são
// bloqueados). Quem precisa saber "posso vender aqui agora?" usa
// restaurantIsActive(slug) separadamente.
export async function restaurantExists(slug) {
  const list = await readJson(RESTAURANTS_FILE, []);
  return list.some((r) => r.slug === slug);
}

export async function restaurantIsActive(slug) {
  const list = await readJson(RESTAURANTS_FILE, []);
  const entry = list.find((r) => r.slug === slug);
  if (!entry) return false;
  return entry.active !== false;
}

export async function readRestaurantData(slug) {
  const [menu, config, active] = await Promise.all([
    readJson(menuPath(slug), { menuItems: [], categories: [] }),
    readJson(configPath(slug), null),
    restaurantIsActive(slug),
  ]);
  return {
    menuItems: menu.menuItems || [],
    categories: menu.categories || [],
    // `active` (ativo/inativo no super-admin) é injetado aqui em vez de
    // morar no config.json — assim o cardápio do cliente sabe se deve
    // bloquear pedidos sem o admin precisar duplicar o campo em dois lugares.
    restaurantConfig: config ? { ...config, active } : config,
  };
}

export async function listOrders(slug) {
  return readJson(ordersPath(slug), []);
}

export async function getOrder(slug, id) {
  const orders = await readJson(ordersPath(slug), []);
  return orders.find((o) => o.id === id) || null;
}

export async function createOrder(slug, order) {
  const orders = await readJson(ordersPath(slug), []);
  orders.unshift(order);
  await writeJson(ordersPath(slug), orders);
  return order;
}

export async function updateOrder(slug, id, patch) {
  const orders = await readJson(ordersPath(slug), []);
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...patch };
  await writeJson(ordersPath(slug), orders);
  return orders[idx];
}

export async function updateMenuItems(slug, menuItems) {
  const menu = await readJson(menuPath(slug), { menuItems: [], categories: [] });
  menu.menuItems = menuItems;
  await writeJson(menuPath(slug), menu);
  return menuItems;
}

export async function updateCategories(slug, categories) {
  const menu = await readJson(menuPath(slug), { menuItems: [], categories: [] });
  menu.categories = categories;
  await writeJson(menuPath(slug), menu);
  return categories;
}

// ---------- Vitrine principal "/" (config global, não por restaurante) ----------

export async function getPlatformSettings() {
  const saved = await readJson(PLATFORM_FILE, {});
  return { ...DEFAULT_PLATFORM_SETTINGS, ...saved };
}

export async function updatePlatformSettings(incoming) {
  const existing = await readJson(PLATFORM_FILE, DEFAULT_PLATFORM_SETTINGS);
  const merged = { ...existing, ...incoming };
  await writeJson(PLATFORM_FILE, merged);
  return merged;
}

export async function updateConfig(slug, incoming) {
  // Merge, não substituição — mesma regra de segurança que já existia:
  // um payload incompleto nunca apaga silenciosamente campos que faltaram.
  const existing = await readJson(configPath(slug), {});
  const merged = { ...existing, ...incoming };
  await writeJson(configPath(slug), merged);
  return merged;
}

// ---------- Usuários do painel + permissões granulares (Fase 4, itens 17-19) ----------

export async function listAdminUsers() {
  return readJson(ADMIN_USERS_FILE, []);
}

export async function getAdminUserByLogin(login) {
  const users = await readJson(ADMIN_USERS_FILE, []);
  return users.find((u) => u.login === login) || null;
}

export async function getAdminUserById(id) {
  const users = await readJson(ADMIN_USERS_FILE, []);
  return users.find((u) => u.id === id) || null;
}

export async function createAdminUser({ name, login, passwordHash, restaurantSlug, role, permissions }) {
  const users = await readJson(ADMIN_USERS_FILE, []);
  if (users.some((u) => u.login === login)) {
    const err = new Error('Já existe um usuário com esse login.');
    err.code = 'LOGIN_TAKEN';
    throw err;
  }
  const now = new Date().toISOString();
  const user = {
    id: randomUUID(),
    name,
    login,
    passwordHash,
    restaurantSlug: restaurantSlug || null,
    role: role || 'operador',
    active: true,
    permissions: permissions || {},
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await writeJson(ADMIN_USERS_FILE, users);
  return user;
}

export async function updateAdminUser(id, patch) {
  const users = await readJson(ADMIN_USERS_FILE, []);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...patch, id: users[idx].id, updatedAt: new Date().toISOString() };
  await writeJson(ADMIN_USERS_FILE, users);
  return users[idx];
}
