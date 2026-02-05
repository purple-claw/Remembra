import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-remembra-accent-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-remembra-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
