import type { Category } from '@/types';
import { Code, Languages, FlaskConical, BookOpen, Calculator } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface CategoryCardProps {
  category: Category;
  style?: React.CSSProperties;
}

const iconMap: Record<string, React.ElementType> = {
  code: Code,
  languages: Languages,
  flask: FlaskConical,
  'book-open': BookOpen,
  calculator: Calculator,
};

export function CategoryCard({ category, style }: CategoryCardProps) {
  const { getItemsByCategory } = useStore();
  const items = getItemsByCategory(category.id);
  const activeItems = items.filter(item => item.status !== 'archived').length;
  const masteredItems = items.filter(item => item.status === 'completed').length;
  const progressPercentage = activeItems > 0 ? Math.round((masteredItems / activeItems) * 100) : 0;
  
  const Icon = iconMap[category.icon] || Code;

  return (
    <div 
      className="flex-shrink-0 w-36 bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5 card-press cursor-pointer hover:border-white/10 transition-colors"
      style={style}
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${category.color}20` }}
      >
        <Icon size={20} style={{ color: category.color }} />
      </div>
      
      <h4 className="text-sm font-semibold text-remembra-text-primary mb-1 truncate">
        {category.name}
      </h4>
      
      <p className="text-xs text-remembra-text-muted mb-3">
        {activeItems} items
      </p>
      
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-remembra-bg-tertiary rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${progressPercentage}%`,
              backgroundColor: category.color 
            }}
          />
        </div>
        <span className="text-xs font-medium text-remembra-text-secondary">
          {progressPercentage}%
        </span>
      </div>
    </div>
  );
}
