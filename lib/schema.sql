-- Remembra Database Schema
-- Run this in Supabase SQL Editor

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL DEFAULT 'Learner',
  streak_count INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366F1',
  icon TEXT NOT NULL DEFAULT 'book-outline',
  order_index INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory Items table
CREATE TABLE IF NOT EXISTS memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  content_blocks JSONB DEFAULT '[]'::jsonb,
  content_type TEXT DEFAULT 'text',
  difficulty TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'learning',
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  review_stage INTEGER DEFAULT 0,
  review_history JSONB DEFAULT '[]'::jsonb,
  personal_notes TEXT DEFAULT '',
  ai_summary TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Streaks table
CREATE TABLE IF NOT EXISTS daily_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reviews_completed INTEGER DEFAULT 0,
  streak_broken BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, date)
);

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_streaks ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories: users can only access their own categories
CREATE POLICY "Users can view own categories" ON categories
  FOR ALL USING (auth.uid() = user_id);

-- Memory Items: users can only access their own items
CREATE POLICY "Users can view own items" ON memory_items
  FOR ALL USING (auth.uid() = user_id);

-- Daily Streaks: users can only access their own streaks
CREATE POLICY "Users can view own streaks" ON daily_streaks
  FOR ALL USING (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Learner'));
  
  -- Create default categories
  INSERT INTO public.categories (user_id, name, color, icon, order_index, is_default)
  VALUES 
    (NEW.id, 'General', '#6366F1', 'book-outline', 0, true),
    (NEW.id, 'Code', '#22C55E', 'code-slash-outline', 1, false),
    (NEW.id, 'Vocabulary', '#F59E0B', 'language-outline', 2, false);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_items_user ON memory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_items_category ON memory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_memory_items_next_review ON memory_items(next_review_date);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_user_date ON daily_streaks(user_id, date);
