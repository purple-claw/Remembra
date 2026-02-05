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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-remembra-bg-primary via-remembra-bg-primary/95 to-transparent pointer-events-none" />
      
      <div className="relative mx-auto max-w-lg px-4 pb-6 pt-2">
        <div className="glass-strong rounded-2xl border border-white/5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={`
                    relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl
                    transition-all duration-200 ease-out
                    ${isActive 
                      ? 'text-remembra-accent-primary' 
                      : 'text-remembra-text-muted hover:text-remembra-text-secondary'
                    }
                  `}
                >
                  {isActive && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-remembra-accent-primary/20 rounded-full blur-md" />
                  )}
                  
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`relative z-10 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                  />
                  <span className={`text-[10px] font-medium relative z-10 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
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
