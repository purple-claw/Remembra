import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { reviewService } from '@/services';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Grid3X3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Check,
  Code2,
  FileText,
  Image as ImageIcon,
  Files,
  BookOpen,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { MemoryItem, Performance, Review } from '@/types';
import { getItemScheduleLabel } from '@/domain/review147';

interface DayData {
  date: string;
  dueCount: number;
  completedCount: number;
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const toMonthRange = (date: Date): { start: string; end: string } => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toDateStr(start), end: toDateStr(end) };
};

function buildReviewMap(reviews: Review[]): Record<string, Review[]> {
  const map: Record<string, Review[]> = {};
  for (const review of reviews) {
    if (!map[review.scheduled_date]) {
      map[review.scheduled_date] = [];
    }
    map[review.scheduled_date].push(review);
  }
  return map;
}

export function Calendar() {
  const { memoryItems, categories, markReviewComplete } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null);
  const [reviewMapByDate, setReviewMapByDate] = useState<Record<string, Review[]>>({});
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const todayStr = toDateStr(new Date());
  const memoryItemMap = useMemo(
    () => new Map(memoryItems.map((item) => [item.id, item])),
    [memoryItems],
  );

  const refreshReviewLogs = useCallback(async () => {
    const { start, end } = toMonthRange(currentDate);
    setIsLoadingLogs(true);
    try {
      const reviews = await reviewService.getReviewsInRange(start, end);
      setReviewMapByDate(buildReviewMap(reviews));
    } catch (error) {
      console.warn('Failed to load calendar review logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [currentDate]);

  useEffect(() => {
    refreshReviewLogs();
  }, [refreshReviewLogs]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return next;
    });
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getDueItemsForDateStr = (dateStr: string): MemoryItem[] => {
    return memoryItems
      .filter((item) => {
        if (item.status !== 'active') return false;
        if (!item.next_review_date) return false;
        if (item.next_review_date === dateStr) return true;
        if (dateStr === todayStr && item.next_review_date < todayStr) return true; // overdue bucket on today
        return false;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  const getCompletedReviewsForDateStr = (dateStr: string): Review[] =>
    (reviewMapByDate[dateStr] || []).filter((r) => !!r.completed_date);

  const getDayData = (day: number): DayData => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dueCount = getDueItemsForDateStr(dateStr).length;
    const completedCount = getCompletedReviewsForDateStr(dateStr).length;
    return { date: dateStr, dueCount, completedCount };
  };

  const isToday = (day: number) => {
    const now = new Date();
    return day === now.getDate()
      && currentDate.getMonth() === now.getMonth()
      && currentDate.getFullYear() === now.getFullYear();
  };

  const isSelected = (day: number) => {
    return day === selectedDate.getDate()
      && currentDate.getMonth() === selectedDate.getMonth()
      && currentDate.getFullYear() === selectedDate.getFullYear();
  };

  const selectedDateStr = toDateStr(selectedDate);
  const selectedDueItems = getDueItemsForDateStr(selectedDateStr);
  const selectedCompletedLogs = getCompletedReviewsForDateStr(selectedDateStr);
  const completedItemIds = new Set(selectedCompletedLogs.map((r) => r.memory_item_id));

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

  const getReviewStatus = (item: MemoryItem, dateStr: string): 'completed' | 'overdue' | 'pending' | 'scheduled' => {
    if (completedItemIds.has(item.id) && dateStr === selectedDateStr) return 'completed';
    if (!item.next_review_date) return 'scheduled';
    if (item.next_review_date < todayStr) return 'overdue';
    if (item.next_review_date === todayStr || dateStr === todayStr) return 'pending';
    return 'scheduled';
  };

  const handleQuickReview = async (item: MemoryItem, performance: Performance) => {
    try {
      await markReviewComplete(item.id, selectedDateStr, performance);
      toast.success(performance === 'good' ? 'Marked done' : 'Marked revise again');
      setReviewingItemId(null);
      await refreshReviewLogs();
    } catch (error) {
      console.error('Quick review failed:', error);
      toast.error('Review failed. Please try again.');
    }
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* Fixed Header */}
      <header className="flex-shrink-0 px-4 sm:px-5 safe-top pb-4 bg-black border-b border-white/5">
        <h1 className="text-2xl font-bold text-remembra-text-primary mb-1">Calendar</h1>
        <p className="text-sm text-remembra-text-muted">Dynamic schedule with due + completed review tracking</p>
      </header>

      {/* Scrollable Content */}
      <div
        data-nav-scroll="true"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 custom-scrollbar safe-bottom-nav"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } as React.CSSProperties}
      >
      <Tabs defaultValue="month" className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-remembra-bg-secondary mb-6">
          <TabsTrigger value="month" className="data-[state=active]:bg-remembra-accent-primary data-[state=active]:text-white">
            <Grid3X3 size={16} className="mr-2" />
            Month
          </TabsTrigger>
          <TabsTrigger value="week" className="data-[state=active]:bg-remembra-accent-primary data-[state=active]:text-white">
            <CalendarIcon size={16} className="mr-2" />
            Week
          </TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-remembra-accent-primary data-[state=active]:text-white">
            <List size={16} className="mr-2" />
            List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="mt-0">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigateMonth('prev')}
              className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary hover:text-remembra-text-primary transition-smooth"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-remembra-text-primary">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateMonth('next')}
              className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary hover:text-remembra-text-primary transition-smooth"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-remembra-text-muted py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const dayData = getDayData(day);
              const hasDue = dayData.dueCount > 0;
              const hasCompleted = dayData.completedCount > 0;
              const today = isToday(day);
              const selected = isSelected(day);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center relative
                    transition-smooth
                    ${selected
                      ? 'bg-remembra-accent-primary text-white'
                      : today
                        ? 'bg-remembra-accent-primary/20 text-remembra-accent-primary'
                        : 'bg-remembra-bg-secondary text-remembra-text-primary hover:bg-remembra-bg-tertiary'}
                  `}
                >
                  <span className={`text-sm font-medium ${selected ? 'text-white' : ''}`}>{day}</span>

                  <div className="mt-1 flex items-center gap-1">
                    {hasDue && (
                      <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/90' : 'bg-remembra-accent-primary'}`} />
                    )}
                    {hasCompleted && (
                      <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/55' : 'bg-remembra-success'}`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 text-[11px] text-remembra-text-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-remembra-accent-primary" />
              Due reviews
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-remembra-success" />
              Completed reviews
            </div>
            {isLoadingLogs && <span className="text-remembra-accent-primary">Updating logs...</span>}
          </div>

          <div className="mt-6 animate-slide-up space-y-4">
            <h3 className="text-sm font-medium text-remembra-text-secondary">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>

            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-remembra-text-primary">Due Reviews</p>
                <p className="text-xs text-remembra-text-muted">{selectedDueItems.length}</p>
              </div>

              {selectedDueItems.length === 0 ? (
                <p className="text-xs text-remembra-text-muted py-2">No due reviews on this day.</p>
              ) : (
                <div className="space-y-3">
                  {selectedDueItems.map((item) => {
                    const status = getReviewStatus(item, selectedDateStr);
                    const isReviewing = reviewingItemId === item.id;
                    const TypeIcon = getContentTypeIcon(item.content_type);

                    return (
                      <div key={item.id} className="rounded-xl border border-white/5 bg-remembra-bg-tertiary/40 overflow-hidden">
                        <div className="p-3 flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${categories.find((c) => c.id === item.category_id)?.color || '#FF8000'}20` }}
                          >
                            <TypeIcon size={15} color={categories.find((c) => c.id === item.category_id)?.color || '#FF8000'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-remembra-text-primary truncate">{item.title}</p>
                            <p className="text-xs text-remembra-text-muted">
                              {getItemScheduleLabel(item)} • {item.difficulty}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {status === 'completed' && (
                              <div className="px-2 py-1 rounded-lg bg-remembra-success/20 text-remembra-success text-xs font-medium flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                Done
                              </div>
                            )}
                            {status === 'overdue' && (
                              <div className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium flex items-center gap-1">
                                <AlertCircle size={12} />
                                Overdue
                              </div>
                            )}
                            {status === 'pending' && !isReviewing && (
                              <button
                                onClick={() => setReviewingItemId(item.id)}
                                className="px-3 py-1.5 rounded-lg gradient-primary text-white text-xs font-medium flex items-center gap-1"
                              >
                                <Play size={12} />
                                Review
                              </button>
                            )}
                            {status === 'scheduled' && (
                              <div className="px-2 py-1 rounded-lg bg-remembra-text-muted/20 text-remembra-text-muted text-xs font-medium flex items-center gap-1">
                                <Clock size={12} />
                                Scheduled
                              </div>
                            )}
                          </div>
                        </div>

                        {isReviewing && status !== 'completed' && (
                          <div className="px-3 pb-3 pt-2 border-t border-white/5 bg-remembra-bg-tertiary/60">
                            <p className="text-xs text-remembra-text-muted mb-2">Mark this review</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleQuickReview(item, 'again')}
                                className="bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                              >
                                Revise Again
                              </button>
                              <button
                                onClick={() => handleQuickReview(item, 'good')}
                                className="bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                              >
                                Done
                              </button>
                            </div>
                            <button
                              onClick={() => setReviewingItemId(null)}
                              className="mt-2 text-xs text-remembra-text-muted hover:text-white w-full text-center py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-remembra-text-primary">Completed Reviews</p>
                <p className="text-xs text-remembra-text-muted">{selectedCompletedLogs.length}</p>
              </div>

              {selectedCompletedLogs.length === 0 ? (
                <p className="text-xs text-remembra-text-muted py-2">No completed reviews logged on this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedCompletedLogs.map((review) => {
                    const item = memoryItemMap.get(review.memory_item_id);
                    return (
                      <div key={review.id} className="p-3 rounded-xl bg-remembra-bg-tertiary border border-white/5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-remembra-text-primary truncate">{item?.title || 'Unknown item'}</p>
                          <p className="text-xs text-remembra-text-muted">
                            {item ? getItemScheduleLabel(item) : 'Stage unavailable'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-1 rounded-md bg-remembra-success/20 text-remembra-success flex items-center gap-1">
                            <Check size={12} />
                            {review.performance || 'done'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="week" className="mt-0">
          <div className="space-y-3">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const dateStr = toDateStr(d);
              const dueItems = getDueItemsForDateStr(dateStr);
              const completed = getCompletedReviewsForDateStr(dateStr).length;
              const isTodayWeek = dateStr === todayStr;

              return (
              <div key={dateStr} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-remembra-text-primary">
                      {weekDays[d.getDay()]}{isTodayWeek ? ' (Today)' : ''}
                    </h3>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-remembra-accent-primary">{dueItems.length} due</span>
                      <span className="text-remembra-success">{completed} done</span>
                    </div>
                  </div>
                  {dueItems.length > 0 ? (
                    <div className="space-y-2">
                      {dueItems.map((item) => (
                        <div key={item.id} className="p-2.5 bg-remembra-bg-tertiary rounded-xl flex items-center justify-between gap-2">
                          <span className="text-sm text-remembra-text-secondary truncate">{item.title}</span>
                          <span className="text-[10px] text-remembra-text-muted">{getItemScheduleLabel(item)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-remembra-text-muted py-1">No due reviews.</p>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <div className="space-y-3">
            {memoryItems
              .filter((item) => item.status !== 'archived')
              .sort((a, b) => {
                const ad = a.next_review_date ? new Date(`${a.next_review_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
                const bd = b.next_review_date ? new Date(`${b.next_review_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
                if (ad !== bd) return ad - bd;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              })
              .map((item) => (
                <div key={item.id} className="p-4 glass-card rounded-2xl flex items-center justify-between gap-3 smooth-surface dynamic-container">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-remembra-text-primary truncate">{item.title}</p>
                    <p className="text-xs text-remembra-text-muted mt-0.5">
                      {item.next_review_date
                        ? `Next review: ${new Date(`${item.next_review_date}T00:00:00`).toLocaleDateString()}`
                        : 'No pending date'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-remembra-accent-primary">{getItemScheduleLabel(item)}</p>
                    <p className="text-[10px] text-remembra-text-muted">{item.status}</p>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
