# Tokio inBox — Multicardápio (4 restaurantes)

Plataforma com **4 restaurantes separados** (Japonês, Italiano, Pizza e
Hamburgueria), cada um com seu próprio cardápio, URL e pedidos — e um **painel
único de super-admin** (uma senha só) pra gerenciar todos e receber os pedidos
em tempo real.

## Como está organizado

- `GET /:slug` → cardápio público do restaurante (ex: `/japones`, `/pizza`,
  `/italiano`, `/hamburgueria`)
- `/` → página inicial com a lista dos 4 restaurantes
- `/admin` → painel do super-admin (pede senha), com um seletor pra trocar
  entre os 4 restaurantes e gerenciar cardápio + pedidos de cada um
- `server/data/restaurants.json` → registro dos 4 restaurantes (nome, emoji, cor)
- `server/data/restaurants/<slug>/menu.json` → cardápio de cada restaurante
- `server/data/restaurants/<slug>/orders.json` → pedidos de cada restaurante

## Login do admin

Uma senha única dá acesso ao painel `/admin`, de onde dá pra gerenciar os 4
restaurantes (não precisa logar de novo pra cada um).

- **Local:** a senha padrão é `admin123` (veja `server/index.js`)
- **Produção (Render):** defina a variável de ambiente `ADMIN_PASSWORD` com uma
  senha forte, em Render → seu serviço → Environment

## Rodando localmente

```bash
npm install

# Gera os dados iniciais dos 4 restaurantes (só precisa rodar uma vez,
# ou se quiser resetar tudo pro estado original)
node scripts/seed-restaurants.mjs

# Terminal 1 — backend (API + dados)
npm run server        # http://localhost:3001

# Terminal 2 — front-end
npm run dev            # http://localhost:3000
```

Acesse `http://localhost:3000` pra ver a lista de restaurantes, ou direto
`http://localhost:3000/japones`, `/italiano`, `/pizza`, `/hamburgueria`.
Pra administrar, vá em `http://localhost:3000/admin` (senha `admin123` em dev).

## Deploy: GitHub + Render

1. Suba o projeto pro GitHub (`git add . && git commit -m "..." && git push`)
2. No Render, crie um **Web Service** apontando pro repositório (o
   `render.yaml` já vem configurado como Blueprint)
3. **Importante:** em Render → Environment, defina `ADMIN_PASSWORD` com a
   senha que você quer usar em produção (não deixe a padrão `admin123`)
4. Depois do deploy, a URL do Render já serve tudo: `/`, `/japones`, `/admin`
   etc, no mesmo domínio

### ⚠️ Persistência de dados no Render (plano grátis)

O plano gratuito do Render usa disco **efêmero**. Isso significa que sempre
que o serviço reiniciar ou você fizer um novo deploy, os arquivos em
`server/data/` voltam pro estado que está no GitHub — ou seja, **pedidos
recebidos e edições de cardápio feitas depois do último deploy se perdem**.

Duas formas de resolver isso de verdade:

- **Persistent Disk** (recurso pago do Render) montado em `server/data`, pra
  que os arquivos sobrevivam a reinícios
- **Migrar pra um banco de dados** (ex: Render Postgres), recomendado se o
  volume de pedidos for grande ou se isso for pra uso real de produção

Pra uso de teste/demonstração, o jeito atual (arquivos JSON) funciona bem —
só não confie nele pra não perder pedidos reais em produção sem um dos ajustes
acima.

## Adicionando um 5º restaurante no futuro

1. Edite `scripts/seed-restaurants.mjs` e adicione o novo restaurante no
   objeto `restaurants` (categorias, itens, config)
2. Rode `node scripts/seed-restaurants.mjs` (ele não sobrescreve restaurantes
   que já existem, só cria os novos)
3. Pronto — o novo restaurante já aparece na lista (`/`) e no admin (`/admin`)
