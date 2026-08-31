// Backend de dados no Supabase — mesma interface pública de db.json.js,
// pra server/lib/db.js poder trocar de um pro outro sem o resto do server/
// (nem o frontend) perceber diferença nenhuma na resposta das rotas.
//
// Isolamento entre restaurantes (seção 47/48 do prompt mestre): toda função
// aqui recebe SEMPRE o `slug` (nunca um restaurant_id vindo do cliente).
// resolveRestaurantId() é a ÚNICA porta de entrada pra descobrir o
// restaurant_id, e ele SEMPRE busca no banco pelo slug — nunca confia em um
// id que tenha vindo solto do corpo da requisição. Isso é reforçado pelas
// políticas de RLS em 0002_rls_policies.sql, mas o isolamento real, hoje,
// vem daqui: nenhuma query abaixo aceita restaurant_id vindo de fora.
import { supabase } from './supabaseClient.js';

const restaurantIdCache = new Map(); // slug -> uuid (dado imutável, seguro cachear em memória)

async function resolveRestaurantId(slug) {
  if (restaurantIdCache.has(slug)) return restaurantIdCache.get(slug);
  const { data, error } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  restaurantIdCache.set(slug, data.id);
  return data.id;
}

// ---------- mapeadores camelCase (API) <-> snake_case (Postgres) ----------

function configRowToApi(restaurantRow, configRow) {
  if (!configRow) return null;
  return {
    name: restaurantRow?.name,
    tagline: configRow.tagline,
    logo: configRow.logo,
    bannerImage: configRow.banner_image,
    bannerPositionX: configRow.banner_position_x ?? undefined,
    bannerPositionY: configRow.banner_position_y ?? undefined,
    bannerZoom: configRow.banner_zoom ?? undefined,
    bannerOverlay: configRow.banner_overlay ?? undefined,
    bannerText: configRow.banner_text ?? undefined,
    color: configRow.color || restaurantRow?.color,
    secondaryColor: configRow.secondary_color ?? undefined,
    layout: configRow.layout ?? undefined,
    // Ativo/inativo mora na tabela `restaurants` (lista mestre), não em
    // restaurant_configs — restaurante sem o campo (linha antiga) é ativo.
    active: restaurantRow?.active !== false,
    phone: configRow.phone,
    whatsapp: configRow.whatsapp,
    address: configRow.address,
    isOpen: configRow.is_open,
    openingHours: configRow.opening_hours,
    deliveryFee: Number(configRow.delivery_fee),
    freeDeliveryThreshold:
      configRow.free_delivery_threshold != null ? Number(configRow.free_delivery_threshold) : undefined,
    freeDeliveryEnabled: configRow.free_delivery_enabled ?? undefined,
    minimumOrder: Number(configRow.minimum_order),
    estimatedDeliveryTime: configRow.estimated_delivery_time,
    deliveryZones: configRow.delivery_zones || [],
    drivers: configRow.drivers || [],
    promoBadges: configRow.promo_badges || [],
    badges: configRow.badges || [],
    pixKey: configRow.pix_key,
    pixKeyType: configRow.pix_key_type,
    instagram: configRow.instagram,
    allowTableOrders: configRow.allow_table_orders,
    totalTables: configRow.total_tables,
    splashEnabled: configRow.splash_enabled,
    splashImages: configRow.splash_images || [],
    splashDurationSeconds: configRow.splash_duration_seconds ?? undefined,
    printPaperWidth: configRow.print_paper_width,
    printAutoNewOrders: configRow.print_auto_new_orders,
  };
}

function configApiToRow(incoming) {
  const row = {};
  const map = {
    tagline: 'tagline',
    logo: 'logo',
    bannerImage: 'banner_image',
    bannerPositionX: 'banner_position_x',
    bannerPositionY: 'banner_position_y',
    bannerZoom: 'banner_zoom',
    bannerOverlay: 'banner_overlay',
    bannerText: 'banner_text',
    color: 'color',
    secondaryColor: 'secondary_color',
    layout: 'layout',
    phone: 'phone',
    whatsapp: 'whatsapp',
    address: 'address',
    isOpen: 'is_open',
    openingHours: 'opening_hours',
    deliveryFee: 'delivery_fee',
    freeDeliveryThreshold: 'free_delivery_threshold',
    freeDeliveryEnabled: 'free_delivery_enabled',
    minimumOrder: 'minimum_order',
    estimatedDeliveryTime: 'estimated_delivery_time',
    deliveryZones: 'delivery_zones',
    drivers: 'drivers',
    promoBadges: 'promo_badges',
    badges: 'badges',
    pixKey: 'pix_key',
    pixKeyType: 'pix_key_type',
    instagram: 'instagram',
    allowTableOrders: 'allow_table_orders',
    totalTables: 'total_tables',
    splashEnabled: 'splash_enabled',
    splashImages: 'splash_images',
    splashDurationSeconds: 'splash_duration_seconds',
    printPaperWidth: 'print_paper_width',
    printAutoNewOrders: 'print_auto_new_orders',
  };
  for (const [apiKey, col] of Object.entries(map)) {
    if (incoming[apiKey] !== undefined) row[col] = incoming[apiKey];
  }
  return row;
}

function categoryRowToApi(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || undefined,
    description: row.description || undefined,
    image: row.image || undefined,
    active: row.active !== false,
  };
}

function menuItemRowToApi(row) {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    description: row.description || '',
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    image: row.image || '',
    available: row.available,
    tags: row.tags || [],
    preparationTimeMinutes: row.preparation_time_minutes ?? undefined,
    servesCount: row.serves_count ?? undefined,
    calories: row.calories ?? undefined,
    choices: row.choices || undefined,
    extras: row.extras || undefined,
    allowSpecialNotes: row.allow_special_notes,
  };
}

function menuItemApiToRow(restaurantId, item, sortOrder) {
  return {
    restaurant_id: restaurantId,
    id: item.id,
    category_id: item.categoryId,
    name: item.name,
    description: item.description || '',
    price: item.price,
    original_price: item.originalPrice ?? null,
    image: item.image || '',
    available: item.available !== false,
    tags: item.tags || [],
    preparation_time_minutes: item.preparationTimeMinutes ?? null,
    serves_count: item.servesCount ?? null,
    calories: item.calories ?? null,
    choices: item.choices || [],
    extras: item.extras || [],
    allow_special_notes: !!item.allowSpecialNotes,
    // sector fica de fora de propósito nesta fase: sem UI/admin ainda pra
    // definir setor por produto (isso é Fase 3 — impressão por setor).
    // A coluna já tem default 'cozinha' no banco.
    sort_order: sortOrder,
  };
}

function orderRowToApi(orderRow, itemRows) {
  return {
    id: orderRow.id,
    orderNumber: orderRow.order_number,
    createdAt: orderRow.created_at,
    items: (itemRows || [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((it) => ({
        id: it.id,
        menuItem: it.menu_item_snapshot,
        quantity: it.quantity,
        selectedChoices: it.selected_choices || [],
        selectedExtras: it.selected_extras || [],
        specialNotes: it.special_notes || undefined,
        unitPrice: Number(it.unit_price),
        totalPrice: Number(it.total_price),
      })),
    subtotal: Number(orderRow.subtotal),
    deliveryFee: Number(orderRow.delivery_fee),
    discount: Number(orderRow.discount),
    couponCode: orderRow.coupon_code || undefined,
    total: Number(orderRow.total),
    orderType: orderRow.order_type,
    customer: orderRow.customer,
    paymentMethod: orderRow.payment_method,
    cardBrand: orderRow.card_brand || undefined,
    cashChangeFor: orderRow.cash_change_for != null ? Number(orderRow.cash_change_for) : undefined,
    status: orderRow.status,
    driver: orderRow.driver || undefined,
    estimatedMinutes: orderRow.estimated_minutes ?? undefined,
    cancelReason: orderRow.cancel_reason || undefined,
    statusHistory: orderRow.status_history || [],
    notes: orderRow.notes || undefined,
  };
}

// ---------- interface pública (espelha db.json.js) ----------

function restaurantRowToSummary(r) {
  const cfg = Array.isArray(r.restaurant_configs) ? r.restaurant_configs[0] : r.restaurant_configs;
  return {
    slug: r.slug,
    name: r.name,
    emoji: r.emoji,
    color: cfg?.color || r.color,
    secondaryColor: cfg?.secondary_color ?? undefined,
    tagline: cfg?.tagline ?? undefined,
    logo: cfg?.logo ?? undefined,
    bannerImage: cfg?.banner_image ?? undefined,
    bannerPositionX: cfg?.banner_position_x ?? undefined,
    bannerPositionY: cfg?.banner_position_y ?? undefined,
    bannerZoom: cfg?.banner_zoom ?? undefined,
    layout: cfg?.layout ?? undefined,
    active: r.active !== false,
  };
}

const RESTAURANT_SUMMARY_SELECT =
  'slug, name, emoji, color, active, restaurant_configs(tagline, logo, banner_image, banner_position_x, banner_position_y, banner_zoom, color, secondary_color, layout)';

export async function getRestaurants() {
  // Uma única query (embed via FK restaurant_configs.restaurant_id ->
  // restaurants.id) já traz tudo que a vitrine "/" precisa — nada de N+1
  // nem de carregar cardápio/pedidos, só os campos de identidade visual.
  // Vitrine pública: só restaurantes ativos (getRestaurantsAdmin traz todos).
  const { data, error } = await supabase
    .from('restaurants')
    .select(RESTAURANT_SUMMARY_SELECT)
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(restaurantRowToSummary);
}

export async function getRestaurantsAdmin() {
  const { data, error } = await supabase
    .from('restaurants')
    .select(RESTAURANT_SUMMARY_SELECT)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(restaurantRowToSummary);
}

export async function setRestaurantActive(slug, active) {
  const { data, error } = await supabase
    .from('restaurants')
    .update({ active: !!active })
    .eq('slug', slug)
    .select(RESTAURANT_SUMMARY_SELECT)
    .maybeSingle();
  if (error) throw error;
  return data ? restaurantRowToSummary(data) : null;
}

export async function restaurantExists(slug) {
  return (await resolveRestaurantId(slug)) !== null;
}

export async function restaurantIsActive(slug) {
  const { data, error } = await supabase.from('restaurants').select('active').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) return false;
  return data.active !== false;
}

export async function readRestaurantData(slug) {
  const restaurantId = await resolveRestaurantId(slug);
  if (!restaurantId) return { menuItems: [], categories: [], restaurantConfig: null };

  const [{ data: restaurantRow }, { data: configRow }, { data: categoryRows, error: catErr }, { data: itemRows, error: itemErr }] =
    await Promise.all([
      supabase.from('restaurants').select('*').eq('id', restaurantId).maybeSingle(),
      supabase.from('restaurant_configs').select('*').eq('restaurant_id', restaurantId).maybeSingle(),
      supabase.from('menu_categories').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
      supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
    ]);
  if (catErr) throw catErr;
  if (itemErr) throw itemErr;

  return {
    menuItems: (itemRows || []).map(menuItemRowToApi),
    categories: (categoryRows || []).map(categoryRowToApi),
    restaurantConfig: configRowToApi(restaurantRow, configRow),
  };
}

export async function listOrders(slug) {
  const restaurantId = await resolveRestaurantId(slug);
  if (!restaurantId) return [];
  const { data: orderRows, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!orderRows || orderRows.length === 0) return [];

  const { data: itemRows, error: itemErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .in('order_id', orderRows.map((o) => o.id));
  if (itemErr) throw itemErr;

  const itemsByOrder = new Map();
  for (const it of itemRows || []) {
    if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
    itemsByOrder.get(it.order_id).push(it);
  }
  return orderRows.map((o) => orderRowToApi(o, itemsByOrder.get(o.id)));
}

export async function getOrder(slug, id) {
  const restaurantId = await resolveRestaurantId(slug);
  if (!restaurantId) return null;
  const { data: orderRow, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!orderRow) return null;
  const { data: itemRows, error: itemErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id);
  if (itemErr) throw itemErr;
  return orderRowToApi(orderRow, itemRows);
}

export async function createOrder(slug, order) {
  const restaurantId = await resolveRestaurantId(slug);
  if (!restaurantId) throw new Error(`Restaurante "${slug}" não encontrado.`);

  const orderRow = {
    id: order.id,
    restaurant_id: restaurantId,
    order_number: order.orderNumber,
    order_type: order.orderType,
    status: order.status || 'recebido',
    customer: order.customer,
    subtotal: order.subtotal,
    delivery_fee: order.deliveryFee,
    discount: order.discount,
    coupon_code: order.couponCode ?? null,
    total: order.total,
    payment_method: order.paymentMethod,
    card_brand: order.cardBrand ?? null,
    cash_change_for: order.cashChangeFor ?? null,
    driver: order.driver ?? null,
    estimated_minutes: order.estimatedMinutes ?? null,
    cancel_reason: order.cancelReason ?? null,
    notes: order.notes ?? null,
    status_history: order.statusHistory || [],
    created_at: order.createdAt || new Date().toISOString(),
  };

  // Idempotência básica (seção 50 do prompt mestre): se o cliente reenviar o
  // mesmo id (ex: duplo clique), o insert com PK repetida falha com erro
  // 23505 — tratamos isso como sucesso silencioso, devolvendo o pedido já
  // existente, em vez de criar um pedido duplicado no restaurante.
  const { error: insertErr } = await supabase.from('orders').insert(orderRow);
  if (insertErr) {
    if (insertErr.code === '23505') {
      return getOrder(slug, order.id);
    }
    throw insertErr;
  }

  const itemRows = (order.items || []).map((item, idx) => ({
    order_id: order.id,
    id: item.id,
    restaurant_id: restaurantId,
    menu_item_id: item.menuItem?.id ?? null,
    name: item.menuItem?.name || '',
    category_id: item.menuItem?.categoryId ?? null,
    sector: null, // Fase 3
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    selected_choices: item.selectedChoices || [],
    selected_extras: item.selectedExtras || [],
    special_notes: item.specialNotes ?? null,
    menu_item_snapshot: item.menuItem || {},
    sort_order: idx,
  }));
  if (itemRows.length > 0) {
    const { error: itemsErr } = await supabase.from('order_items').insert(itemRows);
    if (itemsErr) throw itemsErr;
  }

  return order;
}

export async function updateOrder(slug, id, patch) {
  const restaurantId = await resolveRestaurantId(slug);
  if (!restaurantId) return null;

  const row = {};
  const map = {
    status: 'status',
    driver: 'driver',
    estimatedMinutes: 'estimated_minutes',
    cancelReason: 'cancel_reason',
    statusHistory: 'status_history',
    notes: 'notes',
  };
  for (const [apiKey, col] of Object.entries(map)) {
    if (patch[apiKey] !== undefined) row[col] = patch[apiKey];
  }
  if (Object.keys(row).length === 0) return getOrder(slug, id);

  const { data, error } = await supabase
    .from('orders')
    .update(row)
    .eq('restaurant_id', restaurantId)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: itemRows, error: itemErr } = await supabase.from('order_items').select('*').eq('order_id', id);
  if (itemErr) throw itemErr;
  return orderRowToApi(data, itemRows);
}

export async function updateMenuItems(slug, menuItems) {
  const restaurantId = await resolveRestaurantId(slug);
  if (!restaurantId) throw new Error(`Restaurante "${slug}" não encontrado.`);

  // Substituição total (mesmo comportamento do JSON: PUT troca a lista
  // inteira) — apaga o que não existe mais na lista enviada e faz upsert do
  // resto, numa única transação lógica via RPC seria ideal, mas pra manter
  // isto simples e sem exigir uma function extra no banco, fazemos
  // delete-then-insert. O risco de uma falha no meio deixar o cardápio
  // parcialmente salvo é o mesmo trade-off que "PUT sobrescreve o arquivo
  // inteiro" já tinha no JSON — não é uma regressão.
  const rows = menuItems.map((item, idx) => menuItemApiToRow(restaurantId, item, idx));

  const { error: delErr } = await supabase.from('menu_items').delete().eq('restaurant_id', restaurantId);
  if (delErr) throw delErr;
  if (rows.length > 0) {
    const { error: insErr } = await supabase.from('menu_items').insert(rows);
    if (insErr) throw insErr;
  }
  return menuItems;
}

export async function updateCategories(slug, categories) {
  const restaurantId = await resolveRestaurantId(slug);
  if (!restaurantId) throw new Error(`Restaurante "${slug}" não encontrado.`);

  const rows = categories.map((cat, idx) => ({
    restaurant_id: restaurantId,
    id: cat.id,
    name: cat.name,
    icon: cat.icon || null,
    description: cat.description || null,
    image: cat.image || null,
    active: cat.active !== false,
    sort_order: idx,
  }));

  // menu_items.category_id tem FK pra menu_categories — por isso categorias
  // não podem ser simplesmente apagadas-e-recriadas se algum item ainda
  // referenciar uma categoria removida. Fazemos upsert e, à parte, apagamos
  // só as categorias que SUMIRAM da lista enviada E não têm nenhum produto
  // (o admin, ao excluir uma categoria com produtos, precisa mover os
  // produtos pra outra categoria primeiro — ver ToolsHub/menu tab — então
  // quando a exclusão chega até aqui, ela já está vazia e a FK não barra).
  const { error } = await supabase.from('menu_categories').upsert(rows, { onConflict: 'restaurant_id,id' });
  if (error) throw error;

  const { data: existingRows, error: existingErr } = await supabase
    .from('menu_categories')
    .select('id')
    .eq('restaurant_id', restaurantId);
  if (existingErr) throw existingErr;
  const incomingIds = new Set(categories.map((c) => c.id));
  const removedIds = (existingRows || []).map((r) => r.id).filter((id) => !incomingIds.has(id));
  if (removedIds.length > 0) {
    // Se ainda houver produto referenciando alguma dessas categorias, a FK
    // (menu_items.category_id -> menu_categories.id) rejeita o delete e a
    // categoria simplesmente permanece no banco (mesmo comportamento seguro
    // de antes) — não tratamos isso como erro fatal da rota.
    await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId).in('id', removedIds);
  }

  return categories;
}

// ---------- Vitrine principal "/" (config global, não por restaurante) ----------

const DEFAULT_PLATFORM_SETTINGS = {
  landingTitle: 'Escolha seu restaurante',
  landingSubtitle: 'Cada loja tem seu próprio cardápio e pedidos',
  landingLayout: 'galeria-gourmet',
};

export async function getPlatformSettings() {
  const { data, error } = await supabase.from('platform_settings').select('*').eq('id', true).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_PLATFORM_SETTINGS;
  return {
    landingTitle: data.landing_title,
    landingSubtitle: data.landing_subtitle,
    landingLayout: data.landing_layout,
  };
}

export async function updatePlatformSettings(incoming) {
  const row = { id: true };
  if (incoming.landingTitle !== undefined) row.landing_title = incoming.landingTitle;
  if (incoming.landingSubtitle !== undefined) row.landing_subtitle = incoming.landingSubtitle;
  if (incoming.landingLayout !== undefined) row.landing_layout = incoming.landingLayout;
  const { error } = await supabase.from('platform_settings').upsert(row, { onConflict: 'id' });
  if (error) throw error;
  return getPlatformSettings();
}

export async function updateConfig(slug, incoming) {
  const restaurantId = await resolveRestaurantId(slug);
  if (!restaurantId) throw new Error(`Restaurante "${slug}" não encontrado.`);

  if (incoming.name !== undefined) {
    const { error } = await supabase.from('restaurants').update({ name: incoming.name }).eq('id', restaurantId);
    if (error) throw error;
  }

  const configRow = configApiToRow(incoming);
  configRow.restaurant_id = restaurantId;
  const { error: upsertErr } = await supabase
    .from('restaurant_configs')
    .upsert(configRow, { onConflict: 'restaurant_id' });
  if (upsertErr) throw upsertErr;

  const { data: restaurantRow } = await supabase.from('restaurants').select('*').eq('id', restaurantId).maybeSingle();
  const { data: fullConfigRow } = await supabase
    .from('restaurant_configs')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  return configRowToApi(restaurantRow, fullConfigRow);
}
