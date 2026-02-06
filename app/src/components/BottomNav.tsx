import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { Screen } from '@/store/useStore';
import { Home, Calendar, BookOpen, PlusCircle, Sparkles, ChartLine } from 'lucide-react';

interface NavItem {
  id: Screen;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: Home, label: 'Home' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'library', icon: BookOpen, label: 'Library' },
  { id: 'create', icon: PlusCircle, label: 'Create' },
  { id: 'ai-tools', icon: Sparkles, label: 'AI' },
  { id: 'stats', icon: ChartLine, label: 'Stats' },
];

export function BottomNav() {
  const { currentScreen, setScreen } = useStore();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY;
      
      // Show nav when scrolling up or at top
      if (scrollDiff < -5 || currentScrollY < 50) {
        setIsVisible(true);
      }
      // Hide nav when scrolling down past threshold
      else if (scrollDiff > 5 && currentScrollY > 100) {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <nav 
      className={`
        fixed bottom-0 left-0 right-0 z-50
        transition-transform duration-300 ease-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" />
      
      <div className="relative mx-auto max-w-lg px-4 pb-6 pt-2">
        <div className="glass-strong rounded-2xl shadow-lg shadow-black/40 overflow-hidden">
          <div className="absolute inset-0 opacity-50" />
          <div className="relative flex items-center justify-around py-2.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={`
                    relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl
                    transition-all duration-300 ease-out
                    ${isActive 
                      ? 'text-remembra-accent-primary' 
                      : 'text-remembra-text-muted hover:text-remembra-text-secondary'
                    }
                  `}
                >
                  {isActive && (
                    <>
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-10 bg-remembra-accent-primary/20 rounded-full blur-lg" />
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-remembra-accent-primary rounded-full" />
                    </>
                  )}
                  
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={`relative z-10 transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
                  />
                  <span className={`text-[10px] font-medium relative z-10 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
