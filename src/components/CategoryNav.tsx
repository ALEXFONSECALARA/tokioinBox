import React from 'react';
import { Category } from '../types';
import { 
  UtensilsCrossed, 
  Flame, 
  ChefHat, 
  Sparkles, 
  Cake, 
  GlassWater, 
  BadgePercent,
  Layers
} from 'lucide-react';

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  categoryItemCounts: Record<string, number>;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  categoryItemCounts,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'UtensilsCrossed':
        return <UtensilsCrossed className="w-4 h-4" />;
      case 'Flame':
        return <Flame className="w-4 h-4" />;
      case 'ChefHat':
        return <ChefHat className="w-4 h-4" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4" />;
      case 'Cake':
        return <Cake className="w-4 h-4" />;
      case 'GlassWater':
        return <GlassWater className="w-4 h-4" />;
      case 'BadgePercent':
        return <BadgePercent className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <nav aria-label="Navegação por Categorias" className="sticky top-11 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs py-2.5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
        <button
          id="category-tab-all"
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeCategoryId === 'all'
              ? 'bg-amber-500 text-stone-950 shadow-sm'
              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Cardápio Completo</span>
        </button>

        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          const count = categoryItemCounts[cat.id] || 0;
          return (
            <button
              key={cat.id}
              id={`category-tab-${cat.id}`}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {getIcon(cat.icon)}
              <span>{cat.name}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-stone-950 text-amber-400' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
