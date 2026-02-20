import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ReviewStatus, MemoryItem } from '@/types';
import { getStageDayLabel } from '@/domain/review147';
import { 
  Search, 
  Grid3X3, 
  List, 
  LayoutGrid, 
  MoreVertical,
  Brain,
  CheckCircle2,
  BookOpen,
  Archive,
  Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ItemDetail } from '@/components/ItemDetail';

const INITIAL_RENDER_COUNT = 36;
const RENDER_INCREMENT = 24;
const SEARCH_CONTENT_WINDOW = 2800;

export function Library() {
  const memoryItems = useStore((state) => state.memoryItems);
  const categories = useStore((state) => state.categories);
  const getCategoryById = useStore((state) => state.getCategoryById);
  const startReviewSession = useStore((state) => state.startReviewSession);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'masonry'>('grid');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<MemoryItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);

  const deferredSearch = useDeferredValue(searchQuery);
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const searchTerms = useMemo(
    () => normalizedSearch.split(/\s+/).filter(Boolean),
    [normalizedSearch],
  );

  const statusCounts = useMemo(() => {
    const counts = {
      all: memoryItems.length,
      active: 0,
      completed: 0,
      archived: 0,
    };
    for (const item of memoryItems) {
      counts[item.status] += 1;
    }
    return counts;
  }, [memoryItems]);

  const filteredItems = useMemo(() => {
    return memoryItems.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      if (!matchesStatus) return false;

      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      if (!matchesCategory) return false;

      if (searchTerms.length === 0) return true;

      const searchable = `${item.title}\n${item.content.slice(0, SEARCH_CONTENT_WINDOW)}`.toLowerCase();
      return searchTerms.every((term) => searchable.includes(term));
    });
  }, [memoryItems, searchTerms, selectedCategory, statusFilter]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  );

  const activeFilteredCount = useMemo(
    () => filteredItems.reduce((count, item) => count + (item.status === 'active' ? 1 : 0), 0),
    [filteredItems],
  );

  const hasMoreItems = visibleCount < filteredItems.length;

  useEffect(() => {
    setVisibleCount(INITIAL_RENDER_COUNT);
  }, [statusFilter, selectedCategory, normalizedSearch, viewMode]);

  const statusTabs: { value: ReviewStatus | 'all'; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: statusCounts.all },
    { value: 'active', label: 'Active', count: statusCounts.active },
    { value: 'completed', label: 'Completed', count: statusCounts.completed },
    { value: 'archived', label: 'Archived', count: statusCounts.archived },
  ];

  const getStatusIcon = (status: ReviewStatus) => {
    switch (status) {
      case 'active': return BookOpen;
      case 'completed': return CheckCircle2;
      case 'archived': return Archive;
    }
  };

  const getStatusColor = (status: ReviewStatus) => {
    switch (status) {
      case 'active': return 'bg-remembra-warning/20 text-remembra-warning';
      case 'completed': return 'bg-remembra-success/20 text-remembra-success';
      case 'archived': return 'bg-remembra-text-muted/20 text-remembra-text-muted';
    }
  };

  return (
    <div className="bg-black lined-bg-subtle screen-page px-4 sm:px-5 safe-top safe-bottom-nav-extended sm:pb-8">
      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetail item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
      
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-remembra-text-primary mb-1">Library</h1>
        <p className="text-remembra-text-muted">Manage your learning materials</p>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-remembra-text-muted" size={18} />
        <Input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 pr-4 py-6 bg-remembra-bg-secondary border-white/5 rounded-2xl text-remembra-text-primary placeholder:text-remembra-text-muted focus:border-remembra-accent-primary/50"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 -mx-4 px-4 sm:-mx-5 sm:px-5">
        {statusTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
              transition-all duration-200
              ${statusFilter === tab.value 
                ? 'bg-remembra-accent-primary text-white' 
                : 'bg-remembra-bg-secondary text-remembra-text-secondary hover:text-remembra-text-primary'
              }
            `}
          >
            {tab.label}
            <span className={`
              px-2 py-0.5 rounded-full text-xs
              ${statusFilter === tab.value ? 'bg-white/20' : 'bg-remembra-bg-tertiary'}
            `}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium transition-colors
              ${selectedCategory === 'all' 
                ? 'bg-remembra-bg-tertiary text-remembra-text-primary' 
                : 'bg-remembra-bg-secondary text-remembra-text-muted'
              }
            `}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${selectedCategory === cat.id 
                  ? 'text-white' 
                  : 'bg-remembra-bg-secondary text-remembra-text-muted'
                }
              `}
              style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex bg-remembra-bg-secondary rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-remembra-bg-tertiary text-remembra-text-primary' : 'text-remembra-text-muted'}`}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-remembra-bg-tertiary text-remembra-text-primary' : 'text-remembra-text-muted'}`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode('masonry')}
            className={`p-1.5 rounded ${viewMode === 'masonry' ? 'bg-remembra-bg-tertiary text-remembra-text-primary' : 'text-remembra-text-muted'}`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      <div className={`
        ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : ''}
        ${viewMode === 'list' ? 'space-y-3' : ''}
        ${viewMode === 'masonry' ? 'columns-2 gap-3 space-y-3' : ''}
      `}>
        {visibleItems.map((item, index) => {
          const category = getCategoryById(item.category_id);
          const StatusIcon = getStatusIcon(item.status);
          
          if (viewMode === 'list') {
            return (
              <div 
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-remembra-bg-secondary/95 rounded-2xl p-4 border border-white/10 flex items-center gap-4 card-press cursor-pointer transition-colors hover:border-white/20"
                style={{ animationDelay: `${index * 18}ms` }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${category?.color}20` }}
                >
                  <span className="text-lg font-medium" style={{ color: category?.color }}>
                    {item.content_type === 'code' ? '</>' : item.content_type.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-remembra-text-primary truncate">
                    {item.title}
                  </h3>
                  <p className="text-xs text-remembra-text-muted mt-0.5 line-clamp-1">
                    {item.content.slice(0, 60)}...
                  </p>
                </div>
                
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  <StatusIcon size={12} className="inline mr-1" />
                  {item.status}
                </div>
                
                <button className="p-2 text-remembra-text-muted hover:text-remembra-text-primary">
                  <MoreVertical size={16} />
                </button>
              </div>
            );
          }
          
          return (
            <div 
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`
                bg-remembra-bg-secondary/95 rounded-2xl p-4 border border-white/10 card-press cursor-pointer transition-colors hover:border-white/20
                ${viewMode === 'masonry' ? 'break-inside-avoid' : ''}
              `}
              style={{ animationDelay: `${index * 18}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${category?.color}20` }}
                >
                  <span className="text-sm" style={{ color: category?.color }}>
                    {item.content_type === 'code' ? '</>' : item.content_type.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </div>
              </div>
              
              <h3 className="text-sm font-semibold text-remembra-text-primary mb-2 line-clamp-2">
                {item.title}
              </h3>
              
              <p className="text-xs text-remembra-text-muted line-clamp-3 mb-3">
                {item.content.slice(0, 100)}...
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-remembra-text-muted">
                  {getStageDayLabel(item.review_stage, item.status)}
                </span>
                
                {item.ai_summary && (
                  <Badge variant="secondary" className="text-[10px] bg-remembra-accent-primary/20 text-remembra-accent-primary border-0">
                    <Sparkles size={10} className="mr-1" />
                    AI
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMoreItems && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((prev) => prev + RENDER_INCREMENT)}
            className="bg-remembra-bg-secondary border-white/10 text-remembra-text-secondary hover:text-remembra-text-primary hover:bg-remembra-bg-tertiary"
          >
            Load More ({filteredItems.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {filteredItems.length > 0 && (
        <p className="mt-3 text-center text-xs text-remembra-text-muted">
          Showing {Math.min(visibleCount, filteredItems.length)} of {filteredItems.length} items
        </p>
      )}

      {filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 rounded-full bg-remembra-bg-secondary flex items-center justify-center mb-4">
            <Search size={32} className="text-remembra-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-remembra-text-primary mb-2">No items found</h3>
          <p className="text-sm text-remembra-text-muted text-center max-w-xs">
            Try adjusting your filters or search query
          </p>
        </div>
      )}

      {activeFilteredCount > 0 && (
        <div className="fixed safe-bottom-floating-nav left-4 right-4 sm:left-5 sm:right-5 z-40">
          <Button
            onClick={() => {
              const itemsToReview = filteredItems.filter(item => item.status === 'active');
              startReviewSession(itemsToReview);
            }}
            className="w-full gradient-primary py-6 rounded-2xl text-white font-semibold shadow-lg shadow-remembra-accent-primary/30"
          >
            <Brain size={20} className="mr-2" />
            Quick Review ({activeFilteredCount})
          </Button>
        </div>
      )}
    </div>
  );
}
