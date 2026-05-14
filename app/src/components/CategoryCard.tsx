import type { Category } from '@/types';
import { Code, Languages, FlaskConical, BookOpen, Calculator, Edit3, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCategory(category.id);
      toast.success('Category deleted');
      setDeleteOpen(false);
    } catch (err) {
      console.error('Delete category failed', err);
      toast.error('Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="group relative flex-shrink-0 w-36 bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5 card-press cursor-pointer hover:border-white/10 transition-colors"
      style={style}
      onClick={onClick}
    >
      {/* Edit / Delete controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
            if (category.is_default) {
              toast.info('Default category cannot be deleted');
              return;
            }
            setDeleteOpen(true);
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
                    const nextName = name.trim();
                    if (!nextName) {
                      toast.error('Category name is required');
                      return;
                    }
                    await updateCategory(category.id, { name: nextName });
                    setIsEditing(false);
                  } catch (err) {
                    console.error('Failed to update category', err);
                    toast.error('Failed to update category');
                  }
              } else if (e.key === 'Escape') {
                setIsEditing(false);
                setName(category.name);
              }
            }}
            onBlur={async () => {
                try {
                  const nextName = name.trim();
                  if (!nextName) {
                    toast.error('Category name is required');
                    setName(category.name);
                    return;
                  }
                  await updateCategory(category.id, { name: nextName });
                } catch (err) {
                  console.error('Failed to update category', err);
                  toast.error('Failed to update category');
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="liquid-glass w-[min(92vw,26rem)] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-remembra-text-primary">Delete category?</AlertDialogTitle>
            <AlertDialogDescription className="text-remembra-text-muted">
              Items in "{category.name}" will be moved to another category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="bg-remembra-bg-tertiary border-white/10 text-remembra-text-primary hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-remembra-danger hover:bg-remembra-danger/90 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
