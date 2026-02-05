-- =====================================================
-- REMEMBRA DATABASE SCHEMA FOR SUPABASE
-- =====================================================
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)
-- Make sure to run each section in order
-- =====================================================

-- =====================================================
-- SECTION 1: ENABLE EXTENSIONS
-- =====================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SECTION 2: CREATE CUSTOM TYPES (ENUMS)
-- =====================================================

-- Content type enum
CREATE TYPE content_type AS ENUM ('text', 'code', 'image', 'document', 'mixed');

-- Review status enum
CREATE TYPE review_status AS ENUM ('learning', 'reviewing', 'mastered', 'archived');

-- Difficulty enum
CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');

-- Performance enum
CREATE TYPE performance AS ENUM ('again', 'hard', 'medium', 'easy');

-- =====================================================
-- SECTION 3: CREATE TABLES
-- =====================================================

-- Profiles Table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    notification_preferences JSONB DEFAULT '{
        "daily_reminder": true,
        "reminder_time": "09:00",
        "streak_reminder": true,
        "achievement_notifications": true,
        "ai_insights": true
    }'::jsonb,
    streak_count INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366F1',
    icon TEXT DEFAULT 'folder',
    order_index INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT unique_category_name_per_user UNIQUE (user_id, name)
);

-- Memory Items Table
CREATE TABLE memory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',
    attachments JSONB DEFAULT '[]'::jsonb,
    difficulty TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'learning',
    next_review_date DATE DEFAULT CURRENT_DATE,
    review_stage INTEGER DEFAULT 0,
    review_history JSONB DEFAULT '[]'::jsonb,
    ai_summary TEXT,
    ai_flowchart TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews Table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_item_id UUID NOT NULL REFERENCES memory_items(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    completed_date TIMESTAMPTZ,
    performance TEXT,
    time_spent_seconds INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Streak Entries Table
CREATE TABLE streak_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reviews_completed INTEGER DEFAULT 0,
    streak_broken BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One entry per user per day
    CONSTRAINT unique_streak_entry_per_day UNIQUE (user_id, date)
);

-- Achievements Table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ,
    progress INTEGER DEFAULT 0,
    max_progress INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One achievement of each type per user
    CONSTRAINT unique_achievement_per_user UNIQUE (user_id, name)
);

-- =====================================================
-- SECTION 4: CREATE INDEXES
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_username ON profiles(username);

-- Categories indexes
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_order ON categories(user_id, order_index);

-- Memory items indexes
CREATE INDEX idx_memory_items_user_id ON memory_items(user_id);
CREATE INDEX idx_memory_items_category_id ON memory_items(category_id);
CREATE INDEX idx_memory_items_status ON memory_items(user_id, status);
CREATE INDEX idx_memory_items_next_review ON memory_items(user_id, next_review_date);
CREATE INDEX idx_memory_items_search ON memory_items USING gin(to_tsvector('english', title || ' ' || content));

-- Reviews indexes
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_memory_item ON reviews(memory_item_id);
CREATE INDEX idx_reviews_scheduled ON reviews(user_id, scheduled_date);
CREATE INDEX idx_reviews_pending ON reviews(user_id, scheduled_date) WHERE completed_date IS NULL;

-- Streak entries indexes
CREATE INDEX idx_streak_entries_user_date ON streak_entries(user_id, date DESC);

-- Achievements indexes
CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_unlocked ON achievements(user_id) WHERE unlocked_at IS NOT NULL;

-- =====================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
    
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
    
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories policies
CREATE POLICY "Users can view own categories" ON categories
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own categories" ON categories
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own categories" ON categories
    FOR DELETE USING (auth.uid() = user_id);

-- Memory items policies
CREATE POLICY "Users can view own memory items" ON memory_items
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own memory items" ON memory_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own memory items" ON memory_items
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own memory items" ON memory_items
    FOR DELETE USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Users can view own reviews" ON reviews
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own reviews" ON reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Streak entries policies
CREATE POLICY "Users can view own streak entries" ON streak_entries
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own streak entries" ON streak_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own streak entries" ON streak_entries
    FOR UPDATE USING (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Users can view own achievements" ON achievements
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own achievements" ON achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own achievements" ON achievements
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- SECTION 6: FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for memory_items updated_at
CREATE TRIGGER update_memory_items_updated_at
    BEFORE UPDATE ON memory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, username, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Function to increment total reviews
CREATE OR REPLACE FUNCTION increment_total_reviews(p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET total_reviews = total_reviews + 1,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to update streak count
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    streak_count INTEGER := 0;
    check_date DATE := CURRENT_DATE;
    entry_exists BOOLEAN;
BEGIN
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM streak_entries
            WHERE user_id = p_user_id
            AND date = check_date
            AND reviews_completed > 0
        ) INTO entry_exists;
        
        IF entry_exists THEN
            streak_count := streak_count + 1;
            check_date := check_date - INTERVAL '1 day';
        ELSE
            -- Allow today to be incomplete (still building streak)
            IF check_date = CURRENT_DATE THEN
                check_date := check_date - INTERVAL '1 day';
            ELSE
                EXIT;
            END IF;
        END IF;
        
        -- Safety limit
        IF streak_count > 365 THEN
            EXIT;
        END IF;
    END LOOP;
    
    UPDATE profiles
    SET streak_count = update_streak.streak_count,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN streak_count;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to get calendar data
CREATE OR REPLACE FUNCTION get_calendar_data(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    date DATE,
    reviews_due BIGINT,
    reviews_completed BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS d
    ),
    items_due AS (
        SELECT next_review_date, COUNT(*) as cnt
        FROM memory_items
        WHERE user_id = p_user_id
        AND next_review_date BETWEEN p_start_date AND p_end_date
        AND status != 'archived'
        GROUP BY next_review_date
    ),
    reviews_done AS (
        SELECT scheduled_date, COUNT(*) as cnt
        FROM reviews
        WHERE user_id = p_user_id
        AND scheduled_date BETWEEN p_start_date AND p_end_date
        AND completed_date IS NOT NULL
        GROUP BY scheduled_date
    )
    SELECT 
        ds.d as date,
        COALESCE(i.cnt, 0) as reviews_due,
        COALESCE(r.cnt, 0) as reviews_completed
    FROM date_series ds
    LEFT JOIN items_due i ON ds.d = i.next_review_date
    LEFT JOIN reviews_done r ON ds.d = r.scheduled_date
    ORDER BY ds.d;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- =====================================================
-- SECTION 7: STORAGE BUCKETS (for attachments)
-- =====================================================

-- Create storage bucket for attachments (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('attachments', 'attachments', false);

-- Storage policies (uncomment and run separately)
-- CREATE POLICY "Users can upload own attachments"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view own attachments"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own attachments"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- END OF SCHEMA
-- =====================================================
