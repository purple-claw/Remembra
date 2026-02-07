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

export function BottomNav({ visible = true }: { visible?: boolean }) {
  const { currentScreen, setScreen } = useStore();

  return (
    <nav 
      className={`flex-shrink-0 relative z-50 transition-all duration-300 ease-in-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="relative mx-auto max-w-lg px-4 pb-4 pt-2 bg-black/95 backdrop-blur-sm">
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
