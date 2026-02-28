import { useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { AuthProvider } from '@/components/AuthProvider';
import { Dashboard } from '@/screens/Dashboard';
import { Calendar } from '@/screens/Calendar';
import { Review } from '@/screens/Review';
import { Library } from '@/screens/Library';
import { Create } from '@/screens/Create';
import { AIStudio } from '@/screens/AIStudio';
import { Stats } from '@/screens/Stats';
import { Profile } from '@/screens/Profile';
import { DatabaseTest } from '@/screens/DatabaseTest';
import { Auth } from '@/screens/Auth';
import { BottomNav } from '@/components/BottomNav';
import { Toaster } from '@/components/ui/sonner';
import { useScrollNav } from '@/hooks/useScrollNav';

function AppContent() {
  const currentScreen = useStore(state => state.currentScreen);
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const navVisible = useStore(state => state.navVisible);
  const setNavVisible = useStore(state => state.setNavVisible);
  const mainRef = useRef<HTMLElement | null>(null);
  const { onScroll: handleScroll } = useScrollNav();

  // If not authenticated, always show auth screen
  const activeScreen = isAuthenticated ? currentScreen : 'auth';

  // Reset nav visibility when switching screens
  useEffect(() => {
    setNavVisible(true);
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeScreen, setNavVisible]);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'calendar':
        return <Calendar />;
      case 'review':
        return <Review />;
      case 'library':
        return <Library />;
      case 'create':
        return <Create />;
      case 'ai-tools':
        return <AIStudio />;
      case 'stats':
        return <Stats />;
      case 'profile':
        return <Profile />;
      case 'test':
        return <DatabaseTest />;
      case 'auth':
        return <Auth />;
      default:
        return <Dashboard />;
    }
  };

  const showNav = isAuthenticated && activeScreen !== 'review' && activeScreen !== 'create' && activeScreen !== 'auth';

  return (
    <div className="app-shell bg-black text-remembra-text-primary font-sans flex flex-col overflow-hidden">
      <main 
        ref={mainRef}
        className="app-scroll flex-1 overflow-y-auto overflow-x-hidden overscroll-contain" 
        id="main-scroll"
        onScroll={handleScroll}
      >
        <div key={activeScreen} className="screen-shell animate-screen-enter">
          {renderScreen()}
        </div>
      </main>
      
      {showNav && <BottomNav visible={navVisible} />}
      
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#0a0a0a',
            color: '#FAFAFA',
            border: '1px solid rgba(255, 128, 0, 0.15)',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
