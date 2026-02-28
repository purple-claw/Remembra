import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Brain } from 'lucide-react';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initialize = useStore(state => state.initialize);
  const isLoading = useStore(state => state.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-remembra-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-remembra-accent-primary to-remembra-accent-secondary flex items-center justify-center shadow-lg shadow-remembra-accent-primary/20">
            <Brain size={32} className="text-white" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-3 border-remembra-accent-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-remembra-text-muted text-sm">Loading your memory...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
