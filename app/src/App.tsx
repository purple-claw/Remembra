import { useStore } from '@/store/useStore';
import { AuthProvider } from '@/components/AuthProvider';
import { Dashboard } from '@/screens/Dashboard';
import { Calendar } from '@/screens/Calendar';
import { Review } from '@/screens/Review';
import { Library } from '@/screens/Library';
import { Create } from '@/screens/Create';
import { AIStudio } from '@/screens/AIStudio';
import { Stats } from '@/screens/Stats';
import { DatabaseTest } from '@/screens/DatabaseTest';
import { Auth } from '@/screens/Auth';
import { BottomNav } from '@/components/BottomNav';
import { Toaster } from '@/components/ui/sonner';

function AppContent() {
  const currentScreen = useStore(state => state.currentScreen);

  const renderScreen = () => {
    switch (currentScreen) {
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
      case 'test':
        return <DatabaseTest />;
      case 'auth':
        return <Auth />;
      default:
        return <Dashboard />;
    }
  };

  const showNav = currentScreen !== 'review' && currentScreen !== 'create' && currentScreen !== 'auth';

  return (
    <div className="h-screen bg-black text-remembra-text-primary font-sans flex flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain" id="main-scroll">
        {renderScreen()}
      </main>
      
      {showNav && <BottomNav />}
      
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
