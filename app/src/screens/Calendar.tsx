import { useState } from 'react';
import { mockCalendarData, mockMemoryItems, mockCategories } from '@/data/mockData';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Grid3X3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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

  const getDayData = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return mockCalendarData.find(d => d.date === dateStr);
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
    const dateStr = date.toISOString().split('T')[0];
    return mockMemoryItems.filter(item => item.next_review_date === dateStr);
  };

  return (
    <div className="min-h-screen bg-remembra-bg-primary px-5 pt-6 pb-24">
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
              const hasReviews = dayData && dayData.reviews_due > 0;
              const isCompleted = dayData && dayData.reviews_completed >= dayData.reviews_due;
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
                      {Array.from({ length: Math.min(dayData.reviews_due, 3) }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCompleted 
                              ? selected ? 'bg-white' : 'bg-remembra-success'
                              : selected ? 'bg-white/70' : 'bg-remembra-accent-primary'
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
                  getItemsForDate(selectedDate).map(item => (
                    <div 
                      key={item.id}
                      className="p-4 bg-remembra-bg-secondary rounded-2xl border border-white/5 flex items-center gap-4"
                    >
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${mockCategories.find(c => c.id === item.category_id)?.color}20` }}
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
                    </div>
                  ))
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
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
              <div key={day} className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-remembra-text-primary">{day}</h3>
                  <span className="text-xs text-remembra-text-muted">
                    {index === 0 ? '3 reviews' : index === 2 ? '1 review' : '0 reviews'}
                  </span>
                </div>
                
                {index === 0 && (
                  <div className="space-y-2">
                    <div className="p-3 bg-remembra-bg-tertiary rounded-xl text-sm text-remembra-text-secondary">
                      React Hooks Deep Dive
                    </div>
                    <div className="p-3 bg-remembra-bg-tertiary rounded-xl text-sm text-remembra-text-secondary">
                      Spanish Verb Conjugations
                    </div>
                    <div className="p-3 bg-remembra-bg-tertiary rounded-xl text-sm text-remembra-text-secondary">
                      Calculus Derivatives
                    </div>
                  </div>
                )}
                
                {index === 2 && (
                  <div className="space-y-2">
                    <div className="p-3 bg-remembra-bg-tertiary rounded-xl text-sm text-remembra-text-secondary">
                      JavaScript Async/Await
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <div className="space-y-3">
            {mockMemoryItems
              .filter(item => item.status !== 'archived')
              .sort((a, b) => new Date(a.next_review_date).getTime() - new Date(b.next_review_date).getTime())
              .map(item => (
                <div 
                  key={item.id}
                  className="p-4 bg-remembra-bg-secondary rounded-2xl border border-white/5 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-remembra-text-primary truncate">{item.title}</h4>
                    <p className="text-xs text-remembra-text-muted mt-0.5">
                      Next review: {new Date(item.next_review_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${item.status === 'mastered' ? 'bg-remembra-success/20 text-remembra-success' : ''}
                    ${item.status === 'reviewing' ? 'bg-remembra-accent-primary/20 text-remembra-accent-primary' : ''}
                    ${item.status === 'learning' ? 'bg-remembra-warning/20 text-remembra-warning' : ''}
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
