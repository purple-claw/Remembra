import { useStore } from '@/store/useStore';
import { mockCategories, getItemsDueToday } from '@/data/mockData';
import { 
  Flame, 
  ChevronRight, 
  Brain,
  Target,
  Layers,
  Code
} from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { CalendarStrip } from '@/components/CalendarStrip';
import { CategoryCard } from '@/components/CategoryCard';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function Dashboard() {
  const { profile, setScreen, startReviewSession } = useStore();
  const [greeting, setGreeting] = useState('Good morning');
  const itemsDueToday = getItemsDueToday();
  const completedToday = 0;
  const dailyGoal = Math.max(itemsDueToday.length, 5);
  const progressPercentage = Math.round((completedToday / dailyGoal) * 100);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleStartReview = () => {
    if (itemsDueToday.length > 0) {
      startReviewSession();
    }
  };

  return (
    <div className="min-h-screen bg-remembra-bg-primary">
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-remembra-accent-primary to-remembra-accent-secondary p-[2px]">
                <img 
                  src={profile.avatar_url} 
                  alt={profile.username}
                  className="w-full h-full rounded-full object-cover bg-remembra-bg-secondary"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-remembra-success rounded-full flex items-center justify-center border-2 border-remembra-bg-primary">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            
            <div>
              <p className="text-remembra-text-muted text-sm">{greeting}</p>
              <h1 className="text-lg font-semibold text-remembra-text-primary">{profile.username}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-remembra-bg-secondary rounded-full px-3 py-1.5">
              <Flame size={18} className="text-orange-500 animate-flame" />
              <span className="text-sm font-semibold text-orange-400">{profile.streak_count}</span>
            </div>
            
            <ProgressRing 
              percentage={progressPercentage} 
              size={48} 
              strokeWidth={4}
              color="#6366F1"
            />
          </div>
        </div>
      </header>

      <div className="px-5 space-y-6 pb-8">
        <section className="animate-slide-up">
          <div 
            className="relative overflow-hidden rounded-3xl p-6"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white/70 text-sm mb-1">Today's Focus</p>
                  <h2 className="text-2xl font-bold text-white">
                    {itemsDueToday.length} reviews due
                  </h2>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Brain size={24} className="text-white" />
                </div>
              </div>
              
              <p className="text-white/80 text-sm mb-5">
                Keep your memory sharp with the 1-4-7 system
              </p>
              
              <Button
                onClick={handleStartReview}
                disabled={itemsDueToday.length === 0}
                className="w-full bg-white text-remembra-accent-primary hover:bg-white/90 font-semibold py-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {itemsDueToday.length > 0 ? (
                  <>
                    Start Review Session
                    <ChevronRight size={18} className="ml-1" />
                  </>
                ) : (
                  'All caught up!'
                )}
              </Button>
            </div>
          </div>
        </section>

        <section className="animate-slide-up stagger-1">
          <CalendarStrip />
        </section>

        <section className="animate-slide-up stagger-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-remembra-text-primary">Your Categories</h3>
            <button 
              onClick={() => setScreen('library')}
              className="text-sm text-remembra-accent-primary hover:text-remembra-accent-secondary transition-colors"
            >
              See all
            </button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-5 px-5">
            {mockCategories.map((category, index) => (
              <CategoryCard 
                key={category.id} 
                category={category}
                style={{ animationDelay: `${index * 50}ms` }}
              />
            ))}
            
            <button className="flex-shrink-0 w-14 h-14 rounded-2xl bg-remembra-bg-secondary border border-dashed border-remembra-text-muted/30 flex items-center justify-center text-remembra-text-muted hover:border-remembra-accent-primary/50 hover:text-remembra-accent-primary transition-colors">
              <span className="text-2xl">+</span>
            </button>
          </div>
        </section>

        <section className="animate-slide-up stagger-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Target size={18} className="text-remembra-accent-primary" />
                <span className="text-sm text-remembra-text-secondary">Total Reviews</span>
              </div>
              <p className="text-2xl font-bold text-remembra-text-primary">{profile.total_reviews}</p>
            </div>
            
            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Layers size={18} className="text-remembra-success" />
                <span className="text-sm text-remembra-text-secondary">Items Learned</span>
              </div>
              <p className="text-2xl font-bold text-remembra-text-primary">48</p>
            </div>
          </div>
        </section>

        <section className="animate-slide-up stagger-4">
          <h3 className="text-lg font-semibold text-remembra-text-primary mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { action: 'Reviewed', item: 'React Hooks Deep Dive', time: '2 hours ago', icon: Brain },
              { action: 'Created', item: 'TypeScript Generics', time: '5 hours ago', icon: Code },
              { action: 'Mastered', item: 'French Common Phrases', time: 'Yesterday', icon: Target },
            ].map((activity, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-4 bg-remembra-bg-secondary rounded-2xl border border-white/5"
              >
                <div className="w-10 h-10 rounded-xl bg-remembra-accent-primary/10 flex items-center justify-center">
                  <activity.icon size={18} className="text-remembra-accent-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-remembra-text-secondary">
                    {activity.action} <span className="text-remembra-text-primary font-medium">{activity.item}</span>
                  </p>
                  <p className="text-xs text-remembra-text-muted mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-24 right-5 z-40">
        <button 
          onClick={() => setScreen('create')}
          className="w-14 h-14 rounded-full gradient-primary shadow-lg shadow-remembra-accent-primary/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform duration-200"
        >
          <span className="text-2xl font-light">+</span>
        </button>
      </div>
    </div>
  );
}
