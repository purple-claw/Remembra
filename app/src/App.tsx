import { useState, useRef, useCallback, useEffect } from 'react';
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

function AppContent() {
  const currentScreen = useStore(state => state.currentScreen);
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollThreshold = 8;

  // If not authenticated, always show auth screen
  const activeScreen = isAuthenticated ? currentScreen : 'auth';

  // Reset nav visibility when switching screens
  useEffect(() => {
    setNavVisible(true);
    lastScrollY.current = 0;
  }, [activeScreen]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const currentY = el.scrollTop;
    const delta = currentY - lastScrollY.current;
    
    if (Math.abs(delta) > scrollThreshold) {
      if (delta > 0 && currentY > 60) {
        // Scrolling down — hide nav
        setNavVisible(false);
      } else {
        // Scrolling up — show nav
        setNavVisible(true);
      }
    }
    lastScrollY.current = currentY;
  }, []);

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
    <div className="h-screen bg-black text-remembra-text-primary font-sans flex flex-col overflow-hidden">
      <main 
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain" 
        id="main-scroll"
        onScroll={handleScroll}
      >
        {renderScreen()}
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
