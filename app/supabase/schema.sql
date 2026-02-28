-- =====================================================
-- Remembra: Single Supabase Schema (1-4-7 Retention)
-- =====================================================
-- Run this entire file once in Supabase SQL Editor.
-- This schema is designed for free-tier operation.
-- =====================================================

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Core tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  notification_preferences JSONB NOT NULL DEFAULT '{
    "daily_reminder": true,
    "reminder_time": "09:00",
    "streak_reminder": true,
    "achievement_notifications": true,
    "ai_insights": true
  }'::jsonb,
  streak_count INTEGER NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366F1',
  icon TEXT NOT NULL DEFAULT 'folder',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',

  -- 1-4-7 math fields
  cycle_started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  next_review_date DATE,
  review_stage INTEGER NOT NULL DEFAULT 0,

  -- Compatibility fields used by existing app contracts
  current_stage_index INTEGER NOT NULL DEFAULT 0,
  review_template TEXT NOT NULL DEFAULT '1-4-7',
  easiness_factor DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 1,
  repetition INTEGER NOT NULL DEFAULT 0,
  lapse_count INTEGER NOT NULL DEFAULT 0,

  last_reviewed_at TIMESTAMPTZ,
  review_history JSONB NOT NULL DEFAULT '[]'::jsonb,

  ai_summary TEXT,
  ai_flowchart TEXT,
  ai_bullet_points JSONB NOT NULL DEFAULT '[]'::jsonb,

  notes TEXT,
  is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,

  completed_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  archive_at DATE,
  delete_at DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_item_id UUID NOT NULL REFERENCES public.memory_items(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  completed_date TIMESTAMPTZ,
  performance TEXT,
  time_spent_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.streak_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reviews_completed INTEGER NOT NULL DEFAULT 0,
  streak_broken BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0,
  max_progress INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  device_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

-- 3) Backfill / compatibility columns for older databases
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS cycle_started_at DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS current_stage_index INTEGER DEFAULT 0;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS review_template TEXT DEFAULT '1-4-7';
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS easiness_factor DOUBLE PRECISION DEFAULT 2.5;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS interval INTEGER DEFAULT 1;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS repetition INTEGER DEFAULT 0;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS lapse_count INTEGER DEFAULT 0;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS ai_bullet_points JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS mastered_at TIMESTAMPTZ;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS archive_at DATE;
ALTER TABLE public.memory_items ADD COLUMN IF NOT EXISTS delete_at DATE;

ALTER TABLE public.device_push_tokens ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- 4) Constraints
ALTER TABLE public.memory_items DROP CONSTRAINT IF EXISTS memory_items_content_type_check;
ALTER TABLE public.memory_items ADD CONSTRAINT memory_items_content_type_check
  CHECK (content_type IN ('text', 'code', 'image', 'document', 'mixed'));

ALTER TABLE public.memory_items DROP CONSTRAINT IF EXISTS memory_items_difficulty_check;
ALTER TABLE public.memory_items ADD CONSTRAINT memory_items_difficulty_check
  CHECK (difficulty IN ('easy', 'medium', 'hard'));

ALTER TABLE public.memory_items DROP CONSTRAINT IF EXISTS memory_items_status_check;
ALTER TABLE public.memory_items ADD CONSTRAINT memory_items_status_check
  CHECK (status IN ('active', 'completed', 'archived', 'learning', 'reviewing', 'mastered'));

ALTER TABLE public.memory_items DROP CONSTRAINT IF EXISTS memory_items_review_stage_check;
ALTER TABLE public.memory_items ADD CONSTRAINT memory_items_review_stage_check
  CHECK (review_stage BETWEEN 0 AND 4);

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_performance_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_performance_check
  CHECK (performance IS NULL OR performance IN ('again', 'hard', 'good', 'easy', 'medium'));

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_order ON public.categories(user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_memory_items_user_status_due ON public.memory_items(user_id, status, next_review_date);
CREATE INDEX IF NOT EXISTS idx_memory_items_user_category ON public.memory_items(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_memory_items_bookmarked ON public.memory_items(user_id, is_bookmarked) WHERE is_bookmarked = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_user_schedule ON public.reviews(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_reviews_memory_item ON public.reviews(memory_item_id);
CREATE INDEX IF NOT EXISTS idx_streak_entries_user_date ON public.streak_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user ON public.device_push_tokens(user_id);

-- 6) Functions / triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      format(
        'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=%s&size=160&radius=50&backgroundType=gradientLinear&backgroundColor=ff8000,ff6b00,e81224',
        regexp_replace(
          lower(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), NEW.id::text)),
          '[^a-z0-9_-]+',
          '-',
          'g'
        )
      )
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Pure 1-4-7 scheduling guardrail (+ optional Day 30 reinforcement)
CREATE OR REPLACE FUNCTION public.enforce_memory_item_147()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  intervals INTEGER[] := ARRAY[1,4,7];
  stage INTEGER;
BEGIN
  NEW.status := CASE
    WHEN NEW.status IN ('learning', 'reviewing') THEN 'active'
    WHEN NEW.status = 'mastered' THEN 'completed'
    ELSE NEW.status
  END;

  NEW.cycle_started_at := COALESCE(NEW.cycle_started_at, CURRENT_DATE);

  stage := COALESCE(NEW.review_stage, 0);
  stage := GREATEST(0, LEAST(stage, 4));
  NEW.review_stage := stage;
  NEW.current_stage_index := stage;
  NEW.repetition := stage;
  NEW.review_template := '1-4-7';

  IF NEW.status = 'archived' THEN
    NEW.interval := 0;
    NEW.next_review_date := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' THEN
    NEW.interval := 0;
    NEW.next_review_date := NULL;
    NEW.mastered_at := COALESCE(NEW.mastered_at, NOW());
    NEW.completed_at := COALESCE(NEW.completed_at, NEW.mastered_at);
    NEW.delete_at := COALESCE(NEW.delete_at, (NEW.completed_at::date + 20));
    RETURN NEW;
  END IF;

  -- Active scheduling flow:
  -- stage 0 -> day 1, stage 1 -> day 4, stage 2 -> day 7,
  -- stage 3 -> awaiting day-30/complete choice (no due date),
  -- stage 4 -> day 30.
  NEW.status := 'active';

  IF stage <= 2 THEN
    NEW.interval := intervals[stage + 1];
    NEW.next_review_date := (NEW.cycle_started_at + make_interval(days => intervals[stage + 1]))::date;
    NEW.mastered_at := NULL;
    NEW.completed_at := NULL;
    NEW.delete_at := NULL;
  ELSIF stage = 3 THEN
    NEW.interval := 0;
    NEW.next_review_date := NULL;
    NEW.mastered_at := NULL;
    NEW.completed_at := NULL;
    NEW.delete_at := NULL;
  ELSE
    NEW.interval := 30;
    NEW.next_review_date := (NEW.cycle_started_at + make_interval(days => 30))::date;
    NEW.mastered_at := NULL;
    NEW.completed_at := NULL;
    NEW.delete_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_calendar_data(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  reviews_due BIGINT,
  reviews_completed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, interval '1 day')::date AS d
  ),
  due AS (
    SELECT next_review_date, COUNT(*)::bigint AS cnt
    FROM public.memory_items
    WHERE user_id = p_user_id
      AND status = 'active'
      AND next_review_date BETWEEN p_start_date AND p_end_date
    GROUP BY next_review_date
  ),
  done AS (
    SELECT scheduled_date, COUNT(*)::bigint AS cnt
    FROM public.reviews
    WHERE user_id = p_user_id
      AND scheduled_date BETWEEN p_start_date AND p_end_date
      AND completed_date IS NOT NULL
    GROUP BY scheduled_date
  )
  SELECT
    ds.d,
    COALESCE(due.cnt, 0),
    COALESCE(done.cnt, 0)
  FROM date_series ds
  LEFT JOIN due ON due.next_review_date = ds.d
  LEFT JOIN done ON done.scheduled_date = ds.d
  ORDER BY ds.d;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  streak_count INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_reviews BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM public.streak_entries
      WHERE user_id = p_user_id
        AND date = check_date
        AND reviews_completed > 0
    ) INTO has_reviews;

    IF has_reviews THEN
      streak_count := streak_count + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      IF check_date = CURRENT_DATE THEN
        check_date := check_date - INTERVAL '1 day';
      ELSE
        EXIT;
      END IF;
    END IF;

    EXIT WHEN streak_count > 365;
  END LOOP;

  UPDATE public.profiles
  SET streak_count = update_streak.streak_count,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN streak_count;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_memory_items_updated_at ON public.memory_items;
CREATE TRIGGER update_memory_items_updated_at
BEFORE UPDATE ON public.memory_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_device_push_tokens_updated_at ON public.device_push_tokens;
CREATE TRIGGER update_device_push_tokens_updated_at
BEFORE UPDATE ON public.device_push_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS enforce_memory_item_147_trigger ON public.memory_items;
CREATE TRIGGER enforce_memory_item_147_trigger
BEFORE INSERT OR UPDATE ON public.memory_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_memory_item_147();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7) RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "categories_select_own" ON public.categories;
CREATE POLICY "categories_select_own" ON public.categories
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_insert_own" ON public.categories;
CREATE POLICY "categories_insert_own" ON public.categories
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_update_own" ON public.categories;
CREATE POLICY "categories_update_own" ON public.categories
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_delete_own" ON public.categories;
CREATE POLICY "categories_delete_own" ON public.categories
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "memory_items_select_own" ON public.memory_items;
CREATE POLICY "memory_items_select_own" ON public.memory_items
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "memory_items_insert_own" ON public.memory_items;
CREATE POLICY "memory_items_insert_own" ON public.memory_items
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "memory_items_update_own" ON public.memory_items;
CREATE POLICY "memory_items_update_own" ON public.memory_items
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "memory_items_delete_own" ON public.memory_items;
CREATE POLICY "memory_items_delete_own" ON public.memory_items
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_select_own" ON public.reviews;
CREATE POLICY "reviews_select_own" ON public.reviews
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
CREATE POLICY "reviews_insert_own" ON public.reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
CREATE POLICY "reviews_update_own" ON public.reviews
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;
CREATE POLICY "reviews_delete_own" ON public.reviews
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "streak_entries_select_own" ON public.streak_entries;
CREATE POLICY "streak_entries_select_own" ON public.streak_entries
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "streak_entries_insert_own" ON public.streak_entries;
CREATE POLICY "streak_entries_insert_own" ON public.streak_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "streak_entries_update_own" ON public.streak_entries;
CREATE POLICY "streak_entries_update_own" ON public.streak_entries
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "achievements_select_own" ON public.achievements;
CREATE POLICY "achievements_select_own" ON public.achievements
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "achievements_insert_own" ON public.achievements;
CREATE POLICY "achievements_insert_own" ON public.achievements
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "achievements_update_own" ON public.achievements;
CREATE POLICY "achievements_update_own" ON public.achievements
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_push_tokens_select_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_select_own" ON public.device_push_tokens
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_push_tokens_insert_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_insert_own" ON public.device_push_tokens
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_push_tokens_update_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_update_own" ON public.device_push_tokens
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_push_tokens_delete_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_delete_own" ON public.device_push_tokens
FOR DELETE USING (auth.uid() = user_id);

-- 8) Storage for image attachments (public URLs for lightweight rendering)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'memory-images',
  'memory-images',
  TRUE,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "memory_images_upload_own" ON storage.objects;
CREATE POLICY "memory_images_upload_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'memory-images'
  AND auth.uid()::text = split_part(name, '/', 1)
);

DROP POLICY IF EXISTS "memory_images_read_public" ON storage.objects;
CREATE POLICY "memory_images_read_public" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'memory-images');

DROP POLICY IF EXISTS "memory_images_delete_own" ON storage.objects;
CREATE POLICY "memory_images_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'memory-images'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- 9) Basic grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- =====================================================
-- End of schema
-- =====================================================
