# Cardápio online (JSON + backend) — GitHub + Render

O cardápio (categorias, itens do menu e configurações do restaurante) agora é
servido por um pequeno backend Node/Express, que lê e grava um arquivo JSON
(`server/data/menu.json`). O front-end (React) busca esses dados em
`GET /api/menu` em vez de usar o arquivo `src/data/initialData.ts` fixo.

## Estrutura nova

- `server/index.js` — API Express:
  - `GET /api/menu` → categorias + itens + configuração do restaurante
  - `PUT /api/menu-items` → salva a lista completa de itens
  - `PUT /api/categories` → salva a lista completa de categorias
  - `PUT /api/config` → salva a configuração do restaurante
  - Em produção, o mesmo processo também serve os arquivos estáticos de `dist/`
    (o build do front-end), então é **um único serviço** no Render.
- `server/data/menu.json` — onde os dados ficam salvos. Já vem populado com o
  cardápio atual (gerado a partir do `initialData.ts` antigo).
- `src/utils/api.ts` — funções do front-end para buscar/salvar no backend.
- `src/App.tsx` — agora busca o cardápio do backend ao carregar, e sempre que o
  Admin edita um item, categoria ou a configuração do restaurante, a mudança é
  enviada de volta pro backend (além de continuar guardando uma cópia em
  `localStorage` como cache).

## Rodando localmente

Precisa de **dois processos** em desenvolvimento (o Vite não roda o backend
sozinho):

```bash
npm install

# Terminal 1 — backend (API + dados)
npm run server        # roda em http://localhost:3001

# Terminal 2 — front-end
npm run dev            # roda em http://localhost:3000
```

O Vite já está configurado para redirecionar chamadas `/api/*` para
`http://localhost:3001` (veja `vite.config.ts`), então tudo funciona junto.

## Deploy: GitHub + Render

1. **Suba o projeto para o GitHub** (repositório novo ou existente):
   ```bash
   git add .
   git commit -m "Migra cardápio para backend JSON"
   git push origin main
   ```

2. **No Render**, crie um novo **Web Service** apontando para esse repositório.
   Se você usar o arquivo `render.yaml` incluso, o Render já detecta a
   configuração automaticamente (Blueprint). Caso configure manualmente, use:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Environment:** Node

3. Depois do deploy, o Render vai te dar uma URL única
   (ex: `https://sabor-e-brasa-cardapio.onrender.com`) que já serve tanto o
   site quanto a API (`/api/menu`, etc), tudo no mesmo lugar.

### ⚠️ Importante: persistência do JSON no Render

O plano **gratuito** do Render usa disco **efêmero**: toda vez que o serviço
reinicia (deploy novo, ou o serviço "dorme" e acorda de novo), o arquivo
`server/data/menu.json` volta para a versão que está no seu repositório
GitHub — ou seja, **edições feitas pelo Admin Dashboard depois do deploy se
perdem** quando o serviço reiniciar.

Para editar de forma permanente sem esse problema, você tem duas opções:

- **Opção simples:** edite o cardápio localmente (rodando `npm run server` na
  sua máquina, usando o Admin Dashboard), depois faça commit do
  `server/data/menu.json` atualizado e dê `git push` — o próximo deploy do
  Render já sobe com o cardápio novo.
- **Opção robusta (recomendada para uso real):** adicione um **Persistent
  Disk** no Render (recurso pago) montado em
  `server/data`, para que o arquivo sobreviva a reinícios e deploys. Ou migre
  o armazenamento para um banco de dados de verdade (ex: Render Postgres),
  caso o restaurante vá editar o cardápio com frequência direto em produção.
