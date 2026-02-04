-- Remembra Database Schema
-- Spaced Repetition Memory App with 1-4-7 Algorithm

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  daily_goal INT DEFAULT 10,
  streak_count INT DEFAULT 0,
  total_reviews INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📚',
  color TEXT DEFAULT '#6366F1',
  description TEXT,
  item_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory items table
CREATE TABLE memory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- Rich content: text, images, code, flowcharts
  content_type TEXT DEFAULT 'text', -- text, markdown, code, flashcard, flowchart
  
  -- Spaced repetition fields
  stage INT DEFAULT 0, -- 0: new, 1: day1, 4: day4, 7: day7, 30: mastered
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  review_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  difficulty REAL DEFAULT 0.5, -- 0-1 scale
  
  -- AI features
  has_quiz BOOLEAN DEFAULT FALSE,
  has_summary BOOLEAN DEFAULT FALSE,
  has_flashcards BOOLEAN DEFAULT FALSE,
  has_flowchart BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  tags TEXT[],
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table (history of all review attempts)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES memory_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  success BOOLEAN NOT NULL,
  duration_seconds INT, -- How long the review took
  difficulty_rating INT CHECK (difficulty_rating BETWEEN 1 AND 5),
  stage_at_review INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI generated content table
CREATE TABLE ai_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES memory_items(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL, -- 'summary', 'quiz', 'flashcards', 'flowchart'
  content JSONB NOT NULL,
  provider TEXT, -- 'groq', 'cohere'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT TRUE,
  daily_reminder_time TIME DEFAULT '09:00:00',
  smart_scheduling BOOLEAN DEFAULT TRUE,
  review_reminders BOOLEAN DEFAULT TRUE,
  streak_reminders BOOLEAN DEFAULT TRUE,
  achievement_notifications BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_memory_items_user_id ON memory_items(user_id);
CREATE INDEX idx_memory_items_next_review ON memory_items(next_review_date) WHERE NOT is_archived;
CREATE INDEX idx_memory_items_category ON memory_items(category_id);
CREATE INDEX idx_reviews_item_id ON reviews(item_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Categories policies
CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Memory items policies
CREATE POLICY "Users can view own items" ON memory_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own items" ON memory_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON memory_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own items" ON memory_items FOR DELETE USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Users can view own reviews" ON reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI content policies
CREATE POLICY "Users can view AI content for own items" ON ai_content FOR SELECT 
  USING (EXISTS (SELECT 1 FROM memory_items WHERE memory_items.id = ai_content.item_id AND memory_items.user_id = auth.uid()));
CREATE POLICY "Users can create AI content for own items" ON ai_content FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM memory_items WHERE memory_items.id = ai_content.item_id AND memory_items.user_id = auth.uid()));

-- Notification preferences policies
CREATE POLICY "Users can view own notification preferences" ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notification preferences" ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification preferences" ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_items_updated_at BEFORE UPDATE ON memory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile (or update if exists)
  -- Using explicit schema and bypassing RLS with SECURITY DEFINER
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = NOW();
  
  -- Insert notification preferences (or ignore if exists)
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists before creating (for re-running script)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
