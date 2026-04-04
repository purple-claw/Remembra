import { useStore } from '@/store/useStore';
import type { Screen } from '@/store/useStore';
import { Archive, BookOpen, Calendar, ChartLine, Home, PlusCircle, User } from 'lucide-react';

interface NavItem {
  id: Screen;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: Home, label: 'Home' },
  { id: 'calendar', icon: Calendar, label: 'Cal' },
  { id: 'library', icon: BookOpen, label: 'Library' },
  { id: 'create', icon: PlusCircle, label: 'Create' },
  { id: 'persist', icon: Archive, label: 'Archive' },
  { id: 'stats', icon: ChartLine, label: 'Stats' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export function BottomNav({ visible = true }: { visible?: boolean }) {
  const { currentScreen, setScreen } = useStore();

  return (
    <nav 
      className={`fixed bottom-0 inset-x-0 z-50 transition-all duration-300 ease-in-out ${
        visible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="relative mx-auto max-w-lg px-3 sm:px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 bg-black/95 backdrop-blur-sm">
        <div className="glass-strong rounded-2xl shadow-lg shadow-black/40 overflow-hidden">
          <div className="absolute inset-0 opacity-50" />
          <div className="relative flex items-center justify-between py-2 px-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  className={`
                    relative flex flex-col items-center gap-1 px-1 py-2 rounded-xl flex-1
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
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={`relative z-10 transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
                  />
                  <span className={`text-[10px] font-medium relative z-10 transition-opacity duration-200 hidden sm:block ${isActive ? 'opacity-100' : 'opacity-60'}`}>
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
