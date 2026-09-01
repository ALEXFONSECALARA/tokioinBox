import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as db from './lib/db.js';
import { isCloudinaryConfigured, uploadImageBuffer } from './lib/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
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

// ---------- Upload de fotos (logo, banner, splash, pratos, entregadores) ----------
// Fica em memória (multer.memoryStorage) em vez de ir direto pro disco — o
// arquivo só é gravado em algum lugar DEPOIS de decidirmos o destino:
//   • CLOUDINARY_* configurado (produção/Render): sobe pro Cloudinary,
//     nunca toca o disco local, URL retornada é https permanente.
//   • Sem Cloudinary configurado (dev local sem conta): cai automaticamente
//     pro disco local de sempre (server/data/uploads/<slug>/...), exatamente
//     como funcionava antes — mesmo padrão de fallback automático já usado
//     pro Supabase neste projeto (server/lib/db.js).
// Isso preserva 100% do comportamento pra quem não configurar Cloudinary,
// e resolve o disco efêmero do Render pra quem configurar.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB por foto
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) {
      return cb(new Error('Apenas arquivos de imagem são permitidos.'));
    }
    cb(null, true);
  },
});

function safeImageExt(originalname) {
  const ext = path.extname(originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  return /^\.(jpg|jpeg|png|webp|gif|avif)$/.test(ext) ? ext : '.jpg';
}

// Fallback local (sem Cloudinary configurado): grava o buffer em disco e
// devolve a mesma URL relativa /uploads/... de sempre.
async function saveImageToDisk(file, slug) {
  const dir = path.join(UPLOADS_DIR, slug);
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeImageExt(file.originalname)}`;
  await writeFile(path.join(dir, filename), file.buffer);
  return `/uploads/${slug}/${filename}`;
}

// Serve as fotos enviadas localmente (fallback sem Cloudinary, e qualquer
// URL /uploads/... antiga já salva antes desta migração continua funcionando).
app.use('/uploads', express.static(UPLOADS_DIR));

// ---------- Rotas públicas ----------

app.get('/api/health', (req, res) => res.json({ ok: true, dataBackend: db.backendName }));

// Lista os restaurantes disponíveis (pra tela inicial de escolha) — só os
// ATIVOS. Restaurante desativado não aparece aqui (mas continua no banco e
// visível em /api/admin/restaurants, pro super-admin poder reativar).
app.get('/api/restaurants', async (req, res) => {
  try {
    res.json(await db.getRestaurants());
  } catch (err) {
    console.error('Erro ao listar restaurantes:', err);
    res.status(500).json({ error: 'Não foi possível carregar a lista de restaurantes.' });
  }
});

// Configuração da vitrine principal "/" (título, subtítulo, layout escolhido
// pelo super-admin) — global, não pertence a nenhum restaurante específico.
app.get('/api/platform', async (req, res) => {
  try {
    res.json(await db.getPlatformSettings());
  } catch (err) {
    console.error('Erro ao carregar configuração da vitrine:', err);
    res.status(500).json({ error: 'Não foi possível carregar a configuração da vitrine.' });
  }
});

// Cardápio + configuração de UM restaurante específico (nunca de outro)
app.get('/api/:slug/menu', async (req, res) => {
  const { slug } = req.params;
  if (!(await db.restaurantExists(slug))) {
    return res.status(404).json({ error: 'Restaurante não encontrado.' });
  }
  try {
    const data = await db.readRestaurantData(slug);
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
  if (!(await db.restaurantExists(slug))) {
    return res.status(404).json({ error: 'Restaurante não encontrado.' });
  }
  // Restaurante desativado pelo super-admin não pode receber novos pedidos —
  // reforçado aqui no backend (nunca só no frontend), mesmo que alguém chame
  // a API diretamente com o slug de um restaurante inativo.
  if (!(await db.restaurantIsActive(slug))) {
    return res.status(403).json({ error: 'Este restaurante está temporariamente indisponível para novos pedidos.' });
  }
  try {
    const order = req.body;
    if (!order || !order.id) {
      return res.status(400).json({ error: 'Pedido inválido.' });
    }
    const saved = await db.createOrder(slug, order);
    res.status(201).json({ ok: true, order: saved });
  } catch (err) {
    console.error(`Erro ao salvar pedido de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível registrar o pedido.' });
  }
});

// Cliente consulta o status do próprio pedido (id é praticamente impossível de adivinhar)
app.get('/api/:slug/orders/:id', async (req, res) => {
  const { slug, id } = req.params;
  if (!(await db.restaurantExists(slug))) {
    return res.status(404).json({ error: 'Restaurante não encontrado.' });
  }
  try {
    const order = await db.getOrder(slug, id);
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

// Lista TODOS os restaurantes (ativos e inativos) — usada pela barra de troca
// do super-admin em /admin, que precisa continuar mostrando (e permitindo
// reativar) restaurantes desativados. Diferente de GET /api/restaurants,
// que é pública e só traz os ativos.
app.get('/api/admin/restaurants', requireAdmin, async (req, res) => {
  try {
    res.json(await db.getRestaurantsAdmin());
  } catch (err) {
    console.error('Erro ao listar restaurantes (admin):', err);
    res.status(500).json({ error: 'Não foi possível carregar a lista de restaurantes.' });
  }
});

// Ativa/desativa um restaurante. Nunca apaga nada — só some da vitrine
// pública e passa a recusar novos pedidos (ver POST /api/:slug/orders).
app.patch('/api/admin/restaurants/:slug/active', requireAdmin, async (req, res) => {
  const { slug } = req.params;
  const { active } = req.body || {};
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Campo "active" deve ser true ou false.' });
  }
  if (!(await db.restaurantExists(slug))) {
    return res.status(404).json({ error: 'Restaurante não encontrado.' });
  }
  try {
    const updated = await db.setRestaurantActive(slug, active);
    res.json({ ok: true, restaurant: updated });
  } catch (err) {
    console.error(`Erro ao alterar status ativo de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível alterar o status do restaurante.' });
  }
});

// Admin envia uma foto (logo, banner, splash, prato ou entregador) do computador
// do restaurante. Retorna a URL pública já pronta pra salvar no cardápio/config
// — https permanente do Cloudinary quando configurado, ou /uploads/... local
// como fallback (ver comentário acima do multer).
app.post('/api/:slug/upload', requireAdmin, (req, res) => {
  const { slug } = req.params;
  imageUpload.single('image')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Imagem muito grande (máximo 8MB).'
        : (err.message || 'Não foi possível enviar a imagem.');
      return res.status(400).json({ error: message });
    }
    if (!(await db.restaurantExists(slug))) {
      return res.status(404).json({ error: 'Restaurante não encontrado.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }
    try {
      let url;
      if (isCloudinaryConfigured()) {
        try {
          url = await uploadImageBuffer(req.file.buffer, slug);
        } catch (cloudErr) {
          // Cloudinary configurado mas falhou (chave errada, rede, cota
          // excedida etc.) — cai pro disco local em vez de devolver erro pro
          // admin. A foto salva mesmo assim; o problema real do Cloudinary
          // fica só no log do servidor, pra quem administra o Render corrigir
          // as variáveis de ambiente sem que isso trave o dia a dia da loja.
          console.error(`Cloudinary falhou pra ${slug}, usando fallback local:`, cloudErr?.message || cloudErr);
          url = await saveImageToDisk(req.file, slug);
        }
      } else {
        url = await saveImageToDisk(req.file, slug);
      }
      res.status(201).json({ ok: true, url });
    } catch (uploadErr) {
      console.error(`Erro ao enviar imagem (${slug}):`, uploadErr);
      res.status(500).json({ error: 'Não foi possível salvar a imagem. Tente novamente.' });
    }
  });
});

app.put('/api/:slug/menu-items', requireAdmin, async (req, res) => {
  const { slug } = req.params;
  if (!(await db.restaurantExists(slug))) return res.status(404).json({ error: 'Restaurante não encontrado.' });
  const menuItems = req.body;
  if (!Array.isArray(menuItems)) return res.status(400).json({ error: 'Corpo deve ser um array de itens.' });
  try {
    const saved = await db.updateMenuItems(slug, menuItems);
    res.json({ ok: true, menuItems: saved });
  } catch (err) {
    console.error(`Erro ao salvar itens de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível salvar os itens.' });
  }
});

app.put('/api/:slug/categories', requireAdmin, async (req, res) => {
  const { slug } = req.params;
  if (!(await db.restaurantExists(slug))) return res.status(404).json({ error: 'Restaurante não encontrado.' });
  const categories = req.body;
  if (!Array.isArray(categories)) return res.status(400).json({ error: 'Corpo deve ser um array de categorias.' });
  try {
    const saved = await db.updateCategories(slug, categories);
    res.json({ ok: true, categories: saved });
  } catch (err) {
    console.error(`Erro ao salvar categorias de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível salvar as categorias.' });
  }
});

// Consulta leve e pública do ajuste operacional atual (Fase 4, item 15) —
// usada pelo cliente em polling curto pra saber, quase em tempo real, se o
// restaurante aumentou o tempo de entrega enquanto o pedido dele está aberto.
// Não exige :slug/menu inteiro (cardápio) só pra pegar 2 campos pequenos.
app.get('/api/:slug/operational-status', async (req, res) => {
  const { slug } = req.params;
  if (!(await db.restaurantExists(slug))) {
    return res.status(404).json({ error: 'Restaurante não encontrado.' });
  }
  try {
    const { restaurantConfig } = await db.readRestaurantData(slug);
    res.json({
      operationalStatus: restaurantConfig?.operationalStatus || 'normal',
      operationalAdjustmentMinutes: restaurantConfig?.operationalAdjustmentMinutes || 0,
    });
  } catch (err) {
    console.error(`Erro ao consultar status operacional de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível consultar o status operacional.' });
  }
});

app.put('/api/:slug/config', requireAdmin, async (req, res) => {
  const { slug } = req.params;
  if (!(await db.restaurantExists(slug))) return res.status(404).json({ error: 'Restaurante não encontrado.' });
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Corpo deve ser um objeto de configuração.' });
  }
  try {
    // Atualização segura: faz MERGE com a configuração já salva deste restaurante
    // (tanto no backend JSON quanto no Supabase), em vez de substituir tudo —
    // um payload incompleto nunca apaga silenciosamente campos que não vieram.
    const merged = await db.updateConfig(slug, incoming);
    res.json({ ok: true, restaurantConfig: merged });
  } catch (err) {
    console.error(`Erro ao salvar configuração de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível salvar a configuração.' });
  }
});

// Super-admin atualiza a configuração global da vitrine "/"
app.put('/api/admin/platform', requireAdmin, async (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Corpo deve ser um objeto de configuração.' });
  }
  try {
    const merged = await db.updatePlatformSettings(incoming);
    res.json({ ok: true, platform: merged });
  } catch (err) {
    console.error('Erro ao salvar configuração da vitrine:', err);
    res.status(500).json({ error: 'Não foi possível salvar a configuração da vitrine.' });
  }
});

// Admin lista todos os pedidos de um restaurante
app.get('/api/:slug/orders', requireAdmin, async (req, res) => {
  const { slug } = req.params;
  if (!(await db.restaurantExists(slug))) return res.status(404).json({ error: 'Restaurante não encontrado.' });
  try {
    res.json(await db.listOrders(slug));
  } catch (err) {
    console.error(`Erro ao listar pedidos de ${slug}:`, err);
    res.status(500).json({ error: 'Não foi possível carregar os pedidos.' });
  }
});

// Admin atualiza um pedido (status, entregador, etc)
app.patch('/api/:slug/orders/:id', requireAdmin, async (req, res) => {
  const { slug, id } = req.params;
  if (!(await db.restaurantExists(slug))) return res.status(404).json({ error: 'Restaurante não encontrado.' });
  try {
    const order = await db.updateOrder(slug, id, req.body);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
    res.json({ ok: true, order });
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
  console.log(`Servidor multicardápio rodando na porta ${PORT} — backend de dados: ${db.backendName}`);
  if (db.backendName === 'json' && !process.env.ADMIN_PASSWORD) {
    console.log('⚠️  ADMIN_PASSWORD não definido — usando senha padrão "admin123". Configure isso no Render em produção.');
  }
});
