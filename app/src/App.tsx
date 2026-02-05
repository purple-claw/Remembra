import { useStore } from '@/store/useStore';
import { Dashboard } from '@/screens/Dashboard';
import { Calendar } from '@/screens/Calendar';
import { Review } from '@/screens/Review';
import { Library } from '@/screens/Library';
import { Create } from '@/screens/Create';
import { AIStudio } from '@/screens/AIStudio';
import { Stats } from '@/screens/Stats';
import { BottomNav } from '@/components/BottomNav';
import { Toaster } from '@/components/ui/sonner';

function App() {
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
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-remembra-bg-primary text-remembra-text-primary font-sans">
      <main className="pb-20">
        {renderScreen()}
      </main>
      
      {currentScreen !== 'review' && <BottomNav />}
      
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1A1A24',
            color: '#FAFAFA',
            border: '1px solid #22222E',
          },
        }}
      />
    </div>
  );
}

export default App;
