// Ponto único de acesso a dados usado por server/index.js. Escolhe o backend
// automaticamente:
//   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY configurados → Supabase
//   - caso contrário → arquivos JSON (server/data/), como sempre funcionou
//
// Isso implementa a migração gradual da seção 49 do prompt mestre: dá pra
// configurar o Supabase em produção (Render) enquanto o ambiente local de
// um dev continua funcionando sem nenhuma chave configurada. server/index.js
// e o frontend não sabem (nem precisam saber) qual dos dois está em uso —
// as duas implementações devolvem exatamente o mesmo formato de dados.
import { supabaseEnabled } from './supabaseClient.js';
import * as jsonDb from './db.json.js';
import * as supabaseDb from './db.supabase.js';

const impl = supabaseEnabled ? supabaseDb : jsonDb;

export const backendName = supabaseEnabled ? 'supabase' : 'json';
export const getRestaurants = impl.getRestaurants;
export const restaurantExists = impl.restaurantExists;
export const readRestaurantData = impl.readRestaurantData;
export const listOrders = impl.listOrders;
export const getOrder = impl.getOrder;
export const createOrder = impl.createOrder;
export const updateOrder = impl.updateOrder;
export const updateMenuItems = impl.updateMenuItems;
export const updateCategories = impl.updateCategories;
export const updateConfig = impl.updateConfig;
