import { useStore } from '@/store/useStore';
import { 
  Flame, 
  ChevronRight, 
  Brain,
  Target,
  Layers,
  Plus,
  Sparkles
} from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { CalendarStrip } from '@/components/CalendarStrip';
import { CategoryCard } from '@/components/CategoryCard';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function Dashboard() {
  const { profile, categories, memoryItems, setScreen, startReviewSession, getItemsDueToday } = useStore();
  const [greeting, setGreeting] = useState('Good morning');
  
  // Get items due today from store (includes overdue items)
  const itemsDueToday = getItemsDueToday();
  
  // Calculate how many items were reviewed today from review_history
  const today = new Date().toISOString().split('T')[0];
  const completedToday = memoryItems.reduce((count, item) => {
    return count + (item.review_history || []).filter(r => r.date === today).length;
  }, 0);
  
  const dailyGoal = Math.max(itemsDueToday.length + completedToday, 5);
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
    <div className="bg-black lined-bg-subtle">
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setScreen('profile')} 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-remembra-accent-primary to-remembra-accent-secondary p-[2px]">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile?.username || 'User'}
                    className="w-full h-full rounded-full object-cover bg-remembra-bg-secondary"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-remembra-bg-secondary flex items-center justify-center">
                    <span className="text-lg font-bold text-remembra-accent-primary">
                      {(profile?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-remembra-success rounded-full flex items-center justify-center border-2 border-remembra-bg-primary">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            
            <div className="text-left">
              <p className="text-remembra-text-muted text-sm">{greeting}</p>
              <h1 className="text-lg font-semibold text-remembra-text-primary">{profile?.username || 'User'}</h1>
            </div>
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-remembra-bg-secondary rounded-full px-3 py-1.5">
              <Flame size={18} className="text-orange-500 animate-flame" />
              <span className="text-sm font-semibold text-orange-400">{profile?.streak_count || 0}</span>
            </div>
            
            <ProgressRing 
              percentage={progressPercentage} 
              size={48} 
              strokeWidth={4}
              color="#FF8000"
            />
          </div>
        </div>
      </header>

      <div className="px-5 space-y-6 pb-8">
        <section className="animate-slide-up">
          <div 
            className="relative overflow-hidden rounded-3xl p-6"
            style={{
              background: 'linear-gradient(135deg, #FF8000 0%, #FF4500 50%, #E81224 100%)',
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
                Keep your memory sharp with adaptive repetition
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
            {categories.length > 0 ? (
              categories.map((category, index) => (
                <CategoryCard 
                  key={category.id} 
                  category={category}
                  style={{ animationDelay: `${index * 50}ms` }}
                />
              ))
            ) : (
              <div 
                onClick={() => setScreen('create')}
                className="glass-card flex-shrink-0 w-36 h-24 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover-lift"
              >
                <Plus size={24} className="text-remembra-accent-primary" />
                <span className="text-xs text-remembra-text-muted">Add Category</span>
              </div>
            )}
            
            <button 
              onClick={() => setScreen('create')}
              className="flex-shrink-0 w-14 h-14 rounded-2xl glass-button flex items-center justify-center text-remembra-accent-primary hover:scale-105 transition-all"
            >
              <Plus size={24} />
            </button>
          </div>
        </section>

        <section className="animate-slide-up stagger-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={18} className="text-remembra-accent-primary" />
                <span className="text-sm text-remembra-text-secondary">Total Reviews</span>
              </div>
              <p className="text-2xl font-bold text-remembra-text-primary">{profile?.total_reviews || 0}</p>
            </div>
            
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers size={18} className="text-remembra-success" />
                <span className="text-sm text-remembra-text-secondary">Items Learned</span>
              </div>
              <p className="text-2xl font-bold text-remembra-text-primary">{memoryItems.filter(i => i.status === 'completed').length}</p>
            </div>
          </div>
        </section>

        {memoryItems.length > 0 && (
          <section className="animate-slide-up stagger-4">
            <h3 className="text-lg font-semibold text-remembra-text-primary mb-4">Recent Items</h3>
            <div className="space-y-3">
              {memoryItems.slice(0, 3).map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setScreen('library')}
                  className="flex items-center gap-4 p-4 glass-card rounded-2xl cursor-pointer hover-lift"
                >
                  <div className="w-10 h-10 rounded-xl bg-remembra-accent-primary/10 flex items-center justify-center">
                    <Brain size={18} className="text-remembra-accent-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-remembra-text-primary font-medium truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-remembra-text-muted mt-0.5">{item.status}</p>
                  </div>
                  <ChevronRight size={16} className="text-remembra-text-muted" />
                </div>
              ))}
            </div>
          </section>
        )}

        {memoryItems.length === 0 && (
          <section className="animate-slide-up stagger-4">
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-remembra-accent-primary/10 flex items-center justify-center">
                <Sparkles size={28} className="text-remembra-accent-primary" />
              </div>
              <h3 className="text-lg font-semibold text-remembra-text-primary mb-2">Get Started</h3>
              <p className="text-sm text-remembra-text-muted mb-4">
                Create your first memory item to begin learning
              </p>
              <Button
                onClick={() => setScreen('create')}
                className="gradient-primary text-white"
              >
                <Plus size={16} className="mr-2" />
                Create Item
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
