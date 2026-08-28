import React, { useEffect, useState } from 'react';
import { fetchRestaurants, RestaurantSummary } from '../utils/api';
import { ChefHat, ShieldCheck } from 'lucide-react';

export const Landing: React.FC = () => {
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRestaurants()
      .then(setRestaurants)
      .catch((err) => setError(err.message || 'Não foi possível carregar os restaurantes.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center px-4 py-12">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-stone-900 text-white mb-4">
            <ChefHat size={28} />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Escolha um restaurante</h1>
          <p className="text-stone-500 mt-1">Cada loja tem seu próprio cardápio e pedidos</p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-xl p-4 text-center">{error}</div>
        )}

        {!loading && !error && (
          <div className="grid sm:grid-cols-2 gap-4">
            {restaurants.map((r) => (
              <a
                key={r.slug}
                href={`/${r.slug}`}
                className="group bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-4 hover:shadow-md hover:border-stone-300 transition-all"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                  style={{ backgroundColor: `${r.color}22` }}
                >
                  {r.emoji}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900 truncate">{r.name}</p>
                  <p className="text-sm text-stone-500">Ver cardápio →</p>
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <a
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800"
          >
            <ShieldCheck size={16} /> Acesso do administrador
          </a>
        </div>
      </div>
    </div>
  );
};
