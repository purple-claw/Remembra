import { useState, useEffect } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
};

export function DatabaseTest() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    const results: TestResult[] = [];

    results.push({
      name: 'Firebase Configuration',
      status: isFirebaseConfigured ? 'success' : 'error',
      message: isFirebaseConfigured
        ? 'Environment variables loaded'
        : 'Missing one or more VITE_FIREBASE_* variables',
    });
    setTests([...results]);

    if (!isFirebaseConfigured) {
      setRunning(false);
      return;
    }

    try {
      const startedAt = Date.now();
      await getDocs(query(collection(db, 'profiles'), limit(1)));
      const elapsed = Date.now() - startedAt;
      results.push({
        name: 'Firestore Connection',
        status: 'success',
        message: `Connected in ${elapsed}ms`,
      });
    } catch (error) {
      results.push({
        name: 'Firestore Connection',
        status: 'error',
        message: getErrorMessage(error) || 'Connection failed',
      });
    }
    setTests([...results]);

    const user = auth.currentUser;
    if (!user) {
      results.push({
        name: 'User Collections',
        status: 'success',
        message: 'Skipped (no signed-in user)',
      });
      setTests([...results]);
    } else {
      const collectionsToCheck = ['categories', 'memory_items', 'reviews', 'streak_entries', 'achievements'];

      for (const collectionName of collectionsToCheck) {
        try {
          await getDocs(query(collection(db, 'users', user.uid, collectionName), limit(1)));
          results.push({
            name: `Collection: ${collectionName}`,
            status: 'success',
            message: 'Collection reachable',
          });
        } catch (error) {
          results.push({
            name: `Collection: ${collectionName}`,
            status: 'error',
            message: getErrorMessage(error) || 'Collection check failed',
          });
        }
        setTests([...results]);
      }
    }

    results.push({
      name: 'Auth Service',
      status: 'success',
      message: auth.currentUser ? 'Session active' : 'No active session (expected)',
    });
    setTests([...results]);

    setRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="bg-remembra-bg-primary screen-page px-4 sm:px-6 safe-top safe-bottom-nav sm:pb-8 animate-screen-enter">
      <div className="max-w-md mx-auto animate-slide-up">
        <h1 className="text-2xl font-bold text-remembra-text-primary mb-2">
          Database Connection Test
        </h1>
        <p className="text-remembra-text-secondary mb-6">
          Testing Firebase Auth + Firestore connectivity...
        </p>

        <div className="space-y-3 mb-6">
          {tests.map((test, idx) => (
            <div
              key={idx}
              className="widget-surface inertia-card smooth-surface stagger-enter flex items-start gap-3 bg-remembra-bg-secondary p-4 rounded-xl border border-white/5"
            >
              {test.status === 'pending' && (
                <Loader2 size={20} className="text-remembra-text-muted animate-spin mt-0.5" />
              )}
              {test.status === 'success' && (
                <CheckCircle size={20} className="text-green-500 mt-0.5" />
              )}
              {test.status === 'error' && (
                <XCircle size={20} className="text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-remembra-text-primary font-medium">{test.name}</p>
                {test.message && (
                  <p className="text-sm text-remembra-text-secondary mt-0.5">
                    {test.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={runTests}
            disabled={running}
            className="flex-1 tap-ripple press-glow"
          >
            {running ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Testing...
              </>
            ) : (
              'Run Tests Again'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="tap-ripple press-glow"
          >
            Back to App
          </Button>
        </div>

        <div className="widget-surface inertia-card smooth-surface stagger-enter mt-8 p-4 bg-remembra-bg-tertiary rounded-xl">
          <h2 className="text-sm font-semibold text-remembra-text-primary mb-2">
            Firebase Config
          </h2>
          <p className="text-xs text-remembra-text-muted font-mono break-all">
            Project ID: {import.meta.env.VITE_FIREBASE_PROJECT_ID || 'remembra-8e791 (fallback)'}
          </p>
          <p className="text-xs text-remembra-text-muted font-mono mt-1">
            API Key: {(import.meta.env.VITE_FIREBASE_API_KEY || '').length > 0
              ? '••••••' + String(import.meta.env.VITE_FIREBASE_API_KEY).slice(-8)
              : 'Using embedded fallback key'}
          </p>
        </div>
      </div>
    </div>
  );
}
