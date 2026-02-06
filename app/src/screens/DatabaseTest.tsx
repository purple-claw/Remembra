import { useState, useEffect } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export function DatabaseTest() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    const results: TestResult[] = [];

    // Test 1: Check Supabase configuration
    results.push({
      name: 'Supabase Configuration',
      status: isSupabaseConfigured ? 'success' : 'error',
      message: isSupabaseConfigured 
        ? 'Environment variables loaded' 
        : 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY',
    });
    setTests([...results]);

    if (!isSupabaseConfigured) {
      setRunning(false);
      return;
    }

    const supabase = getSupabase();

    // Test 2: Basic connection (query non-existent table catches connection issues)
    try {
      const start = Date.now();
      // We'll query the profiles table - it will return empty due to RLS but proves connection works
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const elapsed = Date.now() - start;
      
      if (error && !error.message.includes('permission') && !error.message.includes('RLS')) {
        throw error;
      }
      results.push({
        name: 'Database Connection',
        status: 'success',
        message: `Connected in ${elapsed}ms`,
      });
    } catch (err: any) {
      results.push({
        name: 'Database Connection',
        status: 'error',
        message: err.message || 'Connection failed',
      });
    }
    setTests([...results]);

    // Test 3: Check tables exist
    const tablesToCheck = ['profiles', 'categories', 'memory_items', 'reviews', 'streak_entries', 'achievements'];
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase.from(table).select('*').limit(0);
        if (error && error.code === '42P01') {
          // Table doesn't exist
          results.push({
            name: `Table: ${table}`,
            status: 'error',
            message: 'Table does not exist',
          });
        } else if (error && error.message.includes('permission')) {
          // RLS blocking but table exists
          results.push({
            name: `Table: ${table}`,
            status: 'success',
            message: 'Table exists (RLS active)',
          });
        } else if (error) {
          results.push({
            name: `Table: ${table}`,
            status: 'error',
            message: error.message,
          });
        } else {
          results.push({
            name: `Table: ${table}`,
            status: 'success',
            message: 'Table exists and accessible',
          });
        }
      } catch (err: any) {
        results.push({
          name: `Table: ${table}`,
          status: 'error',
          message: err.message,
        });
      }
      setTests([...results]);
    }

    // Test 4: Auth service check
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      results.push({
        name: 'Auth Service',
        status: 'success',
        message: data.session ? 'Session active' : 'No active session (expected)',
      });
    } catch (err: any) {
      results.push({
        name: 'Auth Service',
        status: 'error',
        message: err.message,
      });
    }
    setTests([...results]);

    setRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-remembra-bg-primary p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-remembra-text-primary mb-2">
          Database Connection Test
        </h1>
        <p className="text-remembra-text-secondary mb-6">
          Testing Supabase connection and schema...
        </p>

        <div className="space-y-3 mb-6">
          {tests.map((test, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 bg-remembra-bg-secondary p-4 rounded-xl border border-white/5"
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
            className="flex-1"
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
          >
            Back to App
          </Button>
        </div>

        <div className="mt-8 p-4 bg-remembra-bg-tertiary rounded-xl">
          <h2 className="text-sm font-semibold text-remembra-text-primary mb-2">
            Supabase Config
          </h2>
          <p className="text-xs text-remembra-text-muted font-mono break-all">
            URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}
          </p>
          <p className="text-xs text-remembra-text-muted font-mono mt-1">
            Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '••••••' + import.meta.env.VITE_SUPABASE_ANON_KEY.slice(-8) : 'Not set'}
          </p>
        </div>
      </div>
    </div>
  );
}
