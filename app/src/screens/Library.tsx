import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ReviewStatus, MemoryItem } from '@/types';
import { getItemScheduleLabel } from '@/domain/review147';
import {
  Search,
  Grid3X3,
  List,
  CheckCircle2,
  BookOpen,
  Archive,
  Loader2,
  Code2,
  FileText,
  Image as ImageIcon,
  Files,
  X,
  Clock3,
  ArrowUpDown,
  Play,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ItemDetail } from '@/components/ItemDetail';
import { saveSession } from '@/services/persistService';
import { toast } from 'sonner';
import { toFriendlyErrorMessage } from '@/lib/uiError';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'due' | 'updated' | 'title'>('due');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>(libraryCategoryFilter);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);
  const [persistingItemId, setPersistingItemId] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => (selectedItemId ? memoryItems.find((memoryItem) => memoryItem.id === selectedItemId) ?? null : null),
    [memoryItems, selectedItemId],
  );

  const handlePersistItem = async (event: React.MouseEvent, item: MemoryItem) => {
    event.stopPropagation();
    if (persistingItemId) return;

    setPersistingItemId(item.id);
    try {
      const result = await saveSession([item], categories, item.title || undefined);
      if (!result.success) {
        throw result.error;
      }
      toast.success('Saved to Persist');
    } catch (error) {
      toast.error(toFriendlyErrorMessage(error, 'Failed to save to Persist'));
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
    const base = memoryItems.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      if (!matchesStatus) return false;

      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      if (!matchesCategory) return false;

      if (searchTerms.length === 0) return true;

      const searchable = `${item.title}\n${item.content.slice(0, SEARCH_CONTENT_WINDOW)}`.toLowerCase();
      return searchTerms.every((term) => searchable.includes(term));
    });

    const byDueDate = (item: MemoryItem) => {
      if (!item.next_review_date) return Number.MAX_SAFE_INTEGER;
      return new Date(`${item.next_review_date}T00:00:00`).getTime();
    };

    const sorted = [...base].sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }

      if (sortBy === 'updated') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }

      const dueDiff = byDueDate(a) - byDueDate(b);
      if (dueDiff !== 0) return dueDiff;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return sorted;
  }, [memoryItems, searchTerms, selectedCategory, sortBy, statusFilter]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  );

  const filteredActiveItems = useMemo(
    () => filteredItems.filter((item) => item.status === 'active'),
    [filteredItems],
  );

  const hasMoreItems = visibleCount < filteredItems.length;

  const completionRate = useMemo(() => {
    if (memoryItems.length === 0) return 0;
    return Math.round((statusCounts.completed / memoryItems.length) * 100);
  }, [memoryItems.length, statusCounts.completed]);

  const hasActiveFilters = statusFilter !== 'all' || selectedCategory !== 'all' || normalizedSearch.length > 0;

  useEffect(() => {
    setVisibleCount(INITIAL_RENDER_COUNT);
  }, [statusFilter, selectedCategory, normalizedSearch, viewMode, sortBy]);

  useEffect(() => {
    setSelectedCategory(libraryCategoryFilter);
  }, [libraryCategoryFilter]);

  const getStatusIcon = (status: ReviewStatus) => {
    switch (status) {
      case 'active':
        return BookOpen;
      case 'completed':
        return CheckCircle2;
      case 'archived':
        return Archive;
    }
  };

  const getStatusColor = (status: ReviewStatus) => {
    switch (status) {
      case 'active':
        return 'bg-remembra-warning/15 text-remembra-warning border-remembra-warning/30';
      case 'completed':
        return 'bg-remembra-success/15 text-remembra-success border-remembra-success/30';
      case 'archived':
        return 'bg-remembra-text-muted/15 text-remembra-text-muted border-white/20';
    }
  };

  const getContentTypeIcon = (contentType: MemoryItem['content_type']) => {
    switch (contentType) {
      case 'code':
        return Code2;
      case 'image':
        return ImageIcon;
      case 'mixed':
        return Files;
      case 'document':
        return BookOpen;
      case 'text':
      default:
        return FileText;
    }
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-black flex flex-col animate-screen-enter">
      {selectedItem && <ItemDetail item={selectedItem} onClose={() => setSelectedItemId(null)} />}

      <header className="flex-shrink-0 px-4 sm:px-5 safe-top pb-4 bg-black border-b border-white/5 transition-smooth relative z-30">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="animate-slide-up">
            <h1 className="text-2xl font-bold text-remembra-text-primary mb-1">Library</h1>
            <p className="text-sm text-remembra-text-muted">Browse, filter, and review your memory vault.</p>
          </div>
          <Button
            onClick={() => startReviewSession(filteredActiveItems)}
            disabled={filteredActiveItems.length === 0}
            className="gradient-primary text-white transition-smooth hover:brightness-110 animate-slide-up tap-ripple press-glow"
          >
            <Play size={15} className="mr-1.5" />
            Review ({filteredActiveItems.length})
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-4 animate-slide-up" style={{ animationDelay: '40ms' }}>
          <div className="widget-surface rounded-xl px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-remembra-text-muted">Total</p>
            <p className="text-sm font-semibold text-remembra-text-primary">{memoryItems.length}</p>
          </div>
          <div className="widget-surface rounded-xl px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-remembra-text-muted">Active</p>
            <p className="text-sm font-semibold text-remembra-text-primary">{statusCounts.active}</p>
          </div>
          <div className="widget-surface rounded-xl px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-remembra-text-muted">Completion</p>
            <p className="text-sm font-semibold text-remembra-text-primary">{completionRate}%</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-remembra-text-muted" size={18} />
          <Input
            type="text"
            placeholder="Search by title or content..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-11 pr-4 py-3 bg-remembra-bg-secondary border-white/10 rounded-xl text-remembra-text-primary placeholder:text-remembra-text-muted focus:border-remembra-accent-primary/50"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md border border-white/10 bg-black/30 text-remembra-text-muted hover:text-remembra-text-primary transition-smooth tap-ripple"
            >
              <X size={14} className="mx-auto" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-shrink-0 px-4 sm:px-5 py-3 bg-black border-b border-white/5 transition-smooth animate-slide-up relative z-20" style={{ animationDelay: '70ms' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div className="flex w-full flex-wrap gap-2 flex-1 -mx-1 px-1 sm:flex-nowrap sm:overflow-x-auto scrollbar-hide">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setLibraryCategoryFilter('all');
              }}
              className={`
                widget-chip tap-ripple press-glow px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                ${selectedCategory === 'all'
                  ? 'bg-remembra-bg-tertiary text-remembra-text-primary border border-white/10'
                  : 'bg-remembra-bg-secondary text-remembra-text-muted'
                }
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setLibraryCategoryFilter(category.id);
                }}
                className={`
                  widget-chip tap-ripple press-glow px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
                  ${selectedCategory === category.id
                    ? 'text-white border border-white/20'
                    : 'text-remembra-text-muted'
                  }
                `}
                style={
                  selectedCategory === category.id
                    ? { backgroundColor: category.color, WebkitTapHighlightColor: 'transparent' }
                    : { WebkitTapHighlightColor: 'transparent' }
                }
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="flex bg-remembra-bg-secondary rounded-lg p-1 border border-white/5 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded tap-ripple transition-smooth ${viewMode === 'grid' ? 'bg-remembra-bg-tertiary text-remembra-text-primary' : 'text-remembra-text-muted'}`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              title="Grid view"
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded tap-ripple transition-smooth ${viewMode === 'list' ? 'bg-remembra-bg-tertiary text-remembra-text-primary' : 'text-remembra-text-muted'}`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full">
            <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-remembra-text-muted" />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as 'due' | 'updated' | 'title')}
              className="w-full appearance-none rounded-xl border border-white/10 bg-remembra-bg-secondary py-2.5 pl-9 pr-3 text-sm text-remembra-text-primary outline-none focus:border-remembra-accent-primary/50"
            >
              <option value="due">Sort: Due soon</option>
              <option value="updated">Sort: Recently updated</option>
              <option value="title">Sort: Title (A-Z)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              className="shrink-0 border-white/10 bg-remembra-bg-secondary text-remembra-text-secondary transition-smooth tap-ripple press-glow"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSelectedCategory('all');
                setLibraryCategoryFilter('all');
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <div
        data-nav-scroll="true"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 custom-scrollbar safe-bottom-nav fluid-scroll-zone smooth-scroll-content relative z-0"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-remembra-text-muted">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} matched
          </p>
          <p className="text-xs text-remembra-text-muted flex items-center gap-1.5">
            <Clock3 size={12} />
            {statusFilter === 'all' ? `${statusCounts.active} active` : `${filteredActiveItems.length} active in filter`}
          </p>
        </div>

        <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3' : 'space-y-3'}`}>
          {visibleItems.map((item, index) => {
            const category = getCategoryById(item.category_id);
            const StatusIcon = getStatusIcon(item.status);
            const TypeIcon = getContentTypeIcon(item.content_type);

            if (viewMode === 'list') {
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className="widget-surface inertia-card smooth-surface stagger-enter rounded-2xl p-4 flex items-center gap-4 cursor-pointer"
                  style={{ animationDelay: `${Math.min(index, 20) * 24}ms`, WebkitTapHighlightColor: 'transparent' }}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${getStatusColor(item.status)}`}>
                        <StatusIcon size={10} />
                        {item.status}
                      </div>
                      {category && (
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white/90"
                          style={{ backgroundColor: `${category.color}33` }}
                        >
                          {category.name}
                        </span>
                      )}
                      <span className="text-[10px] text-remembra-text-muted">{getItemScheduleLabel(item)}</span>
                    </div>
                  </div>

                  <button
                    onClick={(event) => handlePersistItem(event, item)}
                    disabled={persistingItemId === item.id}
                    title="Save to Persist"
                    className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center text-remembra-text-muted hover:text-remembra-accent-primary hover:border-remembra-accent-primary/30 transition-smooth tap-ripple press-glow shrink-0 disabled:opacity-50"
                  >
                    {persistingItemId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}
                  </button>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className="widget-surface inertia-card smooth-surface stagger-enter rounded-2xl p-4 cursor-pointer"
                style={{ animationDelay: `${Math.min(index, 20) * 24}ms`, WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10"
                    style={{ backgroundColor: `${category?.color}15` }}
                  >
                    <TypeIcon size={16} style={{ color: category?.color || '#ffffff' }} />
                  </div>

                  <div className={`px-2 py-1 rounded-lg text-[10px] font-medium border ${getStatusColor(item.status)}`}>
                    <div className="flex items-center gap-1">
                      <StatusIcon size={10} />
                      {item.status}
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-remembra-text-primary mb-2 line-clamp-2 leading-tight">{item.title}</h3>

                <div className="flex items-center justify-between text-[10px] gap-2">
                  <span className="text-remembra-text-muted font-medium truncate">{getItemScheduleLabel(item)}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(event) => handlePersistItem(event, item)}
                      disabled={persistingItemId === item.id}
                      title="Save to Persist"
                      className="w-6 h-6 rounded-md border border-white/10 bg-white/[0.04] flex items-center justify-center text-remembra-text-muted hover:text-remembra-accent-primary hover:border-remembra-accent-primary/30 transition-smooth tap-ripple press-glow disabled:opacity-50"
                    >
                      {persistingItemId === item.id ? <Loader2 size={10} className="animate-spin" /> : <Archive size={10} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {hasMoreItems && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((previous) => previous + RENDER_INCREMENT)}
              className="px-6 py-3 bg-remembra-bg-secondary border-white/10 text-remembra-text-secondary hover:text-remembra-text-primary hover:bg-remembra-bg-tertiary rounded-xl transition-smooth tap-ripple press-glow"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              Load More ({filteredItems.length - visibleCount} remaining)
            </Button>
          </div>
        )}

        {filteredItems.length > 0 && (
          <p className="mt-4 text-center text-xs text-remembra-text-muted">
            Showing {Math.min(visibleCount, filteredItems.length)} of {filteredItems.length} items
          </p>
        )}

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-24 h-24 rounded-full bg-remembra-bg-secondary flex items-center justify-center mb-6 border border-white/5">
              <Search size={40} className="text-remembra-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-remembra-text-primary mb-2">No items found</h3>
            <p className="text-sm text-remembra-text-muted text-center max-w-xs">
              Try adjusting your filters, search query, or reset controls.
            </p>
          </div>
        )}

        <div className="h-36" />
      </div>
    </div>
  );
}
