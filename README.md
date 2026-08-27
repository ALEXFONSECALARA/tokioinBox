<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d50af42b-1b9c-471c-9389-ec1caf300c9a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the backend (serves the menu JSON API):
   `npm run server`
4. Run the app (in another terminal):
   `npm run dev`

> O cardápio agora é servido por um backend Node/Express (JSON em
> `server/data/menu.json`) em vez de estar fixo no código. Veja
> [DEPLOY.md](DEPLOY.md) para detalhes e instruções de deploy no GitHub + Render.
