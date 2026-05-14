import type { Category } from '@/types';
import { Code, Languages, FlaskConical, BookOpen, Calculator, Edit3, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useState } from 'react';

interface CategoryCardProps {
  category: Category;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  code: Code,
  languages: Languages,
  flask: FlaskConical,
  'book-open': BookOpen,
  calculator: Calculator,
};

export function CategoryCard({ category, style, onClick }: CategoryCardProps) {
  const { getItemsByCategory } = useStore();
  const items = getItemsByCategory(category.id);
  const activeItems = items.filter(item => item.status !== 'archived').length;
  const masteredItems = items.filter(item => item.status === 'completed').length;
  const progressPercentage = activeItems > 0 ? Math.round((masteredItems / activeItems) * 100) : 0;
  
  const Icon = iconMap[category.icon] || Code;
  const { updateCategory, deleteCategory } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);

  return (
    <div 
      className="relative flex-shrink-0 w-36 bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5 card-press cursor-pointer hover:border-white/10 transition-colors"
      style={style}
      onClick={onClick}
    >
      {/* Edit / Delete controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); setName(category.name); }}
          className="p-1 rounded bg-white/5 hover:bg-white/8"
          aria-label="Edit category"
        >
          <Edit3 size={14} />
        </button>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (category.is_default) return alert('Default category cannot be deleted.');
            const ok = window.confirm(`Delete category "${category.name}"? This will move items to another category.`);
            if (!ok) return;
            try {
              await deleteCategory(category.id);
            } catch (err) {
              console.error('Delete category failed', err);
              alert('Failed to delete category');
            }
          }}
          className="p-1 rounded bg-white/5 hover:bg-white/8"
          aria-label="Delete category"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${category.color}20` }}
      >
        <Icon size={20} style={{ color: category.color }} />
      </div>
      
      <h4 className="text-sm font-semibold text-remembra-text-primary mb-1 truncate">
        {!isEditing ? (
          category.name
        ) : (
          <input
            autoFocus
            value={name}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  try {
                    await updateCategory(category.id, { name: name.trim() });
                    setIsEditing(false);
                  } catch (err) {
                    console.error('Failed to update category', err);
                    alert('Failed to update category');
                  }
              } else if (e.key === 'Escape') {
                setIsEditing(false);
                setName(category.name);
              }
            }}
            onBlur={async () => {
                try {
                  await updateCategory(category.id, { name: name.trim() });
                } catch (err) {
                  console.error('Failed to update category', err);
                  alert('Failed to update category');
                  setName(category.name);
                } finally {
                  setIsEditing(false);
                }
            }}
            className="w-full bg-transparent border-b border-white/8 text-sm font-semibold text-remembra-text-primary focus:outline-none"
          />
        )}
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
