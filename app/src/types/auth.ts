export interface AppUser {
  id: string;
  email: string | null;
  user_metadata: {
    username?: string;
    avatar_url?: string;
  };
  email_confirmed_at: string | null;
}

export interface AppSession {
  user: AppUser;
}

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED';
