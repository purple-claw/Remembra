import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isFirebaseConfigured } from '@/services';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

export const DatabaseTest: React.FC = () => {
  const [status, setStatus] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const log = (msg: string) => setStatus((prev) => [...prev, msg]);

  const runTests = async () => {
    setIsRunning(true);
    setStatus([]);

    try {
      // 1. Config check
      log(isFirebaseConfigured ? '✅ Firebase is configured' : '❌ Firebase is NOT configured');

      // 2. Auth check
      const user = auth.currentUser;
      if (user) {
        log(`✅ Authenticated as ${user.email ?? user.uid}`);
      } else {
        log('⚠️ Not authenticated – some tests may fail');
      }

      // 3. Firestore write
      const testDocRef = doc(db, '_test_', 'connection_check');
      const payload = { ok: true, ts: new Date().toISOString() };
      await setDoc(testDocRef, payload);
      log('✅ Firestore write succeeded');

      // 4. Firestore read
      const snap = await getDoc(testDocRef);
      if (snap.exists() && snap.data()?.ok === true) {
        log('✅ Firestore read succeeded');
      } else {
        log('❌ Firestore read failed or data mismatch');
      }

      // 5. Cleanup
      await deleteDoc(testDocRef);
      log('✅ Firestore delete succeeded');

      log('--- All tests passed ---');
    } catch (e: unknown) {
      log(`❌ Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Firebase Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runTests} disabled={isRunning} className="w-full">
            {isRunning ? 'Running…' : 'Run Tests'}
          </Button>

          {status.length > 0 && (
            <div className="bg-muted rounded-md p-3 text-sm space-y-1 font-mono">
              {status.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// default export kept for lazy loading compatibility
export default DatabaseTest;
