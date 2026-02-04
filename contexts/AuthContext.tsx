import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabaseStore } from '../lib/supabaseStore';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    syncWithCloud: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const store = useSupabaseStore();
    const [session, setSession] = useState<Session | null>(null);

    // Sync session state from Supabase directly for session object access if needed,
    // although store handles user state.
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Create a User object that matches what consumers expect, 
    // or cast store.user (UserProfile) to User if strictly needed.
    // However, store.user is our app profile. AuthContext.user was likely Supabase User.
    // Let's assume we return the current Supabase user from session.
    const user = session?.user ?? null;

    const signIn = async (email: string, password: string) => {
        return await store.signIn(email, password);
    };

    const signUp = async (email: string, password: string, username: string) => {
        return await store.signUp(email, password, username);
    };

    const signOut = async () => {
        await store.signOut();
    };

    const syncWithCloud = async () => {
        await store.syncWithSupabase();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading: store.isLoading,
                signIn,
                signUp,
                signOut,
                syncWithCloud,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

