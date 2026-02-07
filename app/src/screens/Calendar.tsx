import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Grid3X3, CheckCircle2, Clock, AlertCircle, Play } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { Performance, MemoryItem } from '@/types';

export function Calendar() {
  const { memoryItems, categories, markReviewComplete } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [reviewingItem, setReviewingItem] = useState<MemoryItem | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
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

  const todayStr = new Date().toISOString().split('T')[0];

  // Get items for a specific date - overdue items appear on today
  const getItemsForDateStr = (dateStr: string) => {
    return memoryItems.filter(item => {
      if (item.status === 'archived') return false;
      if (item.next_review_date === dateStr) return true;
      // Show overdue items on today
      if (dateStr === todayStr && item.next_review_date < todayStr) return true;
      return false;
    });
  };

  const getDayData = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const itemsForDay = getItemsForDateStr(dateStr);
    if (itemsForDay.length === 0) return null;
    return {
      date: dateStr,
      reviewCount: itemsForDay.length,
      items: itemsForDay.map(i => ({ id: i.id, title: i.title }))
    };
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getItemsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return getItemsForDateStr(dateStr);
  };

  const getReviewStatus = (item: MemoryItem, dateStr: string) => {
    const hasReviewed = item.review_history.some(r => r.date === dateStr);
    
    if (hasReviewed) return 'completed';
    if (item.next_review_date < todayStr) return 'overdue';
    if (item.next_review_date === todayStr || dateStr === todayStr) return 'pending';
    return 'scheduled';
  };

  const handleQuickReview = async (item: MemoryItem, performance: Performance) => {
    if (!selectedDate) return;
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    
    await markReviewComplete(item.id, dateStr, performance);
    toast.success(`Review marked as ${performance}!`);
    setReviewingItem(null);
  };

  return (
    <div className="bg-black lined-bg-subtle px-5 pt-6 pb-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-remembra-text-primary mb-1">Calendar</h1>
        <p className="text-remembra-text-muted">Plan your learning schedule</p>
      </header>

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
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => navigateMonth('prev')}
              className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary hover:text-remembra-text-primary transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-remembra-text-primary">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button 
              onClick={() => navigateMonth('next')}
              className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary hover:text-remembra-text-primary transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
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
              const hasReviews = dayData && dayData.reviewCount > 0;
              const today = isToday(day);
              const selected = isSelected(day);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center relative
                    transition-all duration-200
                    ${selected 
                      ? 'bg-remembra-accent-primary text-white' 
                      : today
                        ? 'bg-remembra-accent-primary/20 text-remembra-accent-primary'
                        : 'bg-remembra-bg-secondary text-remembra-text-primary hover:bg-remembra-bg-tertiary'
                    }
                  `}
                >
                  <span className={`text-sm font-medium ${selected ? 'text-white' : ''}`}>
                    {day}
                  </span>
                  
                  {hasReviews && (
                    <div className="flex gap-0.5 mt-1">
                      {Array.from({ length: Math.min(dayData.reviewCount, 3) }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            selected ? 'bg-white/70' : 'bg-remembra-accent-primary'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="mt-6 animate-slide-up">
              <h3 className="text-sm font-medium text-remembra-text-secondary mb-3">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              
              <div className="space-y-3">
                {getItemsForDate(selectedDate).length > 0 ? (
                  getItemsForDate(selectedDate).map(item => {
                    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                    const status = getReviewStatus(item, dateStr);
                    const isReviewing = reviewingItem?.id === item.id;
                    
                    return (
                      <div 
                        key={item.id}
                        className="glass-card rounded-2xl overflow-hidden"
                      >
                        <div className="p-4 flex items-center gap-4">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${categories.find(c => c.id === item.category_id)?.color || '#FF8000'}20` }}
                          >
                            <span className="text-lg">
                              {item.content_type === 'code' ? '</>' : item.content_type === 'text' ? 'T' : '?'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-remembra-text-primary truncate">{item.title}</h4>
                            <p className="text-xs text-remembra-text-muted">
                              Stage {item.review_stage + 1} • {item.difficulty}
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
                                onClick={() => setReviewingItem(item)}
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
                        
                        {/* Quick review actions */}
                        {isReviewing && status !== 'completed' && (
                          <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-remembra-bg-tertiary/50">
                            <p className="text-xs text-remembra-text-muted mb-3">How well did you recall this?</p>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { label: 'Again', value: 'again' as Performance, color: 'bg-red-500' },
                                { label: 'Hard', value: 'hard' as Performance, color: 'bg-orange-500' },
                                { label: 'Good', value: 'medium' as Performance, color: 'bg-blue-500' },
                                { label: 'Easy', value: 'easy' as Performance, color: 'bg-green-500' },
                              ].map(btn => (
                                <button
                                  key={btn.value}
                                  onClick={() => handleQuickReview(item, btn.value)}
                                  className={`${btn.color} text-white px-3 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setReviewingItem(null)}
                              className="mt-2 text-xs text-remembra-text-muted hover:text-white w-full text-center py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-remembra-bg-secondary rounded-2xl border border-white/5">
                    <p className="text-remembra-text-muted text-sm">No reviews scheduled</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-0">
          <div className="space-y-4">
            {(() => {
              // Generate the upcoming 7 days starting from today (with weekday names)
              const today = new Date();
              const weekDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const weekDays = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                return d;
              });

              return weekDays.map((day) => {
                const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                const dayItems = getItemsForDateStr(dateStr);
                const dayName = weekDayNames[day.getDay()];
                const isToday = dateStr === todayStr;

                return (
                  <div key={dateStr} className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-remembra-text-primary">
                        {dayName}{isToday ? ' (Today)' : ''}
                      </h3>
                      <span className="text-xs text-remembra-text-muted">
                        {dayItems.length} review{dayItems.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {dayItems.length > 0 ? (
                      <div className="space-y-2">
                        {dayItems.map(item => {
                          const status = getReviewStatus(item, dateStr);
                          return (
                            <div key={item.id} className="p-3 bg-remembra-bg-tertiary rounded-xl flex items-center justify-between gap-2">
                              <span className="text-sm text-remembra-text-secondary truncate flex-1">{item.title}</span>
                              {status === 'completed' && (
                                <CheckCircle2 size={14} className="text-remembra-success flex-shrink-0" />
                              )}
                              {status === 'overdue' && (
                                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                              )}
                              {status === 'pending' && (
                                <Clock size={14} className="text-remembra-accent-primary flex-shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-remembra-text-muted py-1">No reviews scheduled</p>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <div className="space-y-3">
            {memoryItems
              .filter(item => item.status !== 'archived')
              .sort((a, b) => new Date(a.next_review_date).getTime() - new Date(b.next_review_date).getTime())
              .map(item => (
                <div 
                  key={item.id}
                  className="p-4 glass-card rounded-2xl flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-remembra-text-primary truncate">{item.title}</h4>
                    <p className="text-xs text-remembra-text-muted mt-0.5">
                      Next review: {new Date(item.next_review_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${item.status === 'completed' ? 'bg-remembra-success/20 text-remembra-success' : ''}
                    ${item.status === 'active' ? 'bg-remembra-accent-primary/20 text-remembra-accent-primary' : ''}
                    ${item.status === 'archived' ? 'bg-remembra-warning/20 text-remembra-warning' : ''}
                  `}>
                    {item.status}
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
