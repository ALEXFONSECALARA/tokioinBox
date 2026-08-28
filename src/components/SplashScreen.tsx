import React, { useEffect, useState } from 'react';
import { RestaurantConfig } from '../types';

interface SplashScreenProps {
  config: RestaurantConfig;
  onFinish: () => void;
}

// Tela de abertura em tela cheia: mostra fotos do restaurante (pratos, ambiente,
// promoções) em sequência, com transição suave (crossfade + leve zoom "Ken Burns"),
// por alguns segundos, antes de abrir o cardápio — estilo iFood / Uber Eats / Airbnb.
export const SplashScreen: React.FC<SplashScreenProps> = ({ config, onFinish }) => {
  const images = (config.splashImages || []).filter(Boolean);
  const secondsPerImage = config.splashDurationSeconds || 3;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);

  const finish = () => {
    if (isLeaving) return;
    setIsLeaving(true);
    // Aguarda a transição de saída (fade) terminar antes de remover a tela
    setTimeout(onFinish, 450);
  };

  useEffect(() => {
    if (images.length === 0) {
      finish();
      return;
    }
    const advanceTimer = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= images.length - 1) {
          clearInterval(advanceTimer);
          finish();
          return prev;
        }
        return prev + 1;
      });
    }, secondsPerImage * 1000);
    return () => clearInterval(advanceTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (images.length === 0) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-slate-950 overflow-hidden transition-opacity duration-500 ${
        isLeaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="dialog"
      aria-label={`Abrindo ${config.name}`}
    >
      {/* Fotos em crossfade com leve zoom contínuo (Ken Burns) */}
      {images.map((src, idx) => (
        <div
          key={src + idx}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === activeIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={src}
            alt=""
            className={`w-full h-full object-cover ${idx === activeIndex ? 'animate-splash-kenburns' : ''}`}
          />
        </div>
      ))}

      {/* Camada escura para o texto ficar legível */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/60" />

      {/* Conteúdo: logo + nome + slogan */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        {config.logo && (
          <img
            src={config.logo}
            alt={config.name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover shadow-2xl ring-4 ring-white/20 mb-5 animate-splash-pop"
          />
        )}
        <h1 className="text-white text-2xl sm:text-4xl font-black tracking-tight drop-shadow-lg animate-splash-fade-up">
          {config.name}
        </h1>
        {config.tagline && (
          <p className="text-white/85 text-sm sm:text-base font-medium mt-2 max-w-md drop-shadow animate-splash-fade-up [animation-delay:120ms]">
            {config.tagline}
          </p>
        )}
      </div>

      {/* Barra de progresso (uma seção por foto) */}
      <div className="absolute top-0 inset-x-0 flex gap-1.5 p-3 sm:p-4">
        {images.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
            <div
              className={`h-full bg-white rounded-full ${
                idx < activeIndex
                  ? 'w-full'
                  : idx === activeIndex
                  ? 'w-full animate-splash-progress'
                  : 'w-0'
              }`}
              style={idx === activeIndex ? { animationDuration: `${secondsPerImage}s` } : undefined}
            />
          </div>
        ))}
      </div>

      {/* Botão pular */}
      <button
        onClick={finish}
        className="absolute bottom-6 right-4 sm:right-6 text-white/90 hover:text-white text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 transition-colors"
      >
        Pular →
      </button>
    </div>
  );
};
