import React from 'react';
import { MenuItem } from '../types';
import { formatCurrency, getDietaryTagInfo } from '../utils/helpers';
import { Plus, Clock, Users, Heart } from 'lucide-react';

interface ProductCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onSelect,
  isFavorite,
  onToggleFavorite,
}) => {
  const hasDiscount = item.originalPrice && item.originalPrice > item.price;
  const discountPercent = hasDiscount
    ? Math.round(((item.originalPrice! - item.price) / item.originalPrice!) * 100)
    : 0;

  return (
    <article
      id={`product-card-${item.id}`}
      onClick={() => item.available && onSelect(item)}
      className={`group bg-white rounded-2xl border border-stone-200 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-amber-400 flex flex-col justify-between cursor-pointer relative ${
        !item.available ? 'opacity-60 cursor-not-allowed grayscale-[0.4]' : ''
      }`}
    >
      <div>
        {/* Card Image and Floating Badges */}
        <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-stone-100">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          {/* Discount and Availability Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
            {hasDiscount && (
              <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                -{discountPercent}% OFF
              </span>
            )}
            {!item.available && (
              <span className="bg-stone-900/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                Esgotado no momento
              </span>
            )}
          </div>

          {/* Favorite button */}
          <button
            id={`fav-btn-${item.id}`}
            onClick={(e) => onToggleFavorite(item.id, e)}
            className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-all border border-white/20"
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
          </button>

          {/* Dietary / Feature Tags Over Image */}
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag) => {
              const info = getDietaryTagInfo(tag);
              return (
                <span
                  key={tag}
                  className="bg-stone-950/80 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-md"
                >
                  {info.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug group-hover:text-amber-600 transition-colors line-clamp-1">
              {item.name}
            </h3>
          </div>

          <p className="text-stone-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          {/* Metadata info */}
          <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-3">
            {item.preparationTimeMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                {item.preparationTimeMinutes} min
              </span>
            )}
            {item.servesCount && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-stone-400" />
                Serve {item.servesCount} {item.servesCount > 1 ? 'pessoas' : 'pessoa'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Price & Add Button */}
      <div className="p-4 pt-0 flex items-center justify-between mt-2 border-t border-stone-100 pt-3">
        <div>
          {hasDiscount && (
            <span className="text-[11px] text-stone-400 line-through block font-medium">
              {formatCurrency(item.originalPrice!)}
            </span>
          )}
          <span className="text-base sm:text-lg font-extrabold text-stone-900">
            {formatCurrency(item.price)}
          </span>
        </div>

        <button
          id={`add-btn-${item.id}`}
          disabled={!item.available}
          onClick={(e) => {
            e.stopPropagation();
            if (item.available) onSelect(item);
          }}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
            item.available
              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 active:scale-95 shadow-xs'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{item.choices || item.extras ? 'Personalizar' : 'Adicionar'}</span>
        </button>
      </div>
    </article>
  );
};
