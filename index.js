import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'menu.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

async function readMenu() {
  const raw = await readFile(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function writeMenu(data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/menu -> tudo (categorias, itens, config do restaurante)
app.get('/api/menu', async (req, res) => {
  try {
    const data = await readMenu();
    res.json(data);
  } catch (err) {
    console.error('Erro ao ler menu.json:', err);
    res.status(500).json({ error: 'Não foi possível carregar o cardápio.' });
  }
});

// PUT /api/menu-items -> substitui a lista completa de itens do cardápio
app.put('/api/menu-items', async (req, res) => {
  try {
    const menuItems = req.body;
    if (!Array.isArray(menuItems)) {
      return res.status(400).json({ error: 'Corpo da requisição deve ser um array de itens.' });
    }
    const data = await readMenu();
    data.menuItems = menuItems;
    await writeMenu(data);
    res.json({ ok: true, menuItems });
  } catch (err) {
    console.error('Erro ao salvar itens:', err);
    res.status(500).json({ error: 'Não foi possível salvar os itens do cardápio.' });
  }
});

// PUT /api/categories -> substitui a lista completa de categorias
app.put('/api/categories', async (req, res) => {
  try {
    const categories = req.body;
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'Corpo da requisição deve ser um array de categorias.' });
    }
    const data = await readMenu();
    data.categories = categories;
    await writeMenu(data);
    res.json({ ok: true, categories });
  } catch (err) {
    console.error('Erro ao salvar categorias:', err);
    res.status(500).json({ error: 'Não foi possível salvar as categorias.' });
  }
});

// PUT /api/config -> substitui a configuração do restaurante
app.put('/api/config', async (req, res) => {
  try {
    const restaurantConfig = req.body;
    if (!restaurantConfig || typeof restaurantConfig !== 'object' || Array.isArray(restaurantConfig)) {
      return res.status(400).json({ error: 'Corpo da requisição deve ser um objeto de configuração.' });
    }
    const data = await readMenu();
    data.restaurantConfig = restaurantConfig;
    await writeMenu(data);
    res.json({ ok: true, restaurantConfig });
  } catch (err) {
    console.error('Erro ao salvar configuração:', err);
    res.status(500).json({ error: 'Não foi possível salvar a configuração do restaurante.' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Em produção, o Express também serve o front-end já buildado (npm run build -> dist/)
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor do cardápio rodando na porta ${PORT}`);
});
