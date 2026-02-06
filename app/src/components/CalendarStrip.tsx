import { useState } from 'react';
import { useStore } from '@/store/useStore';

interface DayData {
  date: string;
  dayName: string;
  dayNum: number;
  reviewsDue: number;
  reviewsCompleted: number;
  isToday: boolean;
}

export function CalendarStrip() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { memoryItems } = useStore();
  
  // Generate 14 days around today
  const generateDays = (): DayData[] => {
    const days: DayData[] = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = -3; i <= 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Count items scheduled for this date from actual store data
      const itemsForDate = memoryItems.filter(item => 
        item.next_review_date === dateStr && item.status !== 'archived'
      );
      
      days.push({
        date: dateStr,
        dayName: dayNames[date.getDay()],
        dayNum: date.getDate(),
        reviewsDue: itemsForDate.length,
        reviewsCompleted: 0,
        isToday: i === 0,
      });
    }
    
    return days;
  };

  const days = generateDays();

  const getDayStatus = (day: DayData): 'completed' | 'due' | 'empty' | 'future' => {
    if (day.reviewsCompleted >= day.reviewsDue && day.reviewsDue > 0) return 'completed';
    if (day.reviewsDue > 0) {
      if (day.isToday || new Date(day.date) < new Date()) return 'due';
      return 'future';
    }
    return 'empty';
  };

  return (
    <div className="-mx-5">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 pb-2">
        {days.map((day, index) => {
          const status = getDayStatus(day);
          const isSelected = selectedDate === day.date;
          
          return (
            <button
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`
                flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl
                transition-all duration-200 min-w-[64px]
                ${isSelected 
                  ? 'bg-remembra-accent-primary text-white' 
                  : 'bg-remembra-bg-secondary text-remembra-text-secondary hover:bg-remembra-bg-tertiary'
                }
              `}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Day name */}
              <span className={`text-xs font-medium ${isSelected ? 'text-white/80' : ''}`}>
                {day.dayName}
              </span>
              
              {/* Day number */}
              <span className={`
                text-lg font-semibold w-8 h-8 flex items-center justify-center rounded-full
                ${day.isToday && !isSelected ? 'bg-remembra-accent-primary/20 text-remembra-accent-primary' : ''}
              `}>
                {day.dayNum}
              </span>
              
              {/* Status indicator */}
              <div className="flex items-center justify-center h-2">
                {status === 'completed' && (
                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-remembra-success'}`} />
                )}
                {status === 'due' && (
                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white/70' : 'bg-remembra-accent-primary'}`} />
                )}
                {status === 'future' && (
                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white/50' : 'bg-remembra-text-muted/50'}`} />
                )}
                {status === 'empty' && (
                  <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/30' : 'bg-remembra-text-muted/30'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
