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
import { hashPassword, verifyPassword } from './lib/passwords.js';
import { sanitizePermissions } from './lib/permissions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Senha única do super-admin. Em produção, defina ADMIN_PASSWORD nas variáveis
// de ambiente do Render. Em desenvolvimento local, usa "admin123" por padrão.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Tokens de sessão do admin ficam em memória (somem se o servidor reiniciar,
// então o admin só precisa logar de novo — nada grave).
//
// Fase 4 (itens 17-19): cada token agora guarda também QUEM logou.
// userId === null → login mestre (senha única ADMIN_PASSWORD, comportamento
// de sempre, acesso total, nada muda pra quem já usa isso). userId
// preenchido → usuário individual, com permissões e restaurante próprios
// (ver server/lib/permissions.js e requirePermission/requireOwnRestaurant
// abaixo).
const adminTokens = new Map(); // token -> { expiresAt, userId }
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function issueToken(userId = null) {
  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.set(token, { expiresAt: Date.now() + TOKEN_TTL_MS, userId });
  return token;
}

function getTokenSession(token) {
  if (!token) return null;
  const session = adminTokens.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    adminTokens.delete(token);
    return null;
  }
  return session;
}

// Middleware base: exige um token válido (mestre OU de usuário individual) e
// popula req.adminUser com o que a rota precisa saber pra decidir permissão/
// isolamento. Mantém 100% de compatibilidade com o login mestre existente.
async function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const session = getTokenSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado. Faça login no admin novamente.' });
  }
  if (session.userId === null) {
    // Login mestre — acesso total, exatamente como sempre funcionou.
    req.adminUser = { isMaster: true, permissions: {}, restaurantSlug: null };
    return next();
  }
  try {
    const user = await db.getAdminUserById(session.userId);
    if (!user || !user.active) {
      adminTokens.delete(token);
      return res.status(401).json({ error: 'Usuário desativado ou não encontrado. Faça login novamente.' });
    }
    req.adminUser = {
      isMaster: false,
      id: user.id,
      restaurantSlug: user.restaurantSlug || null,
      permissions: user.permissions || {},
    };
    next();
  } catch (err) {
    console.error('Erro ao validar sessão do usuário:', err);
    res.status(500).json({ error: 'Não foi possível validar a sessão.' });
  }
}

function hasPermission(req, key) {
  return Boolean(req.adminUser?.isMaster || req.adminUser?.permissions?.[key]);
}

// Exige uma permissão específica (item 18). Login mestre sempre passa.
function requirePermission(key) {
  return (req, res, next) => {
    if (!hasPermission(req, key)) {
      return res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
    }
    next();
  };
}

// Isolamento entre restaurantes (itens 19/44): um usuário vinculado a um
// restaurante não pode mexer em outro, a menos que tenha a permissão
// admin_gerenciar_restaurantes. Login mestre e usuários sem restaurante
// fixo (super-admin) não são afetados por essa checagem.
function requireOwnRestaurant(req, res, next) {
  const { slug } = req.params;
  const user = req.adminUser;
  if (!user || user.isMaster) return next();
  if (!user.restaurantSlug) return next(); // usuário de escopo super-admin
  if (user.restaurantSlug === slug) return next();
  if (hasPermission(req, 'admin_gerenciar_restaurantes')) return next();
  return res.status(403).json({ error: 'Você não tem acesso a este restaurante.' });
}

const app = express();
app.set('trust proxy', 1);
app.use(cors());

// Compatibilidade com builds antigos que receberam VITE_API_URL já terminado
// em /api e, por isso, ainda podem chamar /api/api/... durante uma transição
// de deploy. Normaliza antes das rotas para que esses clientes não recebam 404.
app.use((req, res, next) => {
  if (req.url === '/api/api' || req.url.startsWith('/api/api/')) {
    req.url = req.url.replace(/^\/api\/api(?=\/|$)/, '/api');
  }
  next();
});
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

// Login individual (Fase 4, item 17) — login + senha de um usuário criado
// pelo super-admin em /api/admin/users. Convive com o login mestre acima
// sem substituí-lo: a tela de login do painel pode continuar usando a senha
// única, ou usar login+senha de um usuário específico.
app.post('/api/admin/users/login', async (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res.status(400).json({ error: 'Informe login e senha.' });
  }
  try {
    const user = await db.getAdminUserByLogin(login);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Login ou senha incorretos.' });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Login ou senha incorretos.' });
    }
    res.json({
      token: issueToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        login: user.login,
        role: user.role,
        restaurantSlug: user.restaurantSlug,
        permissions: user.permissions,
      },
    });
  } catch (err) {
    console.error('Erro no login de usuário:', err);
    res.status(500).json({ error: 'Não foi possível fazer login.' });
  }
});

// ---------- Usuários do painel + permissões granulares (Fase 4, itens 17-19) ----------
// Sempre exige admin_gerenciar_usuarios (ou restaurante_usuarios pra um
// usuário mexer só na sua própria lista/restaurante) — login mestre sempre
// passa, sem mudar nada de como ele já funcionava.
function canManageUsers(req) {
  return hasPermission(req, 'admin_gerenciar_usuarios') || hasPermission(req, 'restaurante_usuarios');
}

// Nunca devolve o hash da senha pro frontend.
function publicAdminUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  if (!canManageUsers(req)) return res.status(403).json({ error: 'Você não tem permissão para ver usuários.' });
  try {
    let users = await db.listAdminUsers();
    // Usuário sem escopo de super-admin (restaurante_usuarios, não
    // admin_gerenciar_usuarios) só vê os usuários do próprio restaurante.
    if (!req.adminUser.isMaster && !hasPermission(req, 'admin_gerenciar_usuarios') && req.adminUser.restaurantSlug) {
      users = users.filter((u) => u.restaurantSlug === req.adminUser.restaurantSlug);
    }
    res.json(users.map(publicAdminUser));
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Não foi possível carregar os usuários.' });
  }
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  if (!canManageUsers(req)) return res.status(403).json({ error: 'Você não tem permissão para criar usuários.' });
  const { name, login, password, restaurantSlug, role, permissions } = req.body || {};
  if (!name || !login || !password) {
    return res.status(400).json({ error: 'Nome, login e senha inicial são obrigatórios.' });
  }
  // Usuário não-mestre sem escopo global só pode criar usuários pro próprio
  // restaurante (reforço de isolamento — item 19).
  let finalRestaurantSlug = restaurantSlug || null;
  if (!req.adminUser.isMaster && !hasPermission(req, 'admin_gerenciar_usuarios')) {
    finalRestaurantSlug = req.adminUser.restaurantSlug;
  }
  if (finalRestaurantSlug && !(await db.restaurantExists(finalRestaurantSlug))) {
    return res.status(404).json({ error: 'Restaurante não encontrado.' });
  }
  try {
    const passwordHash = await hashPassword(password);
    const user = await db.createAdminUser({
      name,
      login,
      passwordHash,
      restaurantSlug: finalRestaurantSlug,
      role,
      permissions: sanitizePermissions(permissions),
    });
    res.status(201).json({ ok: true, user: publicAdminUser(user) });
  } catch (err) {
    if (err.code === 'LOGIN_TAKEN') {
      return res.status(409).json({ error: 'Já existe um usuário com esse login.' });
    }

    // Supabase: quando a migração 0012 ainda não foi executada, a tabela
    // admin_users não existe e o erro original acabava escondido atrás de
    // "Não foi possível criar o usuário". Retornamos uma mensagem acionável
    // sem expor a chave, SQL ou detalhes internos do banco.
    if (err.code === '42P01' || /relation .*admin_users.* does not exist/i.test(String(err.message || ''))) {
      console.error('Tabela admin_users ausente. Execute supabase/migrations/0012_admin_users.sql no Supabase.');
      return res.status(503).json({
        error: 'O banco ainda não está preparado para Usuários e Permissões. Execute a migração 0012_admin_users.sql no Supabase e faça um novo deploy.'
      });
    }

    console.error('Erro ao criar usuário:', {
      message: err?.message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
    });
    res.status(500).json({ error: 'Não foi possível criar o usuário. Verifique o log do servidor para identificar o erro do banco.' });
  }
});

// Editar dados, permissões, ativar/desativar e (opcionalmente) redefinir a
// senha de um usuário. O super-admin nunca vê a senha original — só pode
// definir uma nova (item 19).
app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
  if (!canManageUsers(req)) return res.status(403).json({ error: 'Você não tem permissão para editar usuários.' });
  const { id } = req.params;
  const existing = await db.getAdminUserById(id).catch(() => null);
  if (!existing) return res.status(404).json({ error: 'Usuário não encontrado.' });
  // Isolamento: quem não é mestre/gerenciar_usuarios global só edita usuários
  // do próprio restaurante.
  if (
    !req.adminUser.isMaster &&
    !hasPermission(req, 'admin_gerenciar_usuarios') &&
    existing.restaurantSlug !== req.adminUser.restaurantSlug
  ) {
    return res.status(403).json({ error: 'Você não tem acesso a este usuário.' });
  }
  const { name, restaurantSlug, role, active, permissions, newPassword } = req.body || {};
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (role !== undefined) patch.role = role;
  if (active !== undefined) patch.active = Boolean(active);
  if (permissions !== undefined) patch.permissions = sanitizePermissions(permissions);
  // Só quem tem escopo global pode mudar o restaurante de um usuário.
  if (restaurantSlug !== undefined && (req.adminUser.isMaster || hasPermission(req, 'admin_gerenciar_usuarios'))) {
    patch.restaurantSlug = restaurantSlug || null;
  }
  if (newPassword) {
    patch.passwordHash = await hashPassword(newPassword);
  }
  try {
    const updated = await db.updateAdminUser(id, patch);
    res.json({ ok: true, user: publicAdminUser(updated) });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: 'Não foi possível atualizar o usuário.' });
  }
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
app.patch(
  '/api/admin/restaurants/:slug/active',
  requireAdmin,
  requirePermission('admin_ativar_desativar_restaurantes'),
  async (req, res) => {
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
app.post('/api/:slug/upload', requireAdmin, requireOwnRestaurant, (req, res) => {
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
      // Se o fallback local estiver sendo usado, devolve uma URL absoluta.
      // Assim o frontend funciona mesmo quando VITE_API_URL está apontando
      // para outro domínio ou quando o build antigo ainda está em cache.
      if (url.startsWith('/uploads/')) {
        url = `${req.protocol}://${req.get('host')}${url}`;
      }
      res.status(201).json({ ok: true, url });
    } catch (uploadErr) {
      console.error(`Erro ao enviar imagem (${slug}):`, uploadErr);
      res.status(500).json({ error: 'Não foi possível salvar a imagem. Tente novamente.' });
    }
  });
});

app.put('/api/:slug/menu-items', requireAdmin, requireOwnRestaurant, async (req, res) => {
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

app.put('/api/:slug/categories', requireAdmin, requireOwnRestaurant, async (req, res) => {
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

app.put('/api/:slug/config', requireAdmin, requireOwnRestaurant, async (req, res) => {
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
app.get('/api/:slug/orders', requireAdmin, requireOwnRestaurant, async (req, res) => {
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
app.patch('/api/:slug/orders/:id', requireAdmin, requireOwnRestaurant, async (req, res) => {
  const { slug, id } = req.params;
  if (!(await db.restaurantExists(slug))) return res.status(404).json({ error: 'Restaurante não encontrado.' });
  // Cancelamento é uma ação sensível (item 18/23-25): exige a permissão
  // específica, mesmo que o usuário já tenha acesso de escrita ao pedido.
  // Login mestre continua com acesso total, sem mudança de comportamento.
  if (req.body?.status === 'cancelado' && !hasPermission(req, 'cancelar_pedido')) {
    return res.status(403).json({ error: 'Você não tem permissão para cancelar pedidos.' });
  }
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
