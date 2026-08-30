// Backend de dados em arquivos JSON — é exatamente a lógica que já existia
// em server/index.js antes da Fase 2, só movida pra cá sem NENHUMA mudança
// de comportamento. Continua sendo o fallback automático quando o Supabase
// não está configurado (ver server/lib/db.js e server/lib/supabaseClient.js).
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const RESTAURANTS_FILE = path.join(DATA_DIR, 'restaurants.json');
const PLATFORM_FILE = path.join(DATA_DIR, 'platform.json');

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

export async function getRestaurants() {
  const list = await readJson(RESTAURANTS_FILE, []);
  // Enriquece a lista básica (slug/name/emoji/color) com os campos de
  // identidade visual que já moram no config.json de cada restaurante
  // (tagline, logo, bannerImage, cores, layout) — sem duplicar arquivos nem
  // exigir uma segunda chamada de rede do frontend pra montar a vitrine "/".
  return Promise.all(
    list.map(async (r) => {
      const config = await readJson(configPath(r.slug), null);
      if (!config) return r;
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
      };
    })
  );
}

export async function restaurantExists(slug) {
  const list = await getRestaurants();
  return list.some((r) => r.slug === slug);
}

export async function readRestaurantData(slug) {
  const [menu, config] = await Promise.all([
    readJson(menuPath(slug), { menuItems: [], categories: [] }),
    readJson(configPath(slug), null),
  ]);
  return {
    menuItems: menu.menuItems || [],
    categories: menu.categories || [],
    restaurantConfig: config,
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
