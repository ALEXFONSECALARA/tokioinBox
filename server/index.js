import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const RESTAURANTS_FILE = path.join(DATA_DIR, 'restaurants.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Senha única do super-admin. Em produção, defina ADMIN_PASSWORD nas variáveis
// de ambiente do Render. Em desenvolvimento local, usa "admin123" por padrão.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Tokens de sessão do admin ficam em memória (somem se o servidor reiniciar,
// então o admin só precisa logar de novo — nada grave).
const adminTokens = new Map(); // token -> expiresAt (timestamp ms)
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function issueToken() {
  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function isTokenValid(token) {
  if (!token) return false;
  const expiresAt = adminTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    adminTokens.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!isTokenValid(token)) {
    return res.status(401).json({ error: 'Não autorizado. Faça login no admin novamente.' });
  }
  next();
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ---------- Upload local de fotos (logo, banner, splash, pratos, entregadores) ----------

// Guarda o arquivo na pasta do próprio restaurante, com nome único, mantendo
// a extensão original. Fica em server/data/uploads/<slug>/, então entra no
// mesmo aviso de "disco efêmero no Render grátis" do restante de server/data.
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const dir = path.join(UPLOADS_DIR, req.params.slug);
        await mkdir(dir, { recursive: true });
        cb(null, dir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
      const safeExt = /^\.(jpg|jpeg|png|webp|gif|avif)$/.test(ext) ? ext : '.jpg';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB por foto
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) {
      return cb(new Error('Apenas arquivos de imagem são permitidos.'));
    }
    cb(null, true);
  },
});

// Serve as fotos enviadas publicamente (o cardápio do cliente precisa exibi-las)
app.use('/uploads', express.static(UPLOADS_DIR));

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

async function getRestaurants() {
  return readJson(RESTAURANTS_FILE, []);
}

async function restaurantExists(slug) {
  const list = await getRestaurants();
  return list.some((r) => r.slug === slug);
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

// Cada restaurante tem seu PRÓPRIO arquivo (menu.json / config.json / orders.json)
// dentro de server/data/restaurants/<slug>/ — nunca existe um arquivo global
// compartilhado entre restaurantes. Ler ou gravar sempre exige o :slug da rota,
// então é estruturalmente impossível um restaurante enxergar ou sobrescrever
// o arquivo de outro.
async function readRestaurantData(slug) {
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

// ---------- Rotas públicas ----------

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Lista os restaurantes disponíveis (pra tela inicial de escolha)
app.get('/api/restaurants', async (req, res) => {
  try {
    res.json(await getRestaurants());
  } catch (err) {
    console.error('Erro ao listar restaurantes:', err);
    res.status(500).json({ error: 'Não foi possível carregar a lista de restaurantes.' });
  }
});

// Cardápio + configuração de UM restaurante específico (nunca de outro)
app.get('/api/:slug/menu', async (req, res) => {
  const { slug } = req.params;
  if (!(await restaurantExists(slug))) {
    return res.status(404).json({ error: 'Restaurante não encontrado.' });
  }
  try {
    const data = await readRestaurantData(slug);
    if (!data.restaurantConfig) {
      return res.status(500).json({ error: `Configuração de "${slug}" não encontrada (config.json ausente).` });
    }
    res.json(data);
  } catch (err) {
    console.error(`Erro ao ler cardápio de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível carregar o cardápio.' });
  }
});

// Cliente cria um pedido (não precisa de login)
app.post('/api/:slug/orders', async (req, res) => {
  const { slug } = req.params;
  if (!(await restaurantExists(slug))) {
    return res.status(404).json({ error: 'Restaurante não encontrado.' });
  }
  try {
    const order = req.body;
    if (!order || !order.id) {
      return res.status(400).json({ error: 'Pedido inválido.' });
    }
    const orders = await readJson(ordersPath(slug), []);
    orders.unshift(order);
    await writeJson(ordersPath(slug), orders);
    res.status(201).json({ ok: true, order });
  } catch (err) {
    console.error(`Erro ao salvar pedido de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível registrar o pedido.' });
  }
});

// Cliente consulta o status do próprio pedido (id é praticamente impossível de adivinhar)
app.get('/api/:slug/orders/:id', async (req, res) => {
  const { slug, id } = req.params;
  if (!(await restaurantExists(slug))) {
    return res.status(404).json({ error: 'Restaurante não encontrado.' });
  }
  try {
    const orders = await readJson(ordersPath(slug), []);
    const order = orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
    res.json(order);
  } catch (err) {
    console.error(`Erro ao buscar pedido de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível buscar o pedido.' });
  }
});

// ---------- Login do super-admin ----------

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }
  res.json({ token: issueToken() });
});

// ---------- Rotas do admin (protegidas) ----------

// Admin envia uma foto (logo, banner, splash, prato ou entregador) do computador
// do restaurante. Retorna a URL pública já pronta pra salvar no cardápio/config.
app.post('/api/:slug/upload', requireAdmin, (req, res) => {
  const { slug } = req.params;
  imageUpload.single('image')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Imagem muito grande (máximo 8MB).'
        : (err.message || 'Não foi possível enviar a imagem.');
      return res.status(400).json({ error: message });
    }
    if (!(await restaurantExists(slug))) {
      return res.status(404).json({ error: 'Restaurante não encontrado.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }
    res.status(201).json({ ok: true, url: `/uploads/${slug}/${req.file.filename}` });
  });
});

app.put('/api/:slug/menu-items', requireAdmin, async (req, res) => {
  const { slug } = req.params;
  if (!(await restaurantExists(slug))) return res.status(404).json({ error: 'Restaurante não encontrado.' });
  const menuItems = req.body;
  if (!Array.isArray(menuItems)) return res.status(400).json({ error: 'Corpo deve ser um array de itens.' });
  try {
    // Só toca no menu.json deste restaurante — config.json (identidade, taxas,
    // pagamento, entregadores etc.) fica intocado, em arquivo separado.
    const menu = await readJson(menuPath(slug), { menuItems: [], categories: [] });
    menu.menuItems = menuItems;
    await writeJson(menuPath(slug), menu);
    res.json({ ok: true, menuItems });
  } catch (err) {
    console.error(`Erro ao salvar itens de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível salvar os itens.' });
  }
});

app.put('/api/:slug/categories', requireAdmin, async (req, res) => {
  const { slug } = req.params;
  if (!(await restaurantExists(slug))) return res.status(404).json({ error: 'Restaurante não encontrado.' });
  const categories = req.body;
  if (!Array.isArray(categories)) return res.status(400).json({ error: 'Corpo deve ser um array de categorias.' });
  try {
    const menu = await readJson(menuPath(slug), { menuItems: [], categories: [] });
    menu.categories = categories;
    await writeJson(menuPath(slug), menu);
    res.json({ ok: true, categories });
  } catch (err) {
    console.error(`Erro ao salvar categorias de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível salvar as categorias.' });
  }
});

app.put('/api/:slug/config', requireAdmin, async (req, res) => {
  const { slug } = req.params;
  if (!(await restaurantExists(slug))) return res.status(404).json({ error: 'Restaurante não encontrado.' });
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Corpo deve ser um objeto de configuração.' });
  }
  try {
    // Atualização segura: faz MERGE com a configuração já salva deste restaurante,
    // em vez de substituir o arquivo inteiro. Assim, um payload incompleto (de uma
    // versão antiga do painel, ou uma aba desatualizada) nunca apaga silenciosamente
    // campos que não vieram no corpo da requisição.
    const existing = await readJson(configPath(slug), {});
    const merged = { ...existing, ...incoming };
    await writeJson(configPath(slug), merged);
    res.json({ ok: true, restaurantConfig: merged });
  } catch (err) {
    console.error(`Erro ao salvar configuração de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível salvar a configuração.' });
  }
});

// Admin lista todos os pedidos de um restaurante
app.get('/api/:slug/orders', requireAdmin, async (req, res) => {
  const { slug } = req.params;
  if (!(await restaurantExists(slug))) return res.status(404).json({ error: 'Restaurante não encontrado.' });
  try {
    res.json(await readJson(ordersPath(slug), []));
  } catch (err) {
    console.error(`Erro ao listar pedidos de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível carregar os pedidos.' });
  }
});

// Admin atualiza um pedido (status, entregador, etc)
app.patch('/api/:slug/orders/:id', requireAdmin, async (req, res) => {
  const { slug, id } = req.params;
  if (!(await restaurantExists(slug))) return res.status(404).json({ error: 'Restaurante não encontrado.' });
  try {
    const orders = await readJson(ordersPath(slug), []);
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Pedido não encontrado.' });
    orders[idx] = { ...orders[idx], ...req.body };
    await writeJson(ordersPath(slug), orders);
    res.json({ ok: true, order: orders[idx] });
  } catch (err) {
    console.error(`Erro ao atualizar pedido de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível atualizar o pedido.' });
  }
});

// Em produção, o mesmo processo também serve os arquivos estáticos de dist/
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor multicardápio rodando na porta ${PORT}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('⚠️  ADMIN_PASSWORD não definido — usando senha padrão "admin123". Configure isso no Render em produção.');
  }
});
