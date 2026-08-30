import React, { useEffect, useState } from 'react';
import { fetchRestaurants, fetchPlatformSettings, RestaurantSummary, PlatformSettings } from '../utils/api';
import { getLayoutTheme, DEFAULT_LAYOUT } from '../utils/layouts';
import { RestaurantCard } from './RestaurantCard';

// Vitrine pública multi-restaurantes ("/"). Layout base: GALERIA GOURMET —
// fundo elegante, fotos reais grandes, tipografia sofisticada, pouco uso de
// ícones. O título/subtítulo e o layout de fundo vêm da configuração global
// da vitrine (super-admin); cada card usa a IDENTIDADE PRÓPRIA do restaurante
// (foto real, nome, slogan, cor primária/secundária e o estilo escolhido por
// ele — ver RestaurantCard.tsx) — nunca preso a uma cor fixa.
//
// Sem "Acesso do administrador" nem emoji como identidade: o painel continua
// existindo e protegido em /admin, só não aparece pra quem só quer pedir comida.

export const Landing: React.FC = () => {
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [platform, setPlatform] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchRestaurants(), fetchPlatformSettings().catch(() => null)])
      .then(([list, settings]) => {
        setRestaurants(list);
        setPlatform(
          settings || {
            landingTitle: 'Escolha seu restaurante',
            landingSubtitle: 'Cada loja tem seu próprio cardápio e pedidos',
            landingLayout: DEFAULT_LAYOUT,
          }
        );
      })
      .catch((err) => setError(err.message || 'Não foi possível carregar os restaurantes.'))
      .finally(() => setLoading(false));
  }, []);

  const theme = getLayoutTheme(platform?.landingLayout);
  // Colagem de até 4 fotos reais dos próprios restaurantes cadastrados no
  // fundo do hero — sem baixar/gerar nenhuma imagem nova, reaproveitando o
  // que cada restaurante já tem configurado (banner ou logo).
  const heroPhotos = restaurants
    .map((r) => r.bannerImage || r.logo)
    .filter((v): v is string => Boolean(v))
    .slice(0, 4);

  return (
    <div className={`min-h-screen ${theme.pageBg}`}>
      {/* ---------- HERO ---------- */}
      <div className="relative w-full h-[46vh] min-h-[280px] max-h-[420px] overflow-hidden">
        {heroPhotos.length > 0 ? (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
            {heroPhotos.map((src, idx) => (
              <div key={src + idx} className="relative overflow-hidden">
                <img src={src} alt="" loading="eager" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#3a2417,#1f1719)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black" />

        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className={`${theme.pageText} text-3xl sm:text-5xl ${theme.heroFont} drop-shadow-lg uppercase tracking-tight`}>
            {platform?.landingTitle || 'Escolha seu restaurante'}
          </h1>
          {platform?.landingSubtitle && (
            <p className={`${theme.pageText}/90 mt-3 max-w-md text-sm sm:text-base drop-shadow`}>
              {platform.landingSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* ---------- LISTA DE RESTAURANTES ---------- */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className={`${theme.pageText} text-xl sm:text-2xl ${theme.heroFont} uppercase tracking-wide`}>
            Nossos Restaurantes
          </h2>
          <p className={`${theme.pageSubtext} text-xs sm:text-sm mt-1`}>
            Cada loja tem sua própria identidade, cardápio e pedidos
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-4 text-center max-w-md mx-auto">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {restaurants.map((r) => (
              <RestaurantCard
                key={r.slug}
                restaurant={{
                  slug: r.slug,
                  name: r.name,
                  tagline: r.tagline,
                  photo: r.bannerImage || r.logo,
                  color: r.color,
                  secondaryColor: r.secondaryColor,
                  layout: r.layout,
                  bannerPositionX: r.bannerPositionX,
                  bannerPositionY: r.bannerPositionY,
                  bannerZoom: r.bannerZoom,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sem link/acesso administrativo aqui de propósito — o painel continua
          existindo e protegido em /admin, só não é exposto pro cliente. */}
      <div className="pb-8" />
    </div>
  );
};
