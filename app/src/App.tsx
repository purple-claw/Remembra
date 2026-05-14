import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { AuthProvider } from '@/components/AuthProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Dashboard } from '@/screens/Dashboard';
import { Calendar } from '@/screens/Calendar';
import { Review } from '@/screens/Review';
import { Library } from '@/screens/Library';
import { Create } from '@/screens/Create';
import { Stats } from '@/screens/Stats';
import { Profile } from '@/screens/Profile';
import { DatabaseTest } from '@/screens/DatabaseTest';
import { Persist } from '@/screens/Persist';
import { Auth } from '@/screens/Auth';
import { BottomNav } from '@/components/BottomNav';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function AppContent() {
  const currentScreen = useStore(state => state.currentScreen);
  const goBack = useStore(state => state.goBack);
  const canGoBack = useStore(state => state.canGoBack);
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const [navVisible, setNavVisible] = useState(true);
  const pendingDecisionItem = useStore(state => state.pendingDecisionItem);
  const resolveDay7Decision = useStore(state => state.resolveDay7Decision);
  const mainRef = useRef<HTMLElement | null>(null);
  const lastScrollY = useRef(0);
  const activeScrollElementRef = useRef<HTMLElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const skipNextHistoryPushRef = useRef(false);
  const browserHistoryReadyRef = useRef(false);
  const backPressTimestampRef = useRef(0);

  // If not authenticated, always show auth screen
  const activeScreen = isAuthenticated ? currentScreen : 'auth';

  const showNav = isAuthenticated && activeScreen !== 'review' && activeScreen !== 'create' && activeScreen !== 'auth';

  // Reset nav visibility and scroll state when switching screens
  useEffect(() => {
    setNavVisible(true);
    lastScrollY.current = 0;
    activeScrollElementRef.current = null;
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeScreen]);

  const handleCapturedScroll = useCallback((event: Event) => {
    if (!showNav) return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    // Only respond to elements explicitly marked as the primary scroll pane.
    // Ignoring all other overflow-y:auto elements (inner code blocks, modals,
    // horizontal carousels, etc.) prevents them from confusing the nav sensor.
    if (target.dataset.navScroll !== 'true') return;

    const verticalRange = target.scrollHeight - target.clientHeight;
    if (verticalRange <= 24) return;

    const currentY = Math.max(0, Math.min(target.scrollTop, verticalRange));

    // Track which element is being scrolled. When the element changes (e.g.
    // after a screen transition), sync the baseline but still process this
    // event so the very first scroll gesture is not silently dropped.
    const isNewElement = activeScrollElementRef.current !== target;
    if (isNewElement) {
      activeScrollElementRef.current = target;
      lastScrollY.current = currentY;
      // Still allow the show-at-top logic below to run on the first event.
      if (currentY > 16) return;
    }

    const delta = currentY - lastScrollY.current;
    if (!isNewElement && Math.abs(delta) < 8) return;

    if (currentY <= 16) {
      setNavVisible(true);
    } else if (delta > 0) {
      setNavVisible(false);
    } else {
      setNavVisible(true);
    }

    lastScrollY.current = currentY;
  }, [showNav]);

  useEffect(() => {
    const onScrollCapture = (event: Event) => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }

      scrollRafRef.current = requestAnimationFrame(() => {
        handleCapturedScroll(event);
      });
    };

    document.addEventListener('scroll', onScrollCapture, { capture: true, passive: true });
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
      document.removeEventListener('scroll', onScrollCapture, true);
    };
  }, [handleCapturedScroll]);

  // Sync browser back button with in-app navigation stack.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (typeof window === 'undefined') return;

    const state = { remembraScreen: activeScreen, t: Date.now() };
    window.history.replaceState(state, '');
    window.history.pushState(state, '');
    skipNextHistoryPushRef.current = true;
    browserHistoryReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!browserHistoryReadyRef.current) return;
    if (skipNextHistoryPushRef.current) {
      skipNextHistoryPushRef.current = false;
      return;
    }

    window.history.pushState({ remembraScreen: activeScreen, t: Date.now() }, '');
  }, [activeScreen]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    const handlePopState = () => {
      const handled = goBack('dashboard');
      if (handled) {
        skipNextHistoryPushRef.current = true;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [goBack]);

  // Handle Android hardware back button using app navigation stack first.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | null = null;

    const setupBackButton = async () => {
      const { App: CapacitorApp } = await import('@capacitor/app');
      const subscription = await CapacitorApp.addListener('backButton', () => {
        if (goBack('dashboard')) return;
        if (canGoBack()) return;

        const now = Date.now();
        if (now - backPressTimestampRef.current < 1400) {
          CapacitorApp.exitApp();
          return;
        }

        backPressTimestampRef.current = now;
        toast('Press back again to exit');
      });

      removeListener = () => subscription.remove();
    };

    setupBackButton().catch((error) => {
      console.error('Failed to set Android back handler:', error);
    });

    return () => {
      removeListener?.();
    };
  }, [goBack, canGoBack]);

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
      case 'stats':
        return <Stats />;
      case 'profile':
        return <Profile />;
      case 'test':
        return <DatabaseTest />;
      case 'persist':
        return <Persist />;
      case 'auth':
        return <Auth />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-shell bg-black text-remembra-text-primary font-sans overflow-hidden">
      <main 
        ref={mainRef}
        className="app-scroll h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-contain" 
        id="main-scroll"
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

      <AlertDialog open={!!pendingDecisionItem} onOpenChange={() => {}}>
        <AlertDialogContent className="liquid-glass w-[min(92vw,30rem)] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-remembra-text-primary">Day 7 complete</AlertDialogTitle>
            <AlertDialogDescription className="text-remembra-text-muted">
              {pendingDecisionItem?.title ? `"${pendingDecisionItem.title}" finished Day 7. Choose next step.` : 'This topic finished Day 7. Choose next step.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => resolveDay7Decision('complete')}
              className="bg-remembra-bg-tertiary border-white/10 text-remembra-text-primary hover:bg-white/10"
            >
              Complete Topic
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resolveDay7Decision('schedule')}
              className="bg-remembra-accent-primary hover:bg-remembra-accent-secondary text-white"
            >
              Add Day 30 Review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary name="AppRoot">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
