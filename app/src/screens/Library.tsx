import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ReviewStatus, MemoryItem } from '@/types';
import { getItemScheduleLabel } from '@/domain/review147';
import { 
  Search, 
  Grid3X3, 
  List, 
  Brain,
  CheckCircle2,
  BookOpen,
  Archive,
  Sparkles,
  Loader2,
  Code2,
  FileText,
  Image as ImageIcon,
  Files,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ItemDetail } from '@/components/ItemDetail';
import { saveSession } from '@/services/persistService';
import { toast } from 'sonner';

const INITIAL_RENDER_COUNT = 36;
const RENDER_INCREMENT = 24;
const SEARCH_CONTENT_WINDOW = 2800;

export function Library() {
  const memoryItems = useStore((state) => state.memoryItems);
  const categories = useStore((state) => state.categories);
  const getCategoryById = useStore((state) => state.getCategoryById);
  const startReviewSession = useStore((state) => state.startReviewSession);
  const libraryCategoryFilter = useStore((state) => state.libraryCategoryFilter);
  const setLibraryCategoryFilter = useStore((state) => state.setLibraryCategoryFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'masonry'>('grid');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>(libraryCategoryFilter);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);
  const [persistingItemId, setPersistingItemId] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => (selectedItemId ? memoryItems.find((memoryItem) => memoryItem.id === selectedItemId) ?? null : null),
    [memoryItems, selectedItemId],
  );

  const handlePersistItem = async (e: React.MouseEvent, item: MemoryItem) => {
    e.stopPropagation();
    if (persistingItemId) return;
    setPersistingItemId(item.id);
    try {
      await saveSession([item], categories, item.title || undefined);
      toast.success('Saved to Persist');
    } catch {
      toast.error('Failed to save to Persist');
    } finally {
      setPersistingItemId(null);
    }
  };

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

  useEffect(() => {
    setSelectedCategory(libraryCategoryFilter);
  }, [libraryCategoryFilter]);

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

  const getContentTypeIcon = (contentType: MemoryItem['content_type']) => {
    switch (contentType) {
      case 'code': return Code2;
      case 'image': return ImageIcon;
      case 'mixed': return Files;
      case 'document': return BookOpen;
      case 'text':
      default:
        return FileText;
    }
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-black flex flex-col">
      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetail item={selectedItem} onClose={() => setSelectedItemId(null)} />
      )}
      
      {/* Fixed Header */}
      <header className="flex-shrink-0 px-4 sm:px-5 safe-top pb-4 bg-black border-b border-white/5">
        <h1 className="text-2xl font-bold text-remembra-text-primary mb-1">Library</h1>
        <p className="text-sm text-remembra-text-muted mb-4">Store 4 Reviews</p>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-remembra-text-muted" size={18} />
          <Input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-4 py-3 bg-remembra-bg-secondary border-white/10 rounded-xl text-remembra-text-primary placeholder:text-remembra-text-muted focus:border-remembra-accent-primary/50"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          />
        </div>
      </header>

      {/* Filters - Horizontally scrollable */}
      <div className="flex-shrink-0 px-4 sm:px-5 py-3 bg-black border-b border-white/5">
        {/* Status tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 -mx-1 px-1">
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all active:scale-95
                ${statusFilter === tab.value 
                  ? 'bg-remembra-accent-primary text-white shadow-lg' 
                  : 'bg-remembra-bg-secondary text-remembra-text-secondary border border-white/5'
                }
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {tab.label}
              <span className={`
                px-2 py-0.5 rounded-lg text-xs font-semibold
                ${statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-remembra-bg-tertiary text-remembra-text-muted'}
              `}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Category filters & view mode */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 -mx-1 px-1">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setLibraryCategoryFilter('all');
              }}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                ${selectedCategory === 'all' 
                  ? 'bg-remembra-bg-tertiary text-remembra-text-primary border border-white/10' 
                  : 'bg-remembra-bg-secondary text-remembra-text-muted'
                }
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setLibraryCategoryFilter(cat.id);
                }}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                  ${selectedCategory === cat.id 
                    ? 'text-white border border-white/20' 
                    : 'bg-remembra-bg-secondary text-remembra-text-muted'
                  }
                `}
                style={selectedCategory === cat.id ? { backgroundColor: cat.color, WebkitTapHighlightColor: 'transparent' } : { WebkitTapHighlightColor: 'transparent' }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex bg-remembra-bg-secondary rounded-lg p-1 border border-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-remembra-bg-tertiary text-remembra-text-primary' : 'text-remembra-text-muted'}`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-remembra-bg-tertiary text-remembra-text-primary' : 'text-remembra-text-muted'}`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        data-nav-scroll="true"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 custom-scrollbar safe-bottom-nav"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        {/* Items Grid/List */}
        <div className={`
          ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}
        `}>
          {visibleItems.map((item, index) => {
            const category = getCategoryById(item.category_id);
            const StatusIcon = getStatusIcon(item.status);
            const TypeIcon = getContentTypeIcon(item.content_type);
            
            if (viewMode === 'list') {
              return (
                <div 
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className="glass-card rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer"
                  style={{ animationDelay: `${index * 18}ms`, WebkitTapHighlightColor: 'transparent' }}
                >
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10"
                    style={{ backgroundColor: `${category?.color}15` }}
                  >
                    <TypeIcon size={22} style={{ color: category?.color || '#ffffff' }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-remembra-text-primary truncate mb-1">
                      {item.title}
                    </h3>
                    {/* <p className="text-xs text-remembra-text-muted line-clamp-1 mb-2">
                      {item.content.slice(0, 80)}...
                    </p> */}
                    <div className="flex items-center gap-2">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${getStatusColor(item.status)}`}>
                        <StatusIcon size={10} />
                        {item.status}
                      </div>
                      <span className="text-[10px] text-remembra-text-muted">
                        {getItemScheduleLabel(item)}
                      </span>
                    </div>
                  </div>

                  {/* Archive to Persist */}
                  <button
                    onClick={(e) => handlePersistItem(e, item)}
                    disabled={persistingItemId === item.id}
                    title="Save to Persist"
                    className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center text-remembra-text-muted hover:text-remembra-accent-primary hover:border-remembra-accent-primary/30 transition-colors shrink-0 disabled:opacity-50"
                  >
                    {persistingItemId === item.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Archive size={13} />}
                  </button>
                </div>
              );
            }
            
            return (
              <div 
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className="glass-card rounded-2xl p-4 active:scale-[0.95] transition-transform cursor-pointer"
                style={{ animationDelay: `${index * 18}ms`, WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10"
                    style={{ backgroundColor: `${category?.color}15` }}
                  >
                    <TypeIcon size={16} style={{ color: category?.color || '#ffffff' }} />
                  </div>
                  
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </div>
                </div>
                
                <h3 className="text-sm font-semibold text-remembra-text-primary mb-2 line-clamp-2 leading-tight">
                  {item.title}
                </h3>
                
                {/* <p className="text-xs text-remembra-text-muted line-clamp-2 mb-3 leading-relaxed">
                  {item.content.slice(0, 90)}...
                </p> */}
                
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-remembra-text-muted font-medium">
                    {getItemScheduleLabel(item)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {item.ai_summary && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-remembra-accent-primary/10 text-remembra-accent-primary border-0">
                        <Sparkles size={9} className="mr-0.5" />
                        AI
                      </Badge>
                    )}
                    {/* Archive to Persist */}
                    <button
                      onClick={(e) => handlePersistItem(e, item)}
                      disabled={persistingItemId === item.id}
                      title="Save to Persist"
                      className="w-6 h-6 rounded-md border border-white/10 bg-white/[0.04] flex items-center justify-center text-remembra-text-muted hover:text-remembra-accent-primary hover:border-remembra-accent-primary/30 transition-colors disabled:opacity-50"
                    >
                      {persistingItemId === item.id
                        ? <Loader2 size={10} className="animate-spin" />
                        : <Archive size={10} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}  
        </div>

        {/* Load More Button */}
        {hasMoreItems && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((prev) => prev + RENDER_INCREMENT)}
              className="px-6 py-3 bg-remembra-bg-secondary border-white/10 text-remembra-text-secondary hover:text-remembra-text-primary hover:bg-remembra-bg-tertiary rounded-xl active:scale-95 transition-transform"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              Load More ({filteredItems.length - visibleCount} remaining)
            </Button>
          </div>
        )}

        {/* Item count */}
        {filteredItems.length > 0 && (
          <p className="mt-4 text-center text-xs text-remembra-text-muted">
            Showing {Math.min(visibleCount, filteredItems.length)} of {filteredItems.length} items
          </p>
        )}

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-24 h-24 rounded-full bg-remembra-bg-secondary flex items-center justify-center mb-6 border border-white/5">
              <Search size={40} className="text-remembra-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-remembra-text-primary mb-2">No items found</h3>
            <p className="text-sm text-remembra-text-muted text-center max-w-xs">
              Try adjusting your filters or search query
            </p>
          </div>
        )}

        {/* Bottom padding for floating button and fixed nav */}
        <div className="h-36" />
      </div>

      {/* Floating Quick Review Button */}
      {activeFilteredCount > 0 && (
        <div 
          className="fixed left-4 right-4 sm:left-5 sm:right-5 z-40"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
        >
          <Button
            onClick={() => {
              const itemsToReview = filteredItems.filter(item => item.status === 'active');
              startReviewSession(itemsToReview);
            }}
            className="w-full py-4 rounded-2xl text-white font-semibold shadow-2xl active:scale-[0.98] transition-transform text-base"
            style={{ 
              background: 'linear-gradient(135deg, #FF8000 0%, #FF6B00 100%)',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <Brain size={22} className="mr-2" />
             Review ({activeFilteredCount})
          </Button>
        </div>
      )}
    </div>
  );
}
